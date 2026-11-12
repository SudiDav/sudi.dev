namespace BillionRows.Tests;

internal sealed class TestFiles : IDisposable
{
    public string DirectoryPath { get; } = Path.Combine(Path.GetTempPath(), $"billion-rows-{Guid.NewGuid():N}");

    public TestFiles() => Directory.CreateDirectory(DirectoryPath);

    public string PathFor(string name) => Path.Combine(DirectoryPath, name);

    public void Dispose()
    {
        if (Directory.Exists(DirectoryPath))
        {
            Directory.Delete(DirectoryPath, recursive: true);
        }
    }
}
