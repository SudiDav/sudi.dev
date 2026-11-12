using System.Diagnostics;
using BenchmarkDotNet.Running;

#if DEBUG
Console.Error.WriteLine("Benchmarks require a Release build: dotnet run -c Release --project tests/BillionRows.Benchmarks -- --filter '*'");
return 1;
#else
if (Debugger.IsAttached)
{
    Console.Error.WriteLine("Detach the debugger before running benchmarks.");
    return 1;
}
var summaries = BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args).ToArray();
return summaries.Length > 0 && summaries.All(s => s.Reports.All(r => r.Success)) ? 0 : 1;
#endif
