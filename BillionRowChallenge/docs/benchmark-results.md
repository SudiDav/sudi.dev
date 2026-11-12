# Lesson 1 — executed results

For the later Native AOT, Span, Rust and Python extension, see [the four-runtime comparison and new measurements](runtime-comparison.md). The results below preserve the original Lesson 1 baseline run.

Recorded 2026-11-05 on the user's Apple Silicon Mac. All numbers below are actual executions, unless explicitly described as a preflight estimate. No 100-million or billion-row dataset was generated.

## Machine and tools

- Apple M5 Max; 18 logical CPUs; 51,539,607,552 bytes (48 GiB) RAM.
- macOS 26.6, build 25G72; native arm64 / osx-arm64, no x64 runtime detected.
- .NET SDK 10.0.101; runtime Microsoft.NETCore.App 10.0.1; MSBuild 18.0.6.
- BenchmarkDotNet 0.15.8, xUnit 2.9.3, Visual Studio xUnit adapter 4.0.1, Microsoft.NET.Test.Sdk 18.11.0. No production NuGet dependencies.
- No system dependency installation, CPU affinity change, cache purge or power-mode change. Other applications were not controlled; thermal state and storage device model were not instrumented.

## Sequential scaling experiment

Command: `python3 scripts/run-experiments.py`, after building the Release CLI. Every dataset was generated, processed, verified by an independent streaming Python integer/Decimal oracle, then generated again with seed 42 and compared by SHA-256. All four row counts and all 12 station aggregates matched. The verifier checks LF, temperature syntax/range and exact count while streaming. It does not call the C# parser or aggregation code.

Disk preflight observed 1,021,532,143,616 free bytes. The conservative estimate was **675,520,000 bytes**, including all datasets and the largest temporary duplicate; a further 1 GiB reserve was required. This is a storage estimate, not a performance extrapolation. Files actually total about 158 MB. Generated datasets remain ignored under `data/`.

Each timing comes from the Core Stopwatch; each command ran in a fresh .NET process. Generation time includes writer close/flush to the OS, but not durable `fsync`. Processing time includes file open, BOM validation, streaming parse/aggregation and result construction, but excludes CLI startup/sorting/printing. Process CPU/RSS observations include the whole command and runtime startup. All inputs were freshly generated, so filesystem cache was likely warm.

| Rows | File bytes | Generate s | Process s | Process rows/s | Managed allocated bytes | Process peak RSS MiB |
|---:|---:|---:|---:|---:|---:|---:|
| 10,000 | 142,188 | 0.008749 | 0.008460 | 1,181,977 | 1,579,192 | 44.81 |
| 100,000 | 1,423,076 | 0.011876 | 0.024975 | 4,003,956 | 15,663,072 | 51.34 |
| 1,000,000 | 14,232,785 | 0.074038 | 0.173509 | 5,763,400 | 156,518,328 | 51.30 |
| 10,000,000 | 142,331,333 | 0.618463 | 1.167682 | 8,563,978 | 1,301,775,480 | 53.39 |

Raw per-station integer sums/counts/extrema, file hashes, generation RSS and command CPU timings are preserved in [scaling.json](results/scaling.json).

The 10m processing command recorded 1.19 s whole-process wall time, 1.20 s user CPU and 0.04 s system CPU, with 55,984,128-byte peak RSS. User CPU can slightly exceed wall time even though processing is sequential because the runtime can use helper/GC threads; the operating-system timings are rounded to hundredths of a second. Generation used 0.64 s whole-process wall time, 0.63 s user and 0.02 s system CPU.

The retained dictionary contains 12 stations. Peak processing RSS stayed about 45–53 MiB while input grew from 142 KB to 142 MB. This observation supports the source-level streaming model; it is not a strict memory guarantee for arbitrary station cardinality/line lengths. Total allocation is cumulative: the 10m run allocated about 1.30 GB across its lifetime while reclaiming short-lived objects, rather than retaining that amount at once. Allocation/row and throughput vary across these fresh-process runs; startup, tiered JIT and runtime optimizations can affect the short workloads. These are not repeated statistical benchmark estimates.

## BenchmarkDotNet

Command: `dotnet run -c Release --no-build --project tests/BillionRows.Benchmarks -- --filter '*'`.

The executable exited **0** and BenchmarkDotNet completed all three cases in 26.91 seconds overall (22.71 seconds benchmark run time). It used .NET 10.0.1 ARM64 RyuJIT, one launch, three warmup iterations and five measured iterations. Global setup generated each dataset outside measurement. The measured operation was the complete `BaselineProcessor.Process` call, excluding CLI formatting and startup. Each iteration contained multiple complete file-processing operations.

| Rows | Mean ms | StdDev ms | Rows/s | Managed allocation / operation | Gen0 / 1,000 operations | Gen1 / 1,000 operations |
|---:|---:|---:|---:|---:|---:|---:|
| 10,000 | 0.8346 | 0.00374 | 11,981,136 | 1.20 MiB | 150.3906 | 4.8828 |
| 100,000 | 8.2913 | 0.12443 | 12,060,828 | 11.89 MiB | 1,484.3750 | 31.2500 |
| 1,000,000 | 82.4390 | 0.69649 | 12,130,176 | 118.75 MiB | 14,833.3333 | 0 |

Allocation figures are rounded from BenchmarkDotNet's binary-scaled report (which labels these units MB). GC columns are **normalized per 1,000 complete processing operations**, not per row. No Gen2 collections were recorded in the raw MemoryDiagnoser counters. The one-million-row allocation corresponds to about **124.5 managed bytes per row**; this describes cumulative allocation, not retained heap size.

Caveats from the actual run:

- macOS denied BenchmarkDotNet's request for high process priority. The benchmarks completed at ordinary priority; no elevated permissions were requested.
- BenchmarkDotNet's default outlier policy excluded one 856.52-microsecond observation for 10k rows; that summary uses four retained samples. The other summaries retain five. The workload and iteration configuration were not changed to improve the result.
- Repeated operations read warm-cache files. No filesystem cache purge occurred. These results do not measure cold SSD throughput or predict a billion-row runtime.
- One launch and five configured measurement iterations establish a reproducible lesson baseline, not a thorough characterization of thermal drift, scheduling or between-process variation.

Preserved evidence: [original Markdown report](results/BillionRows.Benchmarks.ProcessingBenchmarks-report-github.md), [CSV](results/BillionRows.Benchmarks.ProcessingBenchmarks-report.csv), [HTML](results/BillionRows.Benchmarks.ProcessingBenchmarks-report.html), and [complete benchmark log](results/benchmark-run.log).

The steady-state benchmark processes about 12 million rows/s across the three sizes: close to linear time over this tested range. The fresh-process one-million-row CLI observation was 173.509 ms versus the warmed benchmark's 82.439 ms. Startup/JIT state, cache state and measurement methodology differ, so this difference is not an implementation speedup. No candidate optimized parser was measured.

## Validation and status

- xUnit: 59 passed, 0 failed, 0 skipped; [actual test output](results/tests.txt).
- Actual CLI subprocesses returned 2 for usage/invalid row count and 1 for missing/malformed files, with empty stdout: [checks](results/cli-process-checks.txt).
- Identical-seed byte comparisons and independent aggregates passed for 10k, 100k, 1m and 10m.
- Locked NuGet restore and the whole Release solution build succeeded, with 0 warnings and 0 errors: [restore output](results/restore.txt), [build output](results/build.txt).
- BenchmarkDotNet completed all three cases successfully; its entry point returned exit code 0.
- Acceptance achieved on implementation attempt 4/4 after explicit authorization for the additional attempt. The repair only materialized the benchmark summaries before checking them; benchmark workloads and correctness criteria were unchanged.
- Generated data, build outputs and working BenchmarkDotNet artifacts are ignored. Only the small copied reports under `docs/results/` are deliverables. No 100m/1b experiment, system installation, commit, push or merge was performed.
- Independent review identified and verified repairs for strict UTF-8/BOM handling, buffered decoder line diagnostics and full-size deterministic verification. Invalid UTF-8 is rejected, including after a UTF-8 BOM. UTF-16/32 BOM input is rejected. Decoder error location uses a streaming diagnostic rescan only after failure, keeping valid-file processing on `File.ReadLines`.

## Interpretation and next lesson

The source intentionally allocates line strings and station/temperature substrings and uses invariant `decimal.Parse`. Those are plausible sources of CPU/allocation cost, together with station validation, hashing and garbage collection. No CPU profile was taken, so their exact shares are unknown. This lesson's uniform 12-station data does not predict a 10,000-station workload or real-world distributions.

Lesson 2 should profile first, then compare direct integer parsing and substring avoidance against this fixed correctness contract and workload. Keep error/rounding semantics explicit. Parallelism, SIMD, unsafe pointers and custom hash tables remain future work. No billion-row execution time has been extrapolated from these measurements.
