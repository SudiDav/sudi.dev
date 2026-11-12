using System.Diagnostics;
using System.Globalization;
using System.Text;

namespace BillionRows.Core;

public sealed record GenerationResult(long RowCount, long FileSizeBytes, TimeSpan Elapsed, double RowsPerSecond);

public static class MeasurementGenerator
{
    private static readonly string[] Stations =
    [
        "Kinshasa", "Lubumbashi", "Mbuji-Mayi", "Kisangani", "Kananga",
        "Goma", "Bukavu", "Matadi", "Kolwezi", "Kikwit", "Équateur", "Haut-Katanga"
    ];

    public static GenerationResult Generate(string path, long rowCount, int seed = 42)
    {
        ArgumentException.ThrowIfNullOrEmpty(path);
        ArgumentOutOfRangeException.ThrowIfNegative(rowCount);

        var stopwatch = Stopwatch.StartNew();
        var random = new Random(seed);
        var encoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false);
        using (var stream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None, 1 << 20, FileOptions.SequentialScan))
        using (var writer = new StreamWriter(stream, encoding, 1 << 16))
        {
            writer.NewLine = "\n";
            for (long row = 0; row < rowCount; row++)
            {
                var station = Stations[random.Next(Stations.Length)];
                var temperature = random.Next(-999, 1000);
                writer.Write(station);
                writer.Write(';');
                writer.Write((temperature / 10m).ToString("F1", CultureInfo.InvariantCulture));
                writer.Write('\n');
            }
        }

        stopwatch.Stop();
        var fileSizeBytes = new FileInfo(path).Length;
        var rowsPerSecond = stopwatch.Elapsed.TotalSeconds > 0 ? rowCount / stopwatch.Elapsed.TotalSeconds : 0;
        return new GenerationResult(rowCount, fileSizeBytes, stopwatch.Elapsed, rowsPerSecond);
    }
}
