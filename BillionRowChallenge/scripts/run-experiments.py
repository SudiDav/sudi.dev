#!/usr/bin/env python3
"""Run only Lesson 1's authorized sizes, verifying with an independent oracle.

Requires Python 3 and a prior Release build. Retains ignored data and raw evidence.
Uses macOS /usr/bin/time -l; deliberately does not purge filesystem caches.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
from decimal import Decimal, ROUND_HALF_UP

ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / "src/BillionRows.Cli/bin/Release/net10.0/BillionRows.Cli.dll"
ROWS = (10_000, 100_000, 1_000_000, 10_000_000)
DATA = ROOT / "data"
RESERVE = 1024 ** 3


def run(*args):
    child = subprocess.run(["/usr/bin/time", "-l", "dotnet", str(CLI), *map(str, args)],
                           text=True, capture_output=True, cwd=ROOT, check=True)
    fields = dict(re.findall(r"(\w+)=([^\s]+)", child.stderr.splitlines()[0]))
    rss = re.search(r"(\d+)\s+maximum resident set size", child.stderr)
    cpu = re.search(r"([\d.]+) real\s+([\d.]+) user\s+([\d.]+) sys", child.stderr)
    fields["peak_rss_bytes"] = int(rss[1]) if rss else None
    fields["process_time"] = dict(zip(("wall_seconds", "user_seconds", "system_seconds"), map(float, cpu.groups()))) if cpu else None
    return child.stdout, fields, child.stderr


def oracle(path):
    stations = {}
    count = 0
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for row in source:
            digest.update(row)
            assert row.endswith(b"\n") and b"\r" not in row
            name, value = row[:-1].decode("utf-8").split(";")
            assert re.fullmatch(r"-?[0-9]+\.[0-9]", value)
            tenths = int(value.replace(".", ""))
            assert -999 <= tenths <= 999
            if name not in stations:
                stations[name] = [tenths, tenths, tenths, 1]
            else:
                s = stations[name]
                s[0], s[1], s[2], s[3] = min(s[0], tenths), max(s[1], tenths), s[2] + tenths, s[3] + 1
            count += 1
    def one(value):
        return str(value.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))
    formatted = []
    for name, (low, high, total, n) in sorted(stations.items()):
        mean = Decimal(total) / Decimal(n) / 10
        # Decimal's signed zero differs from .NET decimal's presentation.
        rounded = mean.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
        if rounded == 0:
            rounded = abs(rounded)
        formatted.append(f"{name}={one(Decimal(low)/10)}/{rounded}/{one(Decimal(high)/10)}")
    return count, stations, digest.hexdigest(), "{" + ", ".join(formatted) + "}\n"


def main():
    DATA.mkdir(exist_ok=True)
    required = (sum(ROWS) + max(ROWS)) * 32
    free = shutil.disk_usage(DATA).free
    assert free >= required + RESERVE, f"Need conservative {required} bytes plus 1 GiB reserve; free={free}"
    print(f"Preflight: free={free} estimated_dataset_bytes<={required}", flush=True)
    results = {"preflight_free_bytes": free, "estimated_upper_bound_bytes": required, "experiments": []}
    for rows in ROWS:
        path = DATA / f"measurements-{rows}.txt"
        assert not path.exists(), f"Refusing to overwrite {path}; move prior datasets before rerunning."
        _, generation, gen_log = run("generate", rows, path)
        actual, processing, proc_log = run("process", path)
        count, stations, digest, expected = oracle(path)
        assert count == rows and actual == expected, f"Independent verification failed for {rows} rows"
        duplicate = DATA / "determinism-check.txt"
        run("generate", rows, duplicate)
        repeated_hash = hashlib.sha256()
        with duplicate.open("rb") as source:
            for block in iter(lambda: source.read(1024 * 1024), b""):
                repeated_hash.update(block)
        assert repeated_hash.hexdigest() == digest, f"Seed determinism failed for {rows} rows"
        duplicate.unlink()
        evidence = {"rows": rows, "file_size_bytes": path.stat().st_size, "sha256": digest,
                    "generation": generation, "processing": processing, "oracle_stations": stations,
                    "verified": True}
        results["experiments"].append(evidence)
        (DATA / f"experiment-{rows}.log").write_text(gen_log + proc_log + actual)
        (DATA / "experiment-results.json").write_text(json.dumps(results, indent=2) + "\n")
        print(json.dumps({k: v for k, v in evidence.items() if k != "oracle_stations"}), flush=True)


if __name__ == "__main__":
    main()
