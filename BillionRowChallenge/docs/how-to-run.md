# How to run Lesson 1

This guide walks through the full workflow: check the machine, build and test, generate a dataset, run the CLI with the JIT and NativeAOT, and measure processing with BenchmarkDotNet. Run the shell commands from the project root:

```sh
cd /Users/sudi/.codex/worktrees/billion-row-lesson-01/sudi.dev/BillionRowChallenge
```

The project targets .NET 10 on Apple Silicon. For this lesson, use the pinned .NET SDK 10.0.114 and runtime 10.0.14 in the project-local `artifacts/dotnet` directory. The bootstrap helper downloads the official ARM64 SDK archive and checks its SHA-512 before extracting it. It does not change the system SDK or `global.json`. Python 3.9.6 and Rust 1.99 are also available on the lesson machine for the four-runtime comparison.

## 1. Check the machine and toolchain

Set up and select the project-local SDK, then check the SDK/runtime, CPU architecture, selected Xcode developer directory, and Clang compiler path:

```sh
python3 scripts/bootstrap-dotnet.py
export DOTNET_ROOT="$PWD/artifacts/dotnet"
export PATH="$DOTNET_ROOT:$PATH"
dotnet --info
uname -m
xcode-select -p
xcrun --find clang
```

Expect `dotnet --info` to show SDK 10.0.114 and runtime 10.0.14, and `uname -m` to print `arm64`. The helper is for macOS ARM64. NativeAOT needs a working Apple toolchain; `xcode-select` and `xcrun` help confirm that Xcode Command Line Tools are selected and Clang is available. If a command fails, resolve that machine setup before publishing NativeAOT. Keep the Terminal session open or repeat the two `export` commands in any new shell before using `dotnet`.

## 2. Restore, build, and test

Reevaluate the NuGet dependency graph, verify it against the lock files, compile the solution in Release mode, then run its tests. `--force-evaluate` is important if a previous NativeAOT publish or BenchmarkDotNet NativeAOT job added RID-specific dependencies to a lock file; a normal restore can leave that graph unchanged.

```sh
dotnet restore BillionRowChallenge.slnx --force-evaluate
dotnet restore BillionRowChallenge.slnx --locked-mode
dotnet build BillionRowChallenge.slnx -c Release --no-restore
dotnet test tests/BillionRows.Tests -c Release --no-build
```

These are separate steps. **Restore** downloads dependencies. **Build** compiles the projects but does not run the CLI. **Test** runs the xUnit checks against the build. A normal build uses the .NET JIT when the program runs.

## 3. Generate a tutorial dataset and process it with the JIT

Create the local data directory, generate one million deterministic measurements with seed 42, then process that exact file:

```sh
mkdir -p data
dotnet run -c Release --project src/BillionRows.Cli -- generate 1000000 data/tutorial-measurements.txt 42
dotnet run -c Release --project src/BillionRows.Cli -- process-fast data/tutorial-measurements.txt
```

`dotnet run` builds as needed and launches the CLI through the .NET runtime. In this normal build, the runtime JIT-compiles methods as the program executes. `process-fast` selects the optimized processor; the original `process` command remains available as the lesson baseline. The aggregate is written to stdout; timing, row counts, throughput and allocation diagnostics are written to stderr.

The generator refuses to replace an existing file. If you rerun the generation command, choose a new filename (for example `data/tutorial-measurements-2.txt`) and pass that same path to `process`.

To run the original teaching baseline on that file, use `process` instead of `process-fast`:

```sh
dotnet run -c Release --project src/BillionRows.Cli -- process data/tutorial-measurements.txt
```

## 4. Publish and run the NativeAOT CLI

Publish a self-contained native executable for Apple Silicon, then invoke the executable directly:

```sh
dotnet publish src/BillionRows.Cli -c Release -r osx-arm64 -p:PublishAot=true -o artifacts/native-aot
./artifacts/native-aot/BillionRows.Cli process-fast data/tutorial-measurements.txt
```

**Publish** is different from build and run: it compiles the application and its dependencies into a native executable for the selected runtime identifier. The first NativeAOT publish can take longer because it may download compiler and build dependencies. Publishing restores RID-specific dependencies, so do not add `--no-restore` to the publish command. The publish restore can update the CLI and Core lock files with RID- and AOT-specific dependencies. The executable runs directly; do not use `dotnet run` to launch it.

NativeAOT can reduce startup and JIT work because there is no runtime JIT compilation at launch. That does not mean it always processes data faster. Steady-state processing depends on the code and workload; use the benchmark to compare it. The results depend on this machine, SDK, and dataset. The generated native output is in `artifacts/native-aot/`.

After publishing, force NuGet to reevaluate the ordinary dependency graph, then check that the locked restore succeeds before continuing with normal builds or tests:

```sh
dotnet restore BillionRowChallenge.slnx --force-evaluate
dotnet restore BillionRowChallenge.slnx --locked-mode
```

## 5. Compare JIT and NativeAOT CLI output

Run the optimized command in both JIT and NativeAOT modes. These commands store stdout and stderr separately, then compare the aggregates. The `diff` command should print nothing when the aggregate output is identical:

```sh
dotnet run -c Release --project src/BillionRows.Cli -- process-fast data/tutorial-measurements.txt > data/jit-output.txt 2> data/jit-diagnostics.txt
./artifacts/native-aot/BillionRows.Cli process-fast data/tutorial-measurements.txt > data/aot-output.txt 2> data/aot-diagnostics.txt
diff -u data/jit-output.txt data/aot-output.txt
```

The diagnostic files contain separate timings, which are useful as a quick observation but are not a controlled benchmark. Both runs read the same file and may benefit from the operating system's file cache.

The CLI can also generate a distinct dataset with NativeAOT. Use a path that does not already exist:

```sh
./artifacts/native-aot/BillionRows.Cli generate 1000000 data/tutorial-aot-measurements.txt 42
```

To compare generated bytes, generate the same row count and seed into a separate, fresh path with the JIT CLI, then compare the two files with `cmp`. Generation is outside the processing benchmark described below.

## 6. Run the benchmark suite

Run BenchmarkDotNet in Release mode:

```sh
dotnet run -c Release --project tests/BillionRows.Benchmarks -- --filter '*'
```

The suite runs twelve cases: baseline and optimized processing, each with JIT and NativeAOT jobs at 10,000, 100,000 and 1,000,000 rows. Each case uses one launch, three warmup iterations and five measured iterations. BenchmarkDotNet generates the input before measurement; the timed operation is processing an existing file. This is a warm-cache processing benchmark, not a disk-throughput test. The BenchmarkDotNet host remains a JIT application and separately builds/runs the NativeAOT benchmark process. Do not publish the BenchmarkDotNet host itself with `PublishAot`.

Reports are written under `BenchmarkDotNet.Artifacts/results/`. The report includes mean and standard deviation, rows per second, allocated managed memory, and Gen0/Gen1 collection counts. Compare methods and runtimes at the same row count. The ratio is relative to the baseline JIT case: a ratio of `1.20` means the compared case took about 20% longer; lower is faster. Read [the recorded benchmark results](benchmark-results.md) for this project's measured values rather than assuming NativeAOT or the optimized method always wins.

The NativeAOT benchmark job can update the BenchmarkDotNet project's lock graph with RID-specific dependencies. Before the next locked restore, build, or test after benchmarking, force NuGet to reevaluate and then verify the ordinary locked graph:

```sh
dotnet restore BillionRowChallenge.slnx --force-evaluate
dotnet restore BillionRowChallenge.slnx --locked-mode
```

## 7. Build and run the Rust and Python processors

The Rust and Python implementations process the same measurement-file format for an end-to-end comparison. Rust uses the installed toolchain and the checked-in Cargo lock file; Python uses only the standard library.

Run the Rust tests and build its optimized executable:

```sh
cargo test --manifest-path comparisons/rust/Cargo.toml
cargo build --release --manifest-path comparisons/rust/Cargo.toml
```

Run the Python unit tests, then process the tutorial dataset:

```sh
python3 -m unittest discover -s comparisons/python -v
python3 comparisons/python/processor.py process data/tutorial-measurements.txt
```

You can also process the same file directly with Rust:

```sh
comparisons/rust/target/release/billion-rows-rust process data/tutorial-measurements.txt
```

## 8. Compare all four runtimes

After the Release JIT CLI and NativeAOT executable are available, and after building Rust and running the Python tests above, run:

```sh
python3 scripts/compare-runtimes.py
```

This verifies output and exit behavior on shared fixtures, checks seeded JIT/NativeAOT generation bytes, and compares the complete CLI processing commands for JIT, NativeAOT, Rust and Python at 10k, 100k and 1m rows. For .NET it runs `process-fast`; Rust and Python use their optimized processing implementations. Each engine gets one unmeasured warmup and five measured runs per size, with engine order rotated between runs. It writes progress and raw data to `data/runtime-comparison.json`. To run the verification without timing the datasets, use:

```sh
python3 scripts/compare-runtimes.py --verify-only
```

These timings include process startup and output, so startup and runtime differences are part of the measurement. They answer a different question from the BenchmarkDotNet processing benchmark, which measures an already-started process's operation. Do not interpret the two reports as the same metric. The recorded comparison results, once available, are linked from [the results page](benchmark-results.md).

The optimized implementations keep temporary work bounded: .NET returns pooled character buffers in `finally`, Rust reuses a record buffer and uses borrowed lookup keys with checked arithmetic, and Python uses its built-in ASCII/digit parsing paths, context-managed files and checked 64-bit totals. Memory still depends on the number of distinct stations and the longest input record. These changes do not use unsafe code or claim SIMD or parallel processing.

## 9. Run it from Rider

The built-in Rider Terminal is the most direct route and runs the same commands as the shell. Open `BillionRowChallenge.slnx`, open **View → Tool Windows → Terminal**, and run the commands in steps 1–8 from the project root. Run step 1 in that Terminal first so its environment uses the project-local SDK. The Terminal recipe is also the least ambiguous way to publish and launch NativeAOT.

To run BenchmarkDotNet using Rider's Run button instead:

1. In Rider's built-in Terminal, run step 1 above, then print the resulting PATH:

   ```sh
   printf '%s\n' "$PATH"
   ```

   Copy the full printed value. The Terminal's `export` commands only affect that Terminal; they do not change the environment of Rider's Run configuration.

2. Build the benchmark project in Release mode from the Terminal first:

   ```sh
   dotnet build tests/BillionRows.Benchmarks/BillionRows.Benchmarks.csproj -c Release
   ```

3. Add a **.NET Project** run configuration for `BillionRows.Benchmarks` with:
   - **Executable:** `tests/BillionRows.Benchmarks/bin/Release/net10.0/BillionRows.Benchmarks`
   - **Program arguments:** `--filter "*"`
   - **Working directory:** the `BillionRowChallenge` project root
   - **Environment variables:** set `DOTNET_ROOT` to `/Users/sudi/.codex/worktrees/billion-row-lesson-01/sudi.dev/BillionRowChallenge/artifacts/dotnet`; set `PATH` to the complete value copied from Rider's Terminal in step 1. It must start with the project-local SDK directory. Do not enter the literal `$PATH` and expect Rider to expand it.
4. Select that configuration and click **Run** (not **Debug**). Wait for BenchmarkDotNet's final summary and the process to exit successfully. The output should list all twelve baseline/optimized JIT and NativeAOT cases.

The explicit Release build matters: pointing a configuration at a Release executable does not guarantee Rider rebuilds that Release output. Rider's automatic before-launch build may use Debug settings. Rebuild Release in the Terminal after changing benchmark code or configuration. Avoid the debugger for timing runs. The local `DOTNET_ROOT` and `PATH` are also essential: BenchmarkDotNet uses them to find the selected SDK/runtime and native compiler when creating its NativeAOT job. Without these Run-configuration variables, Rider can fall back to the system .NET installation.

## Optional: run the scaling script

The independent verifier runs 10k, 100k, 1m and 10m rows by default. From the project root:

```sh
python3 scripts/run-experiments.py
```

It refuses to overwrite existing dataset files. If it reports a path collision, preserve the existing data and move it aside manually before retrying. This optional script does not automatically run 100m or one billion rows.

## NativeAOT references

- [Native AOT deployment](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/)
- [BenchmarkDotNet toolchains](https://benchmarkdotnet.org/articles/configs/toolchains.html)
