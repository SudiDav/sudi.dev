using System.Text;
using BillionRows.Core;

namespace BillionRows.Tests;

public sealed class OptimizedProcessorTests
{
    [Fact]
    public void Process_matches_baseline_aggregates_and_ordinal_station_identity()
    {
        using var files = new TestFiles();
        var path = files.PathFor("measurements.txt");
        File.WriteAllText(path, "Kinshasa;-1.0\nKinshasa;0.0\nKinshasa;1.0\nkinshasa;2.0\nÉquateur;-0.1\nÉquateur;0.0\n", new UTF8Encoding(false));

        var expected = BaselineProcessor.Process(path);
        var actual = OptimizedProcessor.Process(path);

        Assert.Equal(expected.RowCount, actual.RowCount);
        Assert.Equal(expected.Stations.Keys.OrderBy(key => key, StringComparer.Ordinal), actual.Stations.Keys.OrderBy(key => key, StringComparer.Ordinal));
        foreach (var (name, stats) in expected.Stations)
        {
            var result = actual.Stations[name];
            Assert.Equal(stats.MinTenths, result.MinTenths);
            Assert.Equal(stats.MaxTenths, result.MaxTenths);
            Assert.Equal(stats.SumTenths, result.SumTenths);
            Assert.Equal(stats.Count, result.Count);
            Assert.Equal(stats.ToString(), result.ToString());
        }
    }

    [Theory]
    [InlineData("Plus;0.1\nPlus;0.0\n", "0.0/0.1/0.1")]
    [InlineData("Minus;-0.1\nMinus;0.0\n", "-0.1/-0.1/0.0")]
    public void Process_preserves_midpoint_rounding(string content, string expected)
    {
        using var files = new TestFiles();
        var path = files.PathFor("rounding.txt");
        File.WriteAllText(path, content, new UTF8Encoding(false));

        Assert.Equal(expected, OptimizedProcessor.Process(path).Stations.Values.Single().ToString());
    }

    [Fact]
    public void Process_handles_bom_utf8_and_mixed_cr_lf_records_across_reader_buffers()
    {
        using var files = new TestFiles();
        var path = files.PathFor("mixed-lines.txt");
        var content = "\uFEFFÉquateur;1.0\rA;2.0\nB;-3.0\r\nÉquateur;3.0";
        File.WriteAllText(path, content, new UTF8Encoding(false));

        var result = OptimizedProcessor.Process(path);

        Assert.Equal(4, result.RowCount);
        Assert.Equal("Équateur", Assert.Single(result.Stations.Keys, name => name.StartsWith('É')));
        Assert.Equal(2, result.Stations["Équateur"].Count);
        Assert.Equal(20, result.Stations["A"].MinTenths);
        Assert.Equal(-30, result.Stations["B"].MinTenths);
    }

    [Theory]
    [InlineData("")]
    [InlineData("\uFEFF")]
    public void Process_accepts_empty_file_and_utf8_bom_only(string content)
    {
        using var files = new TestFiles();
        var path = files.PathFor("empty.txt");
        File.WriteAllText(path, content, new UTF8Encoding(false));

        var result = OptimizedProcessor.Process(path);

        Assert.Equal(0, result.RowCount);
        Assert.Empty(result.Stations);
    }

    [Fact]
    public void Process_accepts_arbitrarily_many_leading_zeroes_without_changing_value()
    {
        using var files = new TestFiles();
        var path = files.PathFor("long-temperature.txt");
        File.WriteAllText(path, $"A;{new string('0', 200_000)}9.9", new UTF8Encoding(false));

        var result = OptimizedProcessor.Process(path);

        Assert.Equal(1, result.RowCount);
        Assert.Equal(99, result.Stations["A"].MaxTenths);
    }

    [Theory]
    [InlineData(";1.0\n", 1)]
    [InlineData("A;1.00\n", 1)]
    [InlineData("A;100.0\n", 1)]
    [InlineData("A;+1.0\n", 1)]
    [InlineData("A;1.0;B\n", 1)]
    [InlineData("A;1.0\nB;1.0;2.0\n", 2)]
    [InlineData("A\u0001;1.0\n", 1)]
    public void Process_rejects_invalid_records_with_baseline_line_diagnostic(string content, int lineNumber)
    {
        using var files = new TestFiles();
        var path = files.PathFor("invalid.txt");
        File.WriteAllText(path, content, new UTF8Encoding(false));

        var expected = Assert.Throws<FormatException>(() => BaselineProcessor.Process(path));
        var actual = Assert.Throws<FormatException>(() => OptimizedProcessor.Process(path));

        Assert.Equal(expected.Message, actual.Message);
        Assert.Contains($"line {lineNumber}", actual.Message);
    }

    [Fact]
    public void Process_rejects_overlong_station_using_utf8_byte_length()
    {
        using var files = new TestFiles();
        var path = files.PathFor("long-station.txt");
        File.WriteAllText(path, $"{new string('é', 51)};1.0", new UTF8Encoding(false));

        Assert.Throws<FormatException>(() => OptimizedProcessor.Process(path));
    }

    [Fact]
    public void Process_reports_physical_line_for_invalid_or_truncated_utf8_and_releases_file()
    {
        using var files = new TestFiles();
        var path = files.PathFor("invalid-utf8.txt");
        File.WriteAllBytes(path, [.. Encoding.UTF8.GetBytes("A;1.0\rB;-1.0\n"), 0xC3]);

        var error = Assert.Throws<FormatException>(() => OptimizedProcessor.Process(path));

        Assert.Contains("line 3", error.Message);
        using var reopened = new FileStream(path, FileMode.Open, FileAccess.ReadWrite, FileShare.None);
    }

    [Fact]
    public void Process_keeps_reader_boundary_records_intact()
    {
        using var files = new TestFiles();
        var path = files.PathFor("boundary.txt");
        var station = new string('x', 99);
        var content = string.Concat(Enumerable.Repeat("A;1.0\n", 682)) + $"{station};1.0\r\n{station};2.0\r{station};3.0\n";
        File.WriteAllText(path, content, new UTF8Encoding(false));

        var result = OptimizedProcessor.Process(path);

        Assert.Equal(685, result.RowCount);
        Assert.Equal(3, result.Stations[station].Count);
        Assert.Equal(60, result.Stations[station].SumTenths);
    }
}
