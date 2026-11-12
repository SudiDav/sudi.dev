using System.Globalization;

namespace BillionRows.Core;

public sealed class StationStats
{
    public int MinTenths { get; private set; }
    public int MaxTenths { get; private set; }
    public long SumTenths { get; private set; }
    public long Count { get; private set; }
    public decimal Mean => (decimal)SumTenths / Count / 10m;

    public StationStats(int minTenths, int maxTenths, long sumTenths, long count)
    {
        if (count <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(count), "An aggregate must contain at least one row.");
        }

        if (minTenths > maxTenths)
        {
            throw new ArgumentException("The minimum temperature cannot exceed the maximum.", nameof(minTenths));
        }

        var meanTenths = (decimal)sumTenths / count;
        if (meanTenths < minTenths || meanTenths > maxTenths)
        {
            throw new ArgumentException("The sum is inconsistent with the aggregate extrema.", nameof(sumTenths));
        }

        MinTenths = minTenths;
        MaxTenths = maxTenths;
        SumTenths = sumTenths;
        Count = count;
    }

    public void Add(int temperatureTenths)
    {
        var nextSum = checked(SumTenths + temperatureTenths);
        var nextCount = checked(Count + 1);

        SumTenths = nextSum;
        Count = nextCount;
        if (temperatureTenths < MinTenths)
        {
            MinTenths = temperatureTenths;
        }

        if (temperatureTenths > MaxTenths)
        {
            MaxTenths = temperatureTenths;
        }
    }

    public override string ToString()
    {
        var min = MinTenths / 10m;
        var mean = decimal.Round(Mean, 1, MidpointRounding.AwayFromZero);
        var max = MaxTenths / 10m;
        return string.Create(CultureInfo.InvariantCulture, $"{min:F1}/{mean:F1}/{max:F1}");
    }
}
