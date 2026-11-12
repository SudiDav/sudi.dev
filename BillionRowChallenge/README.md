# .NET 10 Billion Row Challenge — Lesson 1

A hands-on baseline for learning how .NET uses storage, the managed heap, garbage collection and dictionaries. The goal is eventually to aggregate one billion weather measurements efficiently. This lesson establishes correctness and real measurements before optimization.

The [original 1BRC](https://github.com/gunnarmorling/1brc) is a Java challenge: read `station;temperature` records and print each station's minimum, mean and maximum. This C# learning project is not an official competition submission.

## Prerequisites and setup

- macOS on Apple Silicon; .NET **10 SDK**, ARM64. The initial run used SDK 10.0.101/runtime 10.0.1. The AOT comparison uses the project-local patched SDK 10.0.114/runtime 10.0.14; follow the guide below to select it.
- Rider with .NET 10 support, or VS Code with C# tooling. Open `BillionRowChallenge.slnx` in Rider; open this folder in VS Code.
- Python 3 is optional, only for the independent scaling verifier. Production and xUnit code do not require Python.

Run commands **from this folder**, so `global.json` selects .NET 10:

```sh
cd BillionRowChallenge
dotnet --info
uname -m
sysctl -n hw.logicalcpu
dotnet restore BillionRowChallenge.slnx --locked-mode
dotnet build BillionRowChallenge.slnx -c Release --no-restore
dotnet test tests/BillionRows.Tests -c Release --no-build
```

Application packages are limited to xUnit/test infrastructure and BenchmarkDotNet; Native AOT publishing also restores the SDK compiler/linker packages. Core and CLI use only the standard library. Package versions and transitive graphs are recorded in `packages.lock.json`. `global.json` allows later patches of the 10.0.1xx SDK feature band. Install an official [ARM64 .NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) if it is missing; this project does not install system dependencies.

For the expanded Native AOT, Rust, Python and Span workflow, start with [the numbered run guide](docs/how-to-run.md), including the project-local SDK setup.

## Generate and process

```sh
dotnet run -c Release --project src/BillionRows.Cli -- generate 1000000 data/measurements.txt
dotnet run -c Release --project src/BillionRows.Cli -- process data/measurements.txt
# Optimized version: pooled buffers, Span parsing, allocation only for new stations:
dotnet run -c Release --project src/BillionRows.Cli -- process-fast data/measurements.txt
# Optional signed 32-bit seed, default 42:
dotnet run -c Release --project src/BillionRows.Cli -- generate 10000 data/other.txt 1729
```

Generation accepts nonnegative 64-bit row counts, including 10m, 100m and 1b. It creates a new file; existing paths are never overwritten. Parent directories must exist. The fixed 12-station set includes DRC cities and accented UTF-8 names. Seeded `System.Random` chooses stations and integer tenths uniformly from −999 through 999. Files use UTF-8 without BOM and LF (`\n`). Equal seeds/counts give equal bytes on the pinned runtime/algorithm; this is not a promise that `System.Random` remains identical across future runtimes. The distribution is synthetic, not meteorological.

Successful `generate` writes diagnostics to stderr. `process` writes only a deterministic ordinal-sorted aggregate to stdout:

```text
{Goma=22.3/22.3/22.3, Kinshasa=29.1/29.1/29.1, Kolwezi=32.5/32.8/33.1, Lubumbashi=24.8/24.8/24.8}
```

Processing diagnostics go to stderr: rows, station count, elapsed seconds, rows/s and total managed bytes allocated during processing. You can save results separately:

```sh
dotnet run -c Release --project src/BillionRows.Cli -- process data/measurements.txt > data/results.txt 2> data/metrics.txt
```

Exit codes: **0** success/help; **2** invalid command/arguments; **1** I/O, malformed records or arithmetic overflow. Failed input processing produces no aggregate. `--help` prints usage.

## Parsing and arithmetic contract

Each record has exactly one `;`, a nonempty station name of at most 100 UTF-8 bytes, and an ASCII temperature with an optional minus sign, one or more integer digits, a dot and **exactly one fractional digit**. Valid range: −99.9 to 99.9. Names are case-sensitive and may contain spaces; control characters are rejected. Blank rows, plus signs, whitespace around numbers, thousands separators, exponents, non-ASCII digits and extra precision are errors. Leading zeroes and negative zero are accepted and normalize numerically. A UTF-8 BOM, CRLF and a final row without a newline are accepted by the baseline reader. Malformed UTF-8 and UTF-16/32 BOM files are rejected. Decoder failures trigger a streaming diagnostic rescan to identify the physical line; valid files stay on the normal `File.ReadLines` path.

The baseline intentionally uses `decimal.Parse` with invariant culture, then converts to integer tenths. Min/max are `int`; sum and count are checked `long`. Means use decimal division and display one decimal with `MidpointRounding.AwayFromZero`: +0.05 → +0.1 and −0.05 → −0.1. Input is never rounded to make it valid. The aggregate object checks additions before changing any field.

Differences from the official challenge: C# rather than Java; modular projects and test/benchmark dependencies; a smaller synthetic station set and uniform distribution; explicit rejection of malformed input; convenience line endings; ordinal .NET sorting; midpoint rounding away from zero rather than the official Java-style ties toward positive infinity. This lesson promises its documented behavior rather than leaderboard compatibility. It has no enforced 10,000-station cap: memory grows with unique station names.

## Architecture

```text
BillionRowChallenge.slnx
src/BillionRows.Core/          generator, parser, processor, statistics
src/BillionRows.Cli/         argument validation and stdout/stderr reporting
tests/BillionRows.Tests/       xUnit unit and integration tests
tests/BillionRows.Benchmarks/  BenchmarkDotNet executable
data/                         ignored generated files and local logs
docs/lesson-01.md              concepts and performance tradeoffs
docs/benchmark-results.md      executed measurements and interpretation
scripts/run-experiments.py    independent streaming scaling verifier
```

`MeasurementGenerator` owns buffered streaming writes. `BaselineProcessor` reads one line at a time with `File.ReadLines`, validates records and updates a `Dictionary<string, StationStats>` using `StringComparer.Ordinal`. `OptimizedProcessor` is the separately benchmarked Span-based extension: pooled character buffers, direct integer parsing, and alternate dictionary lookup without per-row station strings. `StationStats` owns exact integer totals and output rounding. The CLI owns presentation; it does not add timing/output work inside the benchmarked operation.

## Benchmarks and scaling

```sh
dotnet run -c Release --project tests/BillionRows.Benchmarks -- --filter '*'
# Optional independent correctness and scaling run after a Release build:
python3 scripts/run-experiments.py
```

BenchmarkDotNet runs the baseline and Span processor under both JIT and NativeAOT at 10k, 100k and 1m rows (twelve cases) sequentially in isolated processes: one launch, three warmups, five measured iterations. Setup generates input outside measurement and cleanup removes it. MemoryDiagnoser records managed allocation and GC collections. The custom Rows/s column divides row count by mean operation time. Raw reports appear in ignored `BenchmarkDotNet.Artifacts/`; the executed reports are preserved under `docs/results/`.

The scaling script runs **only** 10k, 100k, 1m and 10m sequentially. It checks free disk against 32 bytes/row plus a 1 GiB reserve, verifies every aggregate against an independent Python integer/Decimal oracle, compares a repeated seed byte-for-byte via SHA-256, and records CLI metrics plus macOS peak RSS/CPU time. It refuses existing dataset paths: move prior files before rerunning. Results are written to `data/experiment-results.json`.

Ten million rows are modest on the recorded machine. This lesson did not run 100m or 1b. Before any larger experiment, check `df -h .`, estimate at most 32 bytes/row for this generator, allow space for existing files, and obtain approval for expensive runs. **Never run one billion rows as an automatic setup step.**

## Troubleshooting

- **SDK mismatch / NETSDK1045:** run from this folder; inspect `dotnet --info` and install .NET 10 ARM64. Do not run under an x64/Rosetta shell.
- **File already exists:** choose a fresh output path. Generation deliberately protects existing files.
- **Directory not found / permission denied:** create the parent directory and choose a writable location.
- **Malformed record:** use the reported record location to inspect delimiters, precision, temperature range and encoding. Processing stops immediately.
- **NuGet restore fails:** check network access and configured NuGet sources; retry the locked restore. No additional production packages are required.
- **Benchmark returns no results:** use Release without a debugger; inspect `BenchmarkDotNet.Artifacts` for validation/build errors. Run from this folder with the .NET 10 SDK.
- **Results vary:** macOS caches freshly written/read files. Concurrent applications, power mode, thermal state, JIT warmup and P/E core scheduling affect timings. These results are warm-cache application baselines, not raw SSD bandwidth measurements.
- **Memory grows with a hostile file:** streaming bounds memory relative to row count only for a fixed station set and bounded row lengths. New unique names retain dictionary entries, and an extremely long malformed line must first be materialized by `ReadLines`.

See [Lesson 1](docs/lesson-01.md) and [actual measurements](docs/benchmark-results.md) for interpretation and Lesson 2 ideas.

## Native AOT, Rust and Python comparison

See [actual AOT/Span/Rust/Python measurements](docs/runtime-comparison.md). Follow [the step-by-step run guide](docs/how-to-run.md) for the complete workflow, including Rider. It covers the local patched .NET SDK bootstrap, build/tests, JIT and Native AOT CLI runs, both BenchmarkDotNet jobs, and equivalent sequential Rust/Python processors.

```sh
python3 scripts/bootstrap-dotnet.py
export DOTNET_ROOT="$PWD/artifacts/dotnet"
export PATH="$DOTNET_ROOT:$PATH"
dotnet build BillionRowChallenge.slnx -c Release
dotnet publish src/BillionRows.Cli -c Release -r osx-arm64 -p:PublishAot=true -o artifacts/native-aot
cargo build --release --manifest-path comparisons/rust/Cargo.toml
python3 scripts/compare-runtimes.py
```

The comparison checks matching output and failure behavior before measuring complete CLI invocations. The four engines use the same 10k, 100k and 1m input files, one warmup and five measurements per size. This includes process startup and output; it is a separate metric from BenchmarkDotNet's warmed processing operation. Rust and Python use only their standard libraries. Native artifacts, the local SDK and Cargo build output are ignored.
