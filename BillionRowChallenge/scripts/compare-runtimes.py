#!/usr/bin/env python3
"""Verify four sequential processors, then compare complete CLI invocations.

Standard library only. One warmup and five measured runs per size and engine.
No billion-row generation. CPU/RSS observations use macOS /usr/bin/time -l.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import statistics
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
ROWS = (10_000, 100_000, 1_000_000)
REPEATS = 5
ENGINES = {
    "dotnet-jit": [shutil.which("dotnet") or "dotnet", str(ROOT / "src/BillionRows.Cli/bin/Release/net10.0/BillionRows.Cli.dll")],
    "dotnet-aot": [str(ROOT / "artifacts/native-aot/BillionRows.Cli")],
    "rust": [str(ROOT / "comparisons/rust/target/release/billion-rows-rust")],
    "python": [sys.executable, str(ROOT / "comparisons/python/processor.py")],
}


def invoke(engine, *arguments, timed=False):
    if engine.startswith("dotnet-") and arguments and arguments[0] == "process":
        arguments = ("process-fast",) + arguments[1:]
    command = ENGINES[engine] + list(map(str, arguments))
    if timed:
        command = ["/usr/bin/time", "-l"] + command
    start = time.perf_counter_ns()
    child = subprocess.run(command, cwd=ROOT, text=True, encoding="utf-8", capture_output=True)
    elapsed = (time.perf_counter_ns() - start) / 1_000_000_000
    return child, elapsed


def verify():
    checks = []
    with tempfile.TemporaryDirectory(prefix="brc-parity-") as directory:
        directory = Path(directory)
        fixtures = [
            ("empty", b"", "{}\n", 0),
            ("bom-only", b"\xef\xbb\xbf", "{}\n", 0),
            ("singleton", b"A;1.0", "{A=1.0/1.0/1.0}\n", 0),
            ("rounding", b"z;1.0\na;-0.1\na;0.0\nZ;2.0\n", "{Z=2.0/2.0/2.0, a=-0.1/-0.1/0.0, z=1.0/1.0/1.0}\n", 0),
            ("crlf", b"A;-99.9\r\nA;99.9\r\n", "{A=-99.9/0.0/99.9}\n", 0),
            ("cr", b"A;1.0\rA;2.0\r", "{A=1.0/1.5/2.0}\n", 0),
            ("unicode", "\ufeffÉquateur;0.0\nÉquateur;-0.0\n".encode(), "{Équateur=0.0/0.0/0.0}\n", 0),
            ("ordinal", "\ue000;1.0\n😀;2.0\n".encode(), "{😀=2.0/2.0/2.0, \ue000=1.0/1.0/1.0}\n", 0),
            ("boundary", (("é" * 50) + ";1.0\n").encode(), "{" + ("é" * 50) + "=1.0/1.0/1.0}\n", 0),
        ]
        invalid = [b"A", b"A;1.00", b"A;+1.0", b"A; 1.0", b"A;100.0", b"A;214748364.8", b"A;1,0", b"A;1e0", b"A;1.0;extra", b";1.0", b"\n", b"A\x01;1.0", b"A;1.0\ninvalid", b"\xef\xbb\xbf\xc3(;1.0\n", b"A;1.0\n\xc3", "é".encode() * 51 + b";1.0", "A;1.0\n".encode("utf-16"), "A;1.0\n".encode("utf-32")]
        fixtures.extend((f"invalid-{i}", content, "", 1) for i, content in enumerate(invalid))
        for name, content, expected, exit_code in fixtures:
            path = directory / name
            path.write_bytes(content)
            for engine in ENGINES:
                child, _ = invoke(engine, "process", path)
                if child.returncode != exit_code or child.stdout != expected or (exit_code and not child.stderr):
                    raise AssertionError(f"{engine}/{name}: exit={child.returncode}, stdout={child.stdout!r}, stderr={child.stderr!r}")
                checks.append({"engine": engine, "fixture": name, "exit": child.returncode})
        for engine in ENGINES:
            child, _ = invoke(engine)
            assert child.returncode == 2 and not child.stdout, f"Usage contract: {engine}"
            child, _ = invoke(engine, "process", directory / "missing")
            assert child.returncode == 1 and not child.stdout, f"Missing-file contract: {engine}"
        for engine in ("dotnet-jit", "dotnet-aot"):
            path = directory / (engine + "-generated")
            child, _ = invoke(engine, "generate", 10_000, path, 42)
            assert child.returncode == 0, child.stderr
        assert (directory / "dotnet-jit-generated").read_bytes() == (directory / "dotnet-aot-generated").read_bytes()
    return checks


def format_tenths(value):
    return ("-" if value < 0 else "") + f"{abs(value) // 10}.{abs(value) % 10}"


def oracle(path):
    stations = {}
    digest = hashlib.sha256()
    rows = 0
    with path.open("rb") as source:
        for line in source:
            digest.update(line)
            name, value = line.rstrip(b"\n").decode("utf-8").split(";")
            assert re.fullmatch(r"-?[0-9]+\.[0-9]", value)
            tenths = int(value.replace(".", ""))
            assert -999 <= tenths <= 999
            if name not in stations:
                stations[name] = [tenths, tenths, tenths, 1]
            else:
                stats = stations[name]
                stats[0] = min(stats[0], tenths)
                stats[1] = max(stats[1], tenths)
                stats[2] += tenths
                stats[3] += 1
            rows += 1
    output = []
    for name in sorted(stations, key=lambda n: n.encode("utf-16-be")):
        low, high, total, count = stations[name]
        rounded, remainder = divmod(abs(total), count)
        if remainder * 2 >= count:
            rounded += 1
        if total < 0:
            rounded = -rounded
        output.append(f"{name}={format_tenths(low)}/{format_tenths(rounded)}/{format_tenths(high)}")
    return rows, digest.hexdigest(), "{" + ", ".join(output) + "}\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify-only", action="store_true")
    options = parser.parse_args()
    checks = verify()
    print(f"PASS: {len(checks)} fixture/engine combinations, usage/missing-file exits, and JIT/AOT seed bytes", flush=True)
    output = ROOT / "data/runtime-comparison.json"
    report = {"metric": "end-to-end wall time including process startup and output, via /usr/bin/time wrapper", "dotnet_command": "process-fast (Span processor)", "warmups": 1, "repeats": REPEATS, "fixtures": checks, "experiments": []}
    output.parent.mkdir(exist_ok=True)
    if options.verify_only:
        output.write_text(json.dumps(report, indent=2) + "\n")
        return
    assert shutil.disk_usage(ROOT).free > 1_073_741_824 + sum(ROWS) * 32, "Insufficient disk reserve"
    for rows in ROWS:
        path = ROOT / f"data/measurements-{rows}.txt"
        if not path.exists():
            child, _ = invoke("dotnet-jit", "generate", rows, path, 42)
            assert child.returncode == 0, child.stderr
        actual_rows, digest, expected = oracle(path)
        assert actual_rows == rows
        for engine in ENGINES:
            child, _ = invoke(engine, "process", path)
            assert child.returncode == 0 and child.stdout == expected, f"Warmup correctness: {engine}/{rows}"
        samples = {engine: [] for engine in ENGINES}
        engines = list(ENGINES)
        for repeat in range(REPEATS):
            # Rotate order to avoid consistently favoring one engine's position.
            order = engines[repeat % len(engines):] + engines[:repeat % len(engines)]
            for engine in order:
                child, elapsed = invoke(engine, "process", path, timed=True)
                assert child.returncode == 0 and child.stdout == expected, f"Measured correctness: {engine}/{rows}"
                rss = re.search(r"(\d+)\s+maximum resident set size", child.stderr)
                cpu = re.search(r"([\d.]+) real\s+([\d.]+) user\s+([\d.]+) sys", child.stderr)
                samples[engine].append({"wall_seconds": elapsed, "peak_rss_bytes": int(rss[1]) if rss else None,
                                        "user_seconds": float(cpu[2]) if cpu else None, "system_seconds": float(cpu[3]) if cpu else None})
        for engine, runs in samples.items():
            mean = statistics.mean(run["wall_seconds"] for run in runs)
            record = {"rows": rows, "bytes": path.stat().st_size, "sha256": digest, "engine": engine, "runs": runs,
                      "mean_seconds": mean, "stddev_seconds": statistics.stdev(run["wall_seconds"] for run in runs), "rows_per_second": rows / mean}
            report["experiments"].append(record)
            print(f"{rows:>9,} {engine:>11}: {mean:.6f}s {record['rows_per_second']:,.0f}rows/s", flush=True)
        output.write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
