using System.Globalization;
using BillionRows.Cli;

namespace BillionRows.Tests;

public sealed class CliTests : IDisposable
{
    private readonly string directory = Path.Combine(Path.GetTempPath(), "brc-cli-" + Guid.NewGuid().ToString("N"));
    public CliTests() => Directory.CreateDirectory(directory);
    public void Dispose() => Directory.Delete(directory, true);
    private (int Exit, string Output, string Error) Run(params string[] args)
    {
        using var output = new StringWriter(CultureInfo.InvariantCulture);
        using var error = new StringWriter(CultureInfo.InvariantCulture);
        return (CliApplication.Run(args, output, error), output.ToString(), error.ToString());
    }

    public static IEnumerable<object[]> InvalidArguments => new[]
    {
        Array.Empty<string>(), new[] { "unknown" }, new[] { "process" },
        new[] { "process", "a", "extra" }, new[] { "generate", "-1", "a" },
        new[] { "generate", "1.0", "a" }, new[] { "generate", "1", "a", "not-a-seed" },
        new[] { "generate", "9223372036854775808", "a" }
    }.Select(args => new object[] { args });

    [Theory]
    [MemberData(nameof(InvalidArguments))]
    public void InvalidArgumentsReturnUsageWithoutOutput(string[] args)
    {
        var result = Run(args);
        Assert.Equal(2, result.Exit);
        Assert.Empty(result.Output);
        Assert.Contains("Usage:", result.Error);
    }

    [Fact]
    public void HelpSucceeds() => Assert.Equal(0, Run("--help").Exit);

    [Fact]
    public void GenerateAndProcessRoundTripReportsRowsSeparately()
    {
        string path = Path.Combine(directory, "sample.txt");
        var generation = Run("generate", "100", path, "42");
        Assert.Equal(0, generation.Exit);
        Assert.Empty(generation.Output);
        Assert.Contains("rows=100", generation.Error);
        var processing = Run("process", path);
        Assert.Equal(0, processing.Exit);
        Assert.StartsWith("{", processing.Output);
        Assert.DoesNotContain("rows=", processing.Output);
        Assert.Contains("rows=100", processing.Error);
        Assert.Contains("allocated_bytes=", processing.Error);
    }

    [Fact]
    public void ProcessingSortsAndRoundsInvariantly()
    {
        string path = Path.Combine(directory, "sample.txt");
        File.WriteAllText(path, "z;1.0\na;-0.1\na;0.0\nZ;2.0\n");
        var result = Run("process", path);
        Assert.Equal(0, result.Exit);
        Assert.Equal("{Z=2.0/2.0/2.0, a=-0.1/-0.1/0.0, z=1.0/1.0/1.0}" + Environment.NewLine, result.Output);
        Assert.Contains("stations=3", result.Error);
    }

    [Fact]
    public void MalformedFileReturnsFailureWithoutPartialOutput()
    {
        string path = Path.Combine(directory, "bad.txt");
        File.WriteAllText(path, "valid;1.0\ninvalid\n");
        var result = Run("process", path);
        Assert.Equal(1, result.Exit);
        Assert.Empty(result.Output);
        Assert.Contains("2", result.Error);
    }

    [Fact]
    public void MissingFileReturnsUsefulFailure()
    {
        var result = Run("process", Path.Combine(directory, "missing"));
        Assert.Equal(1, result.Exit);
        Assert.Empty(result.Output);
        Assert.Contains("Error:", result.Error);
    }

    [Fact]
    public void GenerationDoesNotOverwriteExistingFile()
    {
        string path = Path.Combine(directory, "existing");
        File.WriteAllText(path, "keep me");
        Assert.Equal(1, Run("generate", "1", path).Exit);
        Assert.Equal("keep me", File.ReadAllText(path));
    }
    [Fact]
    public void FastProcessingMatchesBaselineAndKeepsMetricsSeparate()
    {
        string path = Path.Combine(directory, "fast.txt");
        File.WriteAllText(path, "z;1.0\na;-0.1\na;0.0\nZ;2.0\n");
        var baseline = Run("process", path);
        var fast = Run("process-fast", path);
        Assert.Equal(0, fast.Exit);
        Assert.Equal(baseline.Output, fast.Output);
        Assert.Contains("rows=4", fast.Error);
        Assert.DoesNotContain("rows=", fast.Output);
    }

    [Fact]
    public void FastProcessingRejectsMalformedFileWithoutPartialOutput()
    {
        string path = Path.Combine(directory, "fast-bad.txt");
        File.WriteAllText(path, "valid;1.0\ninvalid\n");
        var fast = Run("process-fast", path);
        Assert.Equal(1, fast.Exit);
        Assert.Empty(fast.Output);
    }
}
