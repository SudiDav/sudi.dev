using System.Globalization;
using System.Text;
using BillionRows.Core;

namespace BillionRows.Tests;

public sealed class AggregationTests
{
    [Fact]
    public void Process_aggregates_extrema_mean_duplicate_names_and_case_sensitively()
    {
        using var files = new TestFiles();
        var path = files.PathFor("measurements.txt");
        File.WriteAllText(path, "Kinshasa;-1.0\nKinshasa;0.0\nKinshasa;1.0\nkinshasa;2.0\nÉquateur;-0.1\n", new UTF8Encoding(false));

        var result = BaselineProcessor.Process(path);

        Assert.Equal(5, result.RowCount);
        Assert.Equal(3, result.Stations["Kinshasa"].Count);
        Assert.Equal(-10, result.Stations["Kinshasa"].MinTenths);
        Assert.Equal(10, result.Stations["Kinshasa"].MaxTenths);
        Assert.Equal(0m, result.Stations["Kinshasa"].Mean);
        Assert.Equal(1, result.Stations["kinshasa"].Count);
        Assert.Equal(-1, result.Stations["Équateur"].MinTenths);
        Assert.Equal(new[] { "Kinshasa", "kinshasa", "Équateur" }, result.Stations.Keys.OrderBy(key => key, StringComparer.Ordinal));
    }

    [Fact]
    public void StationStats_mean_and_display_use_midpoint_away_from_zero_and_invariant_culture()
    {
        var previousCulture = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("fr-FR");
            var positive = new StationStats(0, 1, 1, 2);
            var negative = new StationStats(-1, 0, -1, 2);

            Assert.Equal(0.05m, positive.Mean);
            Assert.Equal("0.0/0.1/0.1", positive.ToString());
            Assert.Equal("-0.1/-0.1/0.0", negative.ToString());
        }
        finally
        {
            CultureInfo.CurrentCulture = previousCulture;
        }
    }

    [Fact]
    public void StationStats_Add_checks_overflow_before_mutating_any_field()
    {
        var stats = new StationStats(-999, 999, long.MaxValue - 100, long.MaxValue / 2);
        var before = (stats.MinTenths, stats.MaxTenths, stats.SumTenths, stats.Count);

        Assert.Throws<OverflowException>(() => stats.Add(101));

        Assert.Equal(before, (stats.MinTenths, stats.MaxTenths, stats.SumTenths, stats.Count));
    }

    [Fact]
    public void Process_supports_counts_beyond_int_range()
    {
        var stats = new StationStats(0, 0, 0, (long)int.MaxValue + 1);
        stats.Add(0);

        Assert.Equal((long)int.MaxValue + 2, stats.Count);
    }

    [Fact]
    public void StationStats_Add_rejects_count_overflow()
    {
        using var files = new TestFiles();
        var stats = new StationStats(0, 0, 0, long.MaxValue);

        Assert.Throws<OverflowException>(() => stats.Add(0));
    }
    [Theory]
    [InlineData("", 0, 0)]
    [InlineData("A;1.0", 1, 1)]
    [InlineData("A;1.0\r\nA;2.0\r\n", 2, 1)]
    public void Process_handles_empty_singleton_and_crlf(string content, long rows, int stations)
    {
        using var files = new TestFiles();
        string path = files.PathFor("input.txt");
        File.WriteAllText(path, content);
        var result = BaselineProcessor.Process(path);
        Assert.Equal(rows, result.RowCount);
        Assert.Equal(stations, result.Stations.Count);
        if (rows == 1) Assert.Equal("1.0/1.0/1.0", result.Stations["A"].ToString());
    }

    [Theory]
    [InlineData(0, 1, 0, 0)]
    [InlineData(2, 1, 1, 1)]
    [InlineData(0, 1, 3, 1)]
    public void StationStats_rejects_inconsistent_state(int min, int max, long sum, long count)
    {
        Assert.ThrowsAny<ArgumentException>(() => new StationStats(min, max, sum, count));
    }

    [Fact]
    public void StationStats_preserves_sum_beyond_int_range()
    {
        var stats = new StationStats(999, 999, 2_997_000_000, 3_000_000);
        stats.Add(999);
        Assert.Equal(2_997_000_999, stats.SumTenths);
        Assert.Equal(99.9m, stats.Mean);
    }
}
