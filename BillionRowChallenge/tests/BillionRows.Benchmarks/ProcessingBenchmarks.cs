using System.Globalization;
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Columns;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Jobs;
using BenchmarkDotNet.Reports;
using BenchmarkDotNet.Running;
using BillionRows.Core;

namespace BillionRows.Benchmarks;

[MemoryDiagnoser]
[SimpleJob(RuntimeMoniker.Net10_0, launchCount: 1, warmupCount: 3, iterationCount: 5, id: "JIT", baseline: true)]
[SimpleJob(RuntimeMoniker.NativeAot10_0, launchCount: 1, warmupCount: 3, iterationCount: 5, id: "NativeAOT")]
[Config(typeof(ProcessingConfig))]
public class ProcessingBenchmarks
{
    private string directory = null!;
    private string path = null!;

    [Params(10_000, 100_000, 1_000_000)]
    public int RowCount { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        directory = Path.Combine(Path.GetTempPath(), "billion-rows-bench-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        path = Path.Combine(directory, "measurements.txt");
        MeasurementGenerator.Generate(path, RowCount);
    }

    [Benchmark]
    public ProcessingResult Baseline() => BaselineProcessor.Process(path);

    [Benchmark]
    public ProcessingResult Optimized() => OptimizedProcessor.Process(path);

    [GlobalCleanup]
    public void Cleanup() => Directory.Delete(directory, recursive: true);
}

public sealed class ProcessingConfig : ManualConfig
{
    public ProcessingConfig() => AddColumn(StatisticColumn.StdDev, new RowsPerSecondColumn());
}

public sealed class RowsPerSecondColumn : IColumn
{
    public string Id => nameof(RowsPerSecondColumn);
    public string ColumnName => "Rows/s";
    public string Legend => "Rows processed per second, derived from RowCount / mean operation time.";
    public bool AlwaysShow => true;
    public ColumnCategory Category => ColumnCategory.Custom;
    public int PriorityInCategory => 0;
    public bool IsNumeric => true;
    public UnitType UnitType => UnitType.Dimensionless;
    public bool IsDefault(Summary summary, BenchmarkCase benchmarkCase) => false;
    public bool IsAvailable(Summary summary) => true;
    public string GetValue(Summary summary, BenchmarkCase benchmarkCase) => GetValue(summary, benchmarkCase, summary.Style);
    public string GetValue(Summary summary, BenchmarkCase benchmarkCase, SummaryStyle style)
    {
        double? nanoseconds = summary[benchmarkCase]?.ResultStatistics?.Mean;
        int rows = (int)benchmarkCase.Parameters.Items.Single(p => p.Name == nameof(ProcessingBenchmarks.RowCount)).Value;
        return nanoseconds is > 0
            ? (rows * 1_000_000_000d / nanoseconds.Value).ToString("F0", CultureInfo.InvariantCulture)
            : "NA";
    }
}
