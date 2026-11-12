using System.Globalization;
using System.Text;
using BillionRows.Core;

namespace BillionRows.Cli;

public static class CliApplication
{
    private const string Usage = "Usage:\n  generate <rows> <output-path> [seed=42]\n  process <input-path>\n  process-fast <input-path>\n  --help";

    public static int Run(string[] args, TextWriter output, TextWriter error)
    {
        if (args is ["--help"] or ["-h"])
        {
            output.WriteLine(Usage);
            return 0;
        }

        try
        {
            if (args.Length is 3 or 4 && args[0] == "generate")
            {
                if (!long.TryParse(args[1], NumberStyles.None, CultureInfo.InvariantCulture, out long rows)
                    || string.IsNullOrWhiteSpace(args[2]))
                    return Invalid(error, "Rows must be a nonnegative integer and the output path must be nonempty.");
                int seed = 42;
                if (args.Length == 4 && !int.TryParse(args[3], NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out seed))
                    return Invalid(error, "Seed must be a signed 32-bit integer.");

                // Conservative upper bound for this generator's fixed station set.
                long estimatedBytes;
                try { estimatedBytes = checked(rows * 32); }
                catch (OverflowException) { return Invalid(error, "Row count exceeds the supported storage estimate."); }
                string fullPath = Path.GetFullPath(args[2]);
                var drive = new DriveInfo(Path.GetPathRoot(fullPath)!);
                if (estimatedBytes > drive.AvailableFreeSpace - 1_073_741_824L)
                    throw new IOException($"Insufficient free disk space: estimated {estimatedBytes} bytes plus 1 GiB reserve required.");

                var result = MeasurementGenerator.Generate(fullPath, rows, seed);
                error.WriteLine(FormattableString.Invariant($"generate rows={result.RowCount} bytes={result.FileSizeBytes} seconds={result.Elapsed.TotalSeconds:F6} rows_per_second={result.RowsPerSecond:F0} seed={seed}"));
                return 0;
            }

            if (args is ["process" or "process-fast", var path] && !string.IsNullOrWhiteSpace(path))
            {
                long before = GC.GetTotalAllocatedBytes(precise: true);
                var result = args[0] == "process-fast"
                    ? OptimizedProcessor.Process(path)
                    : BaselineProcessor.Process(path);
                long allocated = GC.GetTotalAllocatedBytes(precise: true) - before;
                output.Write('{');
                bool first = true;
                foreach (var (station, stats) in result.Stations.OrderBy(pair => pair.Key, StringComparer.Ordinal))
                {
                    if (!first) output.Write(", ");
                    output.Write($"{station}={stats}");
                    first = false;
                }
                output.WriteLine('}');
                error.WriteLine(FormattableString.Invariant($"process rows={result.RowCount} stations={result.Stations.Count} seconds={result.Elapsed.TotalSeconds:F6} rows_per_second={result.RowsPerSecond:F0} allocated_bytes={allocated}"));
                return 0;
            }

            return Invalid(error, "Unknown command or invalid number of arguments.");
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or FormatException or OverflowException or DecoderFallbackException)
        {
            error.WriteLine($"Error: {ex.Message}");
            return 1;
        }
        catch (ArgumentException ex)
        {
            return Invalid(error, ex.Message);
        }
    }

    private static int Invalid(TextWriter error, string message)
    {
        error.WriteLine($"Error: {message}");
        error.WriteLine(Usage);
        return 2;
    }
}
