# Native AOT, Spans, Rust and Python — measured comparison

Executed 2026-11-05 on the same Apple M5 Max, macOS 26.6 ARM64, 18 logical CPUs, 48 GiB machine used for Lesson 1. These are sequential processors with the same exact integer aggregation and validated output contract. Their implementation details differ, so these results compare the programs as written, not the languages in isolation.

## Toolchain and correctness

The installed system SDK 10.0.101 selected a NativeAOT compiler package 10.0.1 with a known vulnerability and restore failed NU1903. A pinned official .NETSDK 10.0.114/runtime 10.0.14 was downloaded into ignored `artifacts/dotnet/` and verified using the official SHA512. The system installation was not changed, and audit/warning checks were not disabled. Both new JIT and AOT measurements use 10.0.14. See [the advisory](https://github.com/advisories/GHSA-p3jp-9v83-76w9) and [local SDK details](results/runtime-comparison/dotnet-info.txt).

Rust uses rustc/cargo 1.99.0; Python uses the installed CPython 3.9.6. Neither implementation adds third-party packages. Rust is built with `cargo build --release`; Python is an ordinary interpreter invocation, without PyPy, NumPy or a native extension.

Validation: 78 .NET tests, 11 Rust tests and 13 Python unittest tests passed. The shared harness also passed 108 fixture/engine combinations, checks for usage/missing-file exit codes and identical JIT/AOT seed bytes. Fixtures include exact midpoint rounding, UTF-16 ordinal sorting (including supplementary Unicode), strict UTF-8 and BOM handling, malformed numbers and large out-of-range temperatures. Every timed invocation's output was checked against an independent integer oracle over the exact same input file. Native publishing completed without warnings and produced an ARM64 Mach-O executable.

## End-to-end CLI comparison

Command: `python3 scripts/compare-runtimes.py`, with the local SDK selected. Sizes: 10k, 100k, 1m. Each engine received one unmeasured warmup per size and five measured subprocess invocations. Engine order rotated between rounds. The reported wall time includes process startup, runtime/JIT/import work, file processing, sorting/output, process exit and the same macOS `/usr/bin/time -l` wrapper. Inputs were likely warm in filesystem cache. No outliers were removed from this experiment.

.NET uses `process-fast` (the Span processor); Rust and Python use their current optimized sequential processors. Inputs: 12 fixed stations, seed 42, roughly 14.23 bytes/row. The 1m file contains 14,232,785 bytes. The raw JSON includes SHA256 for each dataset, every wall/CPU/RSS observation, standard deviation and verification evidence.

| Engine — 1m rows | Mean ms | StdDev ms | Rows/s | Max observed peak RSS MiB |
|---|---:|---:|---:|---:|
| dotnet-jit | 144.247 | 10.373 | 6,932,545 | 46.91 |
| dotnet-aot | 57.057 | 1.089 | 17,526,272 | 7.66 |
| rust | 49.607 | 2.932 | 20,158,259 | 1.69 |
| python | 1195.653 | 48.362 | 836,363 | 11.89 |

[Full raw observations](results/runtime-comparison/comparison.json) and [console output](results/runtime-comparison/comparison.log) include all three sizes. Peak RSS is the maximum of five separate process peaks, not allocated bytes or a GC heap measurement. macOS CPU figures are rounded to hundredths of a second and are preserved as observations, not used for throughput calculations.

For this short-lived CLI workload, Rust was fastest and used the least observed process memory. NativeAOT substantially reduced .NET startup cost and process memory relative to the JIT CLI. Python's interpreter and per-row work were slower here. These findings do not predict a different station cardinality, distribution, runtime version, machine or warmed service workload.

## Memory and failure behavior

- .NET's original `process` baseline remains unchanged. `process-fast` rents and returns a character buffer, scans records using `ReadOnlySpan<char>`, parses integer tenths and uses dictionary alternate lookup. It creates station strings only for new stations and copies only the incomplete record tail between reads. `using` and `finally` release files and return pooled buffers, including on validation failures. Nullable analysis and warnings-as-errors remain enabled.
- Rust reuses a record vector, processes both CR and LF incrementally and looks up stations using borrowed string slices; only new keys are owned. Arithmetic is checked, and there is no unsafe code. Review regressions protect fractional overflow, BOM-only files and CR-only streaming.
- Python uses buffered text iteration and context-managed files. ASCII/digit checks use built-ins, Unicode controls retain validation, and signed 64-bit sum/count limits are checked explicitly even though Python integers are arbitrary precision. Per-line strings still allocate and are reclaimed by the interpreter.

Peak process memory was approximately flat from 10k to 1m rows for each engine: JIT 46.9 MiB, AOT 7.6 MiB, Rust 1.7 MiB and Python 11.9 MiB. This agrees with the source model: retained memory depends on distinct stations and the longest record, not total rows for this fixed station set. It is not a formal proof of the absence of every possible leak or an absolute memory cap for adversarial station counts or record lengths. No unmanaged pointer code, mmap, custom hash table, parallelism or manual SIMD was introduced.

## Ten-million-row correctness and memory check

After all timed experiments completed, each engine processed the existing 142,331,333-byte, ten-million-row file once. Its SHA-256 matched the independently verified original scaling file, and every output matched that saved integer oracle. These single invocations are correctness/memory observations, not a new repeated timing benchmark.

| Engine | Peak RSS MiB — 10m rows |
|---|---:|
| dotnet-jit | 48.12 |
| dotnet-aot | 7.62 |
| rust | 1.69 |
| python | 11.75 |

The input is substantially larger than each process peak, supporting the streaming design for this fixed station set. See [raw checks and diagnostics](results/runtime-comparison/ten-million-verification.json). No hundred-million or billion-row file was generated.

## BenchmarkDotNet: warmed .NET operation

The BenchmarkDotNet run completed **all 12 cases**, exit 0, in 135.27 seconds overall (98.65 seconds run time). Both jobs report .NET 10.0.14 ARM64. One launch, three warmups and five configured measurement iterations were retained; the default outlier policy excluded some observations, all listed in the raw log. macOS denied high process priority and ordinary priority was used. No benchmark rerun or parameter change was used to choose a result.

Selected 1m-row results:

| Processor | Runtime | Mean ms | StdDev ms | Rows/s | Managed allocated / operation |
|---|---|---:|---:|---:|---:|
| Original baseline | JIT | 96.515 | 4.179 | 10,361,134 | 118.75 MiB |
| Original baseline | NativeAOT | 116.011 | 0.771 | 8,619,883 | 149.27 MiB |
| Span / pooled buffers | JIT | 44.631 | 0.767 | 22,406,150 | 18.53 KiB |
| Span / pooled buffers | NativeAOT | 56.939 | 7.352 | 17,562,518 | 18.61 KiB |

The JIT Span processor's point estimate is about **2.16× faster** than the original JIT baseline, with about **99.98% less cumulative managed allocation**. The Span allocation remains approximately 18.5 KiB for 10k, 100k and 1m rows; it does not allocate station/temperature/line strings per ordinary record. There were no measured Gen0/Gen1 collections for the 1m Span operation in either runtime; this does not mean the runtime can never collect or that allocation is zero.

JIT was faster than AOT for warmed processing in this run, while AOT won the short-lived .NET CLI comparison. That is consistent with eliminating startup/JIT work without guaranteeing superior steady-state code. Compiler/runtime optimization differences and noise can affect the result; no CPU profile was taken to assign exact causes. The optimized AOT 1m standard deviation was relatively large at 7.35 ms, so treat its precise percentage difference cautiously. No claim is made about a different deployment or machine.

The BDN Ratio column compares AOT to JIT for the same method and row count; it does not directly report Span-versus-baseline speedup. Allocated columns describe total managed bytes/operation, not RSS. GC counters are per 1,000 operations. Binary-scaled report labels KB/MB are rendered as KiB/MiB here.

Preserved [full Markdown report](results/runtime-comparison/BillionRows.Benchmarks.ProcessingBenchmarks-report-github.md), [CSV](results/runtime-comparison/BillionRows.Benchmarks.ProcessingBenchmarks-report.csv), [HTML](results/runtime-comparison/BillionRows.Benchmarks.ProcessingBenchmarks-report.html), and [complete log](results/runtime-comparison/benchmark-run.log) include all 12 means/stddev/GC/allocation measurements and outlier details. Original Lesson 1 reports remain separate in `docs/results/`.

## Reproduce

Use [the numbered run guide](how-to-run.md) for environment setup, builds, tests, data generation, all four CLIs, AOT publishing, both benchmark methods and Rider configuration. Native publish changes SDK-specific lock graphs; `dotnet restore BillionRowChallenge.slnx --force-evaluate` returns to the ordinary graph before a locked restore (required after publishing or NativeAOT benchmark restores, which can otherwise leave a no-op restore with stale RID lock state). The guide does not bypass security audit failures. All native/Cargo/SDK build output and datasets remain ignored; only small evidence files are retained under `docs/results/`.
