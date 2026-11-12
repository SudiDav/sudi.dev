using System.Globalization;
using BillionRows.Core;

namespace BillionRows.Tests;

public sealed class GeneratorTests
{
    [Fact]
    public void Generate_writes_exact_requested_rows_and_no_bom()
    {
        using var files = new TestFiles();
        var path = files.PathFor("measurements.txt");

        var result = MeasurementGenerator.Generate(path, 25, seed: 7);

        var bytes = File.ReadAllBytes(path);
        Assert.Equal(25, result.RowCount);
        Assert.Equal(bytes.Length, result.FileSizeBytes);
        Assert.False(bytes.AsSpan().StartsWith(new byte[] { 0xEF, 0xBB, 0xBF }));
        Assert.Equal(25, File.ReadAllLines(path).Length);
        Assert.DoesNotContain((byte)13, bytes);
        Assert.Equal(25, bytes.Count(b => b == 10));
        Assert.All(File.ReadAllLines(path), row => Assert.Contains(';', row));
        Assert.All(File.ReadAllLines(path), row => Assert.Matches("^-?\\d+\\.\\d$", row[(row.LastIndexOf(';') + 1)..]));
    }

    [Fact]
    public void Generate_is_byte_deterministic_for_same_seed_across_cultures()
    {
        using var files = new TestFiles();
        var previousCulture = CultureInfo.CurrentCulture;
        var previousUiCulture = CultureInfo.CurrentUICulture;
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("fr-FR");
            CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo("fr-FR");
            var first = files.PathFor("first.txt");
            MeasurementGenerator.Generate(first, 500, seed: 1729);

            CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("en-US");
            CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo("en-US");
            var second = files.PathFor("second.txt");
            MeasurementGenerator.Generate(second, 500, seed: 1729);

            Assert.Equal(File.ReadAllBytes(first), File.ReadAllBytes(second));
        }
        finally
        {
            CultureInfo.CurrentCulture = previousCulture;
            CultureInfo.CurrentUICulture = previousUiCulture;
        }
    }

    [Fact]
    public void Generate_zero_rows_creates_empty_file()
    {
        using var files = new TestFiles();
        var path = files.PathFor("empty.txt");

        var result = MeasurementGenerator.Generate(path, 0);

        Assert.Equal(0, result.RowCount);
        Assert.Empty(File.ReadAllBytes(path));
    }

    [Fact]
    public void Generate_refuses_to_overwrite_existing_file()
    {
        using var files = new TestFiles();
        var path = files.PathFor("existing.txt");
        File.WriteAllText(path, "keep this");

        Assert.Throws<IOException>(() => MeasurementGenerator.Generate(path, 1));
        Assert.Equal("keep this", File.ReadAllText(path));
    }
    [Fact]
    public void Generate_rejects_negative_rows_before_creating_file()
    {
        using var files = new TestFiles();
        string path = files.PathFor("negative.txt");
        Assert.Throws<ArgumentOutOfRangeException>(() => MeasurementGenerator.Generate(path, -1));
        Assert.False(File.Exists(path));
    }
}
