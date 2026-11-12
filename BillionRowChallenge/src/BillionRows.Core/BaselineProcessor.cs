using System.Diagnostics;
using System.Globalization;
using System.Text;

namespace BillionRows.Core;

public sealed record ProcessingResult(IReadOnlyDictionary<string, StationStats> Stations, long RowCount, TimeSpan Elapsed, double RowsPerSecond);

public static class BaselineProcessor
{
    private static readonly UTF8Encoding StrictUtf8 = new(encoderShouldEmitUTF8Identifier: true, throwOnInvalidBytes: true);

    public static ProcessingResult Process(string path)
    {
        ArgumentException.ThrowIfNullOrEmpty(path);
        var stopwatch = Stopwatch.StartNew();
        RejectOtherByteOrderMarks(path);
        var stations = new Dictionary<string, StationStats>(StringComparer.Ordinal);
        long rowCount = 0;
        long lineNumber = 0;

        try
        {
            foreach (var line in File.ReadLines(path, StrictUtf8))
            {
                lineNumber = checked(lineNumber + 1);
                var (station, temperatureTenths) = ParseLine(line, lineNumber);
                var nextRowCount = checked(rowCount + 1);

                if (stations.TryGetValue(station, out var stats))
                {
                    stats.Add(temperatureTenths);
                }
                else
                {
                    stations.Add(station, new StationStats(temperatureTenths, temperatureTenths, temperatureTenths, 1));
                }

                rowCount = nextRowCount;
            }
        }
        catch (DecoderFallbackException exception)
        {
            throw new FormatException($"Invalid UTF-8 on line {FindInvalidUtf8Line(path)}.", exception);
        }

        stopwatch.Stop();
        var rowsPerSecond = stopwatch.Elapsed.TotalSeconds > 0 ? rowCount / stopwatch.Elapsed.TotalSeconds : 0;
        return new ProcessingResult(stations, rowCount, stopwatch.Elapsed, rowsPerSecond);
    }

    public static (string Station, int TemperatureTenths) ParseLine(string line, long lineNumber = 1)
    {
        ArgumentNullException.ThrowIfNull(line);
        var delimiter = line.IndexOf(';');
        if (delimiter <= 0 || delimiter != line.LastIndexOf(';'))
        {
            throw InvalidLine(lineNumber, "expected exactly one semicolon and a nonempty station name");
        }

        var station = line[..delimiter];
        int stationByteCount;
        try
        {
            stationByteCount = StrictUtf8.GetByteCount(station);
        }
        catch (EncoderFallbackException exception)
        {
            throw InvalidLine(lineNumber, "station name is not valid Unicode", exception);
        }

        if (stationByteCount > 100 || station.Any(char.IsControl))
        {
            throw InvalidLine(lineNumber, "station name exceeds 100 UTF-8 bytes or contains a control character");
        }

        var temperatureText = line[(delimiter + 1)..];
        if (!HasAsciiTemperatureSyntax(temperatureText))
        {
            throw InvalidLine(lineNumber, "temperature must use ASCII digits and exactly one fractional digit");
        }

        decimal temperature;
        try
        {
            temperature = decimal.Parse(temperatureText, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture);
        }
        catch (FormatException exception)
        {
            throw InvalidLine(lineNumber, "invalid temperature", exception);
        }
        catch (OverflowException exception)
        {
            throw InvalidLine(lineNumber, "temperature is out of range", exception);
        }

        if (temperature is < -99.9m or > 99.9m)
        {
            throw InvalidLine(lineNumber, "temperature is outside -99.9 through 99.9");
        }

        return (station, decimal.ToInt32(temperature * 10m));
    }

    private static void RejectOtherByteOrderMarks(string path)
    {
        // ReadLines auto-detects UTF-16/32. This format accepts UTF-8 only.
        using var stream = File.OpenRead(path);
        var prefix = new byte[4];
        int length = stream.Read(prefix, 0, prefix.Length);
        if (length >= 2 && ((prefix[0] == 0xFF && prefix[1] == 0xFE)
            || (prefix[0] == 0xFE && prefix[1] == 0xFF))
            || length >= 4 && prefix[0] == 0 && prefix[1] == 0 && prefix[2] == 0xFE && prefix[3] == 0xFF)
        {
            throw InvalidLine(1, "expected UTF-8, found a UTF-16/32 byte order mark");
        }
    }

    private static long FindInvalidUtf8Line(string path)
    {
        // Only on failure: buffered decoding can fail before yielding prior valid
        // lines. Re-scan with a strict incremental decoder for the physical line.
        using var stream = File.OpenRead(path);
        var decoder = StrictUtf8.GetDecoder();
        var input = new byte[1];
        var output = new char[2];
        long line = 1;
        bool previousCarriageReturn = false;
        try
        {
            int value;
            while ((value = stream.ReadByte()) >= 0)
            {
                input[0] = (byte)value;
                decoder.GetChars(input, 0, 1, output, 0, flush: false);
                if (value == '\r' || value == '\n' && !previousCarriageReturn)
                    line = checked(line + 1);
                previousCarriageReturn = value == '\r';
            }
            decoder.GetChars(input, 0, 0, output, 0, flush: true);
        }
        catch (DecoderFallbackException)
        {
            return line;
        }
        return line; // Input files must remain unchanged during processing.
    }

    private static bool HasAsciiTemperatureSyntax(string text)
    {
        var start = text.StartsWith("-", StringComparison.Ordinal) ? 1 : 0;
        var point = text.IndexOf('.');
        if (point <= start || point != text.LastIndexOf('.') || point != text.Length - 2)
        {
            return false;
        }

        for (var index = start; index < text.Length; index++)
        {
            if (index == point)
            {
                continue;
            }

            if (text[index] is < '0' or > '9')
            {
                return false;
            }
        }

        return true;
    }

    private static FormatException InvalidLine(long lineNumber, string reason, Exception? inner = null) =>
        new($"Invalid record on line {lineNumber}: {reason}.", inner);
}
