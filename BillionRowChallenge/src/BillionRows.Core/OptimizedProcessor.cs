using System.Buffers;
using System.Diagnostics;
using System.Text;

namespace BillionRows.Core;

public static class OptimizedProcessor
{
    private const int InitialBufferSize = 4096;
    private static readonly UTF8Encoding StrictUtf8 = new(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true);

    public static ProcessingResult Process(string path)
    {
        ArgumentException.ThrowIfNullOrEmpty(path);

        var stopwatch = Stopwatch.StartNew();
        var stations = new Dictionary<string, StationStats>(StringComparer.Ordinal);
        long rowCount = 0;
        long lineNumber = 0;
        var buffer = ArrayPool<char>.Shared.Rent(InitialBufferSize);

        try
        {
            using var stream = File.OpenRead(path);
            RejectOtherByteOrderMarks(stream);
            stream.Position = 0;
            using var reader = new StreamReader(stream, StrictUtf8, detectEncodingFromByteOrderMarks: false, bufferSize: InitialBufferSize);

            var available = 0;
            var skipLineFeed = false;
            var firstRecord = true;
            while (true)
            {
                if (available == buffer.Length)
                {
                    var nextSize = checked(buffer.Length * 2);
                    var nextBuffer = ArrayPool<char>.Shared.Rent(nextSize);
                    buffer.AsSpan(0, available).CopyTo(nextBuffer);
                    ArrayPool<char>.Shared.Return(buffer);
                    buffer = nextBuffer;
                }

                var read = reader.Read(buffer.AsSpan(available));
                if (read == 0)
                {
                    if (available > 0 && !(firstRecord && available == 1 && buffer[0] == '\uFEFF'))
                    {
                        ProcessRecord(buffer.AsSpan(0, available), ref firstRecord, ref lineNumber, ref rowCount, stations);
                    }

                    break;
                }

                var end = available + read;
                var recordStart = 0;
                if (skipLineFeed)
                {
                    skipLineFeed = false;
                    if (end > 0 && buffer[0] == '\n')
                    {
                        recordStart = 1;
                    }
                }

                var cursor = recordStart;
                while (cursor < end)
                {
                    var relative = buffer.AsSpan(cursor, end - cursor).IndexOfAny('\r', '\n');
                    if (relative < 0)
                    {
                        break;
                    }

                    var delimiter = cursor + relative;
                    ProcessRecord(buffer.AsSpan(recordStart, delimiter - recordStart), ref firstRecord, ref lineNumber, ref rowCount, stations);

                    var wasCarriageReturn = buffer[delimiter] == '\r';
                    cursor = delimiter + 1;
                    if (wasCarriageReturn)
                    {
                        if (cursor < end && buffer[cursor] == '\n')
                        {
                            cursor++;
                        }
                        else if (cursor == end)
                        {
                            skipLineFeed = true;
                        }
                    }

                    recordStart = cursor;
                }

                available = end - recordStart;
                if (available > 0 && recordStart > 0)
                {
                    buffer.AsSpan(recordStart, available).CopyTo(buffer);
                }
            }
        }
        catch (DecoderFallbackException)
        {
            // StreamReader may decode ahead of the offending row. The baseline's
            // failure-only rescan reports the exact physical line number.
            BaselineProcessor.Process(path);
            throw;
        }
        finally
        {
            ArrayPool<char>.Shared.Return(buffer);
        }

        stopwatch.Stop();
        var rowsPerSecond = stopwatch.Elapsed.TotalSeconds > 0 ? rowCount / stopwatch.Elapsed.TotalSeconds : 0;
        return new ProcessingResult(stations, rowCount, stopwatch.Elapsed, rowsPerSecond);
    }

    private static void ProcessRecord(
        ReadOnlySpan<char> record,
        ref bool firstRecord,
        ref long lineNumber,
        ref long rowCount,
        Dictionary<string, StationStats> stations)
    {
        if (firstRecord && !record.IsEmpty && record[0] == '\uFEFF')
        {
            record = record[1..];
        }

        firstRecord = false;
        lineNumber = checked(lineNumber + 1);

        string? fallbackStation = null;
        int temperatureTenths;
        if (!TryParseRecord(record, out var station, out temperatureTenths))
        {
            // Invalid records take the baseline parser's exact diagnostic path.
            // If it accepts an input the fast validator did not, use its parsed
            // result so this path cannot reject valid records on a validator bug.
            var parsed = BaselineProcessor.ParseLine(record.ToString(), lineNumber);
            fallbackStation = parsed.Station;
            temperatureTenths = parsed.TemperatureTenths;
            station = fallbackStation.AsSpan();
        }

        var nextRowCount = checked(rowCount + 1);
        var lookup = stations.GetAlternateLookup<ReadOnlySpan<char>>();
        if (lookup.TryGetValue(station, out var stats))
        {
            stats.Add(temperatureTenths);
        }
        else
        {
            var stationName = fallbackStation ?? station.ToString();
            stations.Add(stationName, new StationStats(temperatureTenths, temperatureTenths, temperatureTenths, 1));
        }

        rowCount = nextRowCount;
    }

    private static bool TryParseRecord(ReadOnlySpan<char> record, out ReadOnlySpan<char> station, out int temperatureTenths)
    {
        station = default;
        temperatureTenths = 0;

        var delimiter = record.IndexOf(';');
        if (delimiter <= 0 || delimiter != record.LastIndexOf(';'))
        {
            return false;
        }

        station = record[..delimiter];
        if (StrictUtf8.GetByteCount(station) > 100)
        {
            return false;
        }

        foreach (var character in station)
        {
            if (char.IsControl(character))
            {
                return false;
            }
        }

        var text = record[(delimiter + 1)..];
        var start = text.Length > 0 && text[0] == '-' ? 1 : 0;
        var point = text.IndexOf('.');
        if (point <= start || point != text.LastIndexOf('.') || point != text.Length - 2)
        {
            return false;
        }

        var integerPart = 0;
        var outOfRange = false;
        for (var index = start; index < point; index++)
        {
            var digit = text[index] - '0';
            if ((uint)digit > 9)
            {
                return false;
            }

            if (!outOfRange)
            {
                if (integerPart > 9 || integerPart == 9 && digit > 9)
                {
                    outOfRange = true;
                }
                else
                {
                    integerPart = integerPart * 10 + digit;
                    if (integerPart > 99)
                    {
                        outOfRange = true;
                    }
                }
            }
        }

        var fraction = text[^1] - '0';
        if ((uint)fraction > 9 || outOfRange)
        {
            return false;
        }

        var magnitude = integerPart * 10 + fraction;
        temperatureTenths = start == 1 ? -magnitude : magnitude;
        return true;
    }

    private static void RejectOtherByteOrderMarks(Stream stream)
    {
        Span<byte> prefix = stackalloc byte[4];
        var length = stream.Read(prefix);
        if ((length >= 2 && (prefix[0] == 0xFF && prefix[1] == 0xFE || prefix[0] == 0xFE && prefix[1] == 0xFF))
            || (length >= 4 && prefix[0] == 0 && prefix[1] == 0 && prefix[2] == 0xFE && prefix[3] == 0xFF))
        {
            throw new FormatException("Invalid record on line 1: expected UTF-8, found a UTF-16/32 byte order mark.");
        }
    }
}
