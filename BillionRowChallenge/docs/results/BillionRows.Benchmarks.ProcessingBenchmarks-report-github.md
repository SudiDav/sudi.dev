```

BenchmarkDotNet v0.15.8, macOS Tahoe 26.6 (25G72) [Darwin 25.6.0]
Apple M5 Max, 1 CPU, 18 logical and 18 physical cores
.NET SDK 10.0.101
  [Host]     : .NET 10.0.1 (10.0.1, 10.0.125.57005), Arm64 RyuJIT armv8.0-a
  Job-OIKEGS : .NET 10.0.1 (10.0.1, 10.0.125.57005), Arm64 RyuJIT armv8.0-a

Runtime=.NET 10.0  IterationCount=5  LaunchCount=1  
WarmupCount=3  

```
| Method   | RowCount | Mean        | Error       | StdDev    | Rows/s   | Gen0       | Gen1    | Allocated |
|--------- |--------- |------------:|------------:|----------:|---------:|-----------:|--------:|----------:|
| **Baseline** | **10000**    |    **834.6 μs** |    **24.16 μs** |   **3.74 μs** | **11981136** |   **150.3906** |  **4.8828** |    **1.2 MB** |
| **Baseline** | **100000**   |  **8,291.3 μs** |   **479.13 μs** | **124.43 μs** | **12060828** |  **1484.3750** | **31.2500** |  **11.89 MB** |
| **Baseline** | **1000000**  | **82,439.0 μs** | **2,681.95 μs** | **696.49 μs** | **12130176** | **14833.3333** |       **-** | **118.75 MB** |
