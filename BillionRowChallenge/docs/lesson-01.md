# Lesson 1: measure a correct sequential baseline

The baseline is deliberately readable. Its purpose is to make later changes measurable while protecting correctness. A faster parser that silently changes averages is a regression.

## Follow one record

For `Kolwezi;32.5`, `File.ReadLines` returns a line string. Parsing locates the delimiter, creates station and temperature substrings, checks syntax, parses an invariant decimal and converts 32.5 to integer 325. The dictionary hashes `Kolwezi` with ordinal equality. Its existing `StationStats` updates min, max, sum and count, or a new station entry is added. After the final row, the CLI sorts station names and formats min/mean/max.

Processing is sequential: one thread reads records and updates state in input order. There is no partitioning, task scheduling or merge stage. Time is approximately O(rows + stations × log(stations)) including final sorting; the processor alone is approximately O(rows), assuming ordinary hash-table behavior. No row-level output is performed inside the loop.

## Buffered I/O and streaming

A syscall for every temperature would be expensive. `FileStream` and `StreamWriter` accumulate data into buffers before writing. The generator uses a 1 MiB stream buffer and a 64 Ki-character writer buffer, UTF-8 without BOM, fixed LF line endings and deterministic seeded choices. It writes records as it produces them rather than building a giant collection.

The processor uses `File.ReadLines`, which lazily enumerates lines through a buffered reader. `ReadAllLines` would retain every line and scale memory with input size. `ReadLines` retains the current line, buffers and dictionary. For a fixed station set and bounded record lengths, live managed state is independent of file row count. A million-row file still causes many short-lived allocations; bounded live memory does **not** mean zero allocation.

Buffering also means a decoding error can be detected while reading ahead. Files are assumed stable during a run. Generation closes and flushes its writer before stopping its timer, but does not request durable `fsync`: completion measures delivery to the operating system, not physical persistence to SSD.

## Exact totals and explicit rounding

Binary floating-point cannot represent most decimal fractions exactly. Repeated double additions can accumulate error. Integer tenths represent each input exactly: 32.5 is 325. A billion measurements at 99.9 sum to 999,000,000,000 tenths, safely within a `long` but far beyond `int`. Count is also a `long` so larger workloads remain representable.

Checked addition throws if an aggregate exceeds representable sum/count. `StationStats.Add` computes both checked results before mutating state. A failed update leaves the previous aggregate intact. The public aggregate constructor rejects nonpositive counts, reversed extrema and a sum whose mean lies outside the extrema.

`decimal.Parse` is intentionally retained as the baseline conversion even though direct integer parsing could be faster. Lexical validation prevents broad `decimal.Parse` syntax from accepting unwanted forms. No input precision is discarded. Mean is sum/count/10 in decimal degrees; formatting rounds once, using midpoint away from zero. For values −0.1 and 0.0 the exact mean is −0.05, displayed as −0.1. A future official-compatible formatter could choose ties toward positive infinity instead, but must preserve a distinct tested contract.

## Managed allocations and garbage collection

Each record allocates its line and two substrings. New stations retain a name, statistics object and dictionary storage. Repeated station substrings usually become unreachable after the lookup. Generator temperature formatting also creates short-lived strings. These choices favor clarity over speed in Lesson 1.

The garbage collector reclaims unreachable objects, generally collecting young generations more often than old ones. MemoryDiagnoser reports total managed allocation per complete processing operation and GC collections normalized per 1,000 operations. Those counters describe allocation pressure, not the peak live heap or process RSS. CLI `allocated_bytes` uses process-wide `GC.GetTotalAllocatedBytes` around the processor call; startup allocation is excluded, and background runtime activity may contribute. It is a useful observation, while BenchmarkDotNet provides the repeated comparison.

RSS also includes runtime code, stacks, native buffers, GC segments and mappings. A relatively flat RSS across larger files supports the streaming design, but is not proof of a strict bound. The source establishes the retained-state model. Unbounded station cardinality or maliciously long records can grow memory and remain known limitations.

## Dictionary aggregation

`Dictionary<string, StationStats>` uses a hash to locate a station and ordinal comparison to confirm equality. `StringComparer.Ordinal` avoids locale-dependent equality: `Goma` and `goma` remain different stations. A mutable statistics object avoids reassigning a large value type after each lookup. One ordinary dictionary with ordinary string keys is enough for a readable baseline; no custom hash table is justified yet.

Final ordering is separate from aggregation. Sorting once over stations is cheaper and simpler than maintaining a sorted collection on every input row. Station names are not normalized: canonically equivalent Unicode spellings can remain distinct keys.

## What the benchmark measures

The measured operation includes file open, buffered reading/decoding, validation/parsing, dictionary work and result creation. It excludes generation, CLI startup, sorting and printing. Global setup generates one file per row-count case, outside measured iterations; cleanup removes it. BenchmarkDotNet consumes the returned result, preventing dead-code elimination.

Release builds enable compiler and JIT optimizations that Debug measurements do not represent. Running without a debugger prevents debugger effects. BenchmarkDotNet performs pilot work, warmups and repeated measurements in a child process. The recorded modest configuration uses one launch, three warmup iterations and five measurement iterations per size; each iteration may contain many complete processing operations. Mean and standard deviation come from those actual measurements. Five iterations are useful for a lesson, not a comprehensive statistical characterization of the machine.

On macOS, freshly generated files are normally already in the filesystem cache, and repeated reads warm it further. Consequently, these experiments largely measure decoding, parsing, allocation and dictionary work against cached input. No system cache purge was performed. CLI scaling durations also differ from steady-state BDN results because they include cold JIT behavior in each new process. Compare like with like, and keep the raw reports.

## Read the evidence before optimizing

The measured allocation-per-row can establish whether string allocation scales with row count. Relative time/row across sizes shows whether throughput is approximately linear over this range. These are observations; without a CPU profile, statements about the exact share of time in decimal parsing, hashing or GC remain hypotheses.

For Lesson 2, first profile the baseline on the same fixed workloads, then consider parsing directly to integer tenths and avoiding substring allocations. Protect every current parsing/rounding/error test, rerun the same benchmark configuration and compare distributions and allocated bytes. The original baseline deliberately excludes Spans, parallelism, SIMD, unsafe code and custom hash tables. A subsequent requested extension adds a separate Span-based processor and measures it against that unchanged baseline; no unsafe code, manual SIMD or parallel processing was added.


## Requested extension: pooled buffers and Spans

`process` still runs the original allocation-heavy baseline. `process-fast` uses `OptimizedProcessor`, which rents a character buffer, reads chunks, and passes each record as a `ReadOnlySpan<char>`. It advances indices through the chunk and copies only an unfinished tail. A long record grows the reusable buffer; ordinary row count does not. A `finally` block returns the buffer, and `using` disposes the reader and stream on success or failure.

The temperature parser validates ASCII digits and builds integer tenths directly. Dictionary alternate lookup accepts the station span; an owned station string is created only when a new station appears. Existing checked `StationStats` still owns sum/count/min/max. Malformed records use the original parser's error path to preserve its contract. Strict decoding and delimiter handling remain required even when they cost time.

Rust now follows a similar ownership model with a reusable record vector, borrowed key lookups and checked integer arithmetic. Python retains its buffered text iterator, context-managed file and managed strings, while using built-in ASCII/digit checks to reduce Python-level loops and temporary objects. These choices fit each runtime; they are not identical machine instructions or proof that one language is universally faster.

The benchmark measures both .NET implementations under JIT and Native AOT. A separate harness compares complete .NET/Rust/Python CLI invocations, including startup and output. Native AOT's startup advantage can be substantial even if JIT wins the warmed inner-loop measurement. Follow [the full run guide](how-to-run.md), and compare only results with matching methodology.
