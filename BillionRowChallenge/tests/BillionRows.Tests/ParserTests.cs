using System.Text;
using BillionRows.Core;

namespace BillionRows.Tests;

public sealed class ParserTests
{
    [Theory]
    [InlineData("Kinshasa;12.3", "Kinshasa", 123)]
    [InlineData("Mbuji-Mayi;-99.9", "Mbuji-Mayi", -999)]
    [InlineData("Équateur;0.0", "Équateur", 0)]
    public void ParseLine_accepts_valid_records(string line, string station, int tenths)
    {
        var parsed = BaselineProcessor.ParseLine(line, 7);

        Assert.Equal(station, parsed.Station);
        Assert.Equal(tenths, parsed.TemperatureTenths);
    }

    [Theory]
    [InlineData(";1.0")]
    [InlineData("A;1.0;extra")]
    [InlineData("A")]
    [InlineData("A;")]
    [InlineData("A; 1.0")]
    [InlineData("A;+1.0")]
    [InlineData("A;1")]
    [InlineData("A;1.00")]
    [InlineData("A;1,0")]
    [InlineData("A;1e0")]
    [InlineData("A;100.0")]
    [InlineData("A;-100.0")]
    [InlineData("A;--1.0")]
    [InlineData("A;١.٠")]
    [InlineData("A\nB;1.0")]
    [InlineData("A\u0001;1.0")]
    public void ParseLine_rejects_malformed_records_with_line_number(string line)
    {
        var exception = Assert.Throws<FormatException>(() => BaselineProcessor.ParseLine(line, 19));

        Assert.Contains("19", exception.Message);
    }

    [Fact]
    public void ParseLine_rejects_station_names_over_100_utf8_bytes()
    {
        var line = new string('é', 51) + ";1.0";

        Assert.Throws<FormatException>(() => BaselineProcessor.ParseLine(line));
    }

    [Fact]
    public void Process_rejects_invalid_utf8_instead_of_replacing_it()
    {
        using var files = new TestFiles();
        var path = files.PathFor("invalid-utf8.txt");
        File.WriteAllBytes(path, new byte[] { (byte)'A', (byte)';', (byte)'1', (byte)'.', (byte)'0', (byte)'\n', 0xC3, 0x28 });

        var exception = Assert.Throws<FormatException>(() => BaselineProcessor.Process(path));

        Assert.Contains("2", exception.Message);
    }

    [Fact]
    public void Process_reports_line_number_for_bad_delimiter()
    {
        using var files = new TestFiles();
        var path = files.PathFor("bad-row.txt");
        File.WriteAllText(path, "A;1.0\nB;2.0;3.0\n", new UTF8Encoding(false));

        var exception = Assert.Throws<FormatException>(() => BaselineProcessor.Process(path));

        Assert.Contains("2", exception.Message);
    }
    [Fact]
    public void Process_accepts_valid_utf8_bom_but_rejects_corruption_after_it()
    {
        using var files = new TestFiles();
        string valid = files.PathFor("valid.txt");
        File.WriteAllText(valid, "Équateur;1.0\n", new UTF8Encoding(true, true));
        Assert.Equal(1, BaselineProcessor.Process(valid).RowCount);
        string invalid = files.PathFor("invalid.txt");
        File.WriteAllBytes(invalid, [0xEF, 0xBB, 0xBF, 0xC3, 0x28, 0x3B, 0x31, 0x2E, 0x30, 0x0A]);
        Assert.Throws<FormatException>(() => BaselineProcessor.Process(invalid));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Process_rejects_utf16_and_utf32_bom(bool utf32)
    {
        using var files = new TestFiles();
        string path = files.PathFor("other-encoding.txt");
        File.WriteAllText(path, "A;1.0\n", utf32 ? Encoding.UTF32 : Encoding.Unicode);
        Assert.Throws<FormatException>(() => BaselineProcessor.Process(path));
    }

    [Theory]
    [InlineData(1, false)]
    [InlineData(500, false)]
    [InlineData(500, true)]
    public void Process_locates_corruption_after_buffered_records_and_at_eof(int precedingRows, bool truncated)
    {
        using var files = new TestFiles();
        string path = files.PathFor("corrupt.txt");
        using (var stream = File.Create(path))
        {
            for (int i = 0; i < precedingRows; i++) stream.Write(Encoding.UTF8.GetBytes("A;1.0\n"));
            stream.Write(truncated ? new byte[] { 0xC3 } : new byte[] { 0xC3, 0x28 });
        }
        var error = Assert.Throws<FormatException>(() => BaselineProcessor.Process(path));
        Assert.Contains($"line {precedingRows + 1}.", error.Message);
    }
}
