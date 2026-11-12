using System.Text.Json;
using Application;
using Application.Abstractions.Data;
using Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

if (args.Contains("--help", StringComparer.Ordinal))
{
    Console.WriteLine("Usage: dotnet run --project tools/ContentImport -- --input <export.json> [--dry-run] [--conflicts fail|skip|overwrite]");
    Console.WriteLine("Set ConnectionStrings__Database to the target database. Run --dry-run first. Import never sends email or creates publication jobs.");
    return 0;
}

try
{
    string? input = null;
    string conflictPolicy = "fail";
    bool dryRun = false;
    for (int index = 0; index < args.Length; index++)
    {
        switch (args[index])
        {
            case "--input" when index + 1 < args.Length:
                input = args[++index];
                break;
            case "--conflicts" when index + 1 < args.Length:
                conflictPolicy = args[++index];
                break;
            case "--dry-run":
                dryRun = true;
                break;
            default:
                throw new ArgumentException($"Unknown or incomplete option: {args[index]}");
        }
    }
    if (string.IsNullOrWhiteSpace(input)) throw new ArgumentException("--input is required; use --help for usage.");
    if (conflictPolicy is not ("fail" or "skip" or "overwrite")) throw new ArgumentException("--conflicts must be fail, skip, or overwrite.");

    HostApplicationBuilder builder = Host.CreateApplicationBuilder();
    if (string.IsNullOrWhiteSpace(builder.Configuration.GetConnectionString("Database")))
    {
        throw new InvalidOperationException("Set ConnectionStrings__Database explicitly before importing.");
    }
    builder.Services.AddApplication();
    builder.Services.AddInfrastructure(builder.Configuration);
    using IHost host = builder.Build();
    // Resolve scoped persistence without starting hosted background services.
    await using AsyncServiceScope scope = host.Services.CreateAsyncScope();
    IContentImporter importer = scope.ServiceProvider.GetRequiredService<IContentImporter>();
    await using FileStream stream = File.OpenRead(input);
    var report = await importer.ImportAsync(stream, conflictPolicy, dryRun, CancellationToken.None);
    Console.WriteLine(JsonSerializer.Serialize(report, new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true }));
    return 0;
}
catch (Exception exception) when (exception is ArgumentException or InvalidOperationException or IOException or JsonException)
{
    Console.Error.WriteLine(exception.Message);
    return 1;
}
