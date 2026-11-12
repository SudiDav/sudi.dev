import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from processor import Stats, parse_line, process


class ParserTests(unittest.TestCase):
    def test_parses_valid_and_normalizes_negative_zero(self):
        self.assertEqual(("Équateur", 0), parse_line("Équateur;-0.0", 1))
        self.assertEqual(("A", -999), parse_line("A;-0099.9", 2))

    def test_rejects_malformed_rows(self):
        for line in (
            "", ";1.0", "A", "A;", "A;1.0;extra", "A; 1.0", "A;+1.0",
            "A;1", "A;1.00", "A;1,0", "A;1e0", "A;100.0", "A;-100.0",
            "A;--1.0", "A;١.٠", "A;١.1", "A\x01;1.0", "A\x85;1.0",
            "A;214748364.8",
        ):
            with self.subTest(line=line), self.assertRaises(ValueError):
                parse_line(line, 17)

    def test_station_utf8_limit_and_empty_name(self):
        self.assertEqual("é" * 50, parse_line("é" * 50 + ";0.0")[0])
        with self.assertRaises(ValueError):
            parse_line("é" * 51 + ";0.0")
        with self.assertRaises(ValueError):
            parse_line(";0.0")


class ProcessingTests(unittest.TestCase):
    def write_bytes(self, data):
        temporary = tempfile.NamedTemporaryFile(delete=False)
        try:
            temporary.write(data)
            return temporary.name
        finally:
            temporary.close()

    def test_aggregates_rounds_away_from_zero_and_sorts_utf16_ordinal(self):
        path = self.write_bytes("😀;0.0\n\ue000;0.0\nB;-0.1\nB;0.0\nP;0.0\nP;0.1\n".encode())
        try:
            result = process(path)
            self.assertEqual(6, result.row_count)
            self.assertEqual(
                "{B=-0.1/-0.1/0.0, P=0.0/0.1/0.1, 😀=0.0/0.0/0.0, \ue000=0.0/0.0/0.0}",
                result.render(),
            )
        finally:
            os.unlink(path)

    def test_empty_input(self):
        path = self.write_bytes(b"")
        try:
            self.assertEqual("{}", process(path).render())
        finally:
            os.unlink(path)

    def test_bom_only_file_is_empty_input(self):
        path = self.write_bytes(b"\xef\xbb\xbf")
        try:
            result = process(path)
            self.assertEqual(0, result.row_count)
            self.assertEqual("{}", result.render())
        finally:
            os.unlink(path)

    def test_single_row_and_temperature_extrema(self):
        path = self.write_bytes(b"Only;-99.9\nHigh;99.9")
        try:
            result = process(path)
            self.assertEqual(2, result.row_count)
            self.assertEqual("{High=99.9/99.9/99.9, Only=-99.9/-99.9/-99.9}", result.render())
        finally:
            os.unlink(path)

    def test_bom_and_universal_line_endings_and_unterminated_last_row(self):
        path = self.write_bytes(b"\xef\xbb\xbfA;1.0\rB;2.0\r\nC;3.0")
        try:
            result = process(path)
            self.assertEqual(3, result.row_count)
            self.assertEqual("{A=1.0/1.0/1.0, B=2.0/2.0/2.0, C=3.0/3.0/3.0}", result.render())
        finally:
            os.unlink(path)

    def test_invalid_utf8_and_utf16_bom_rejected(self):
        for data in (b"A;1.0\n\xc3(", b"\xff\xfeA\x00;\x001\x00.\x000\x00"):
            path = self.write_bytes(data)
            try:
                with self.subTest(data=data), self.assertRaises((ValueError, UnicodeError)) as raised:
                    process(path)
                if data.startswith(b"A;"):
                    self.assertIn("line 2", str(raised.exception))
            finally:
                os.unlink(path)

    def test_stats_overflow_is_atomic(self):
        maximum = (1 << 63) - 1
        stats = Stats(999, 999, maximum - 998, 1)
        before = (stats.minimum, stats.maximum, stats.total, stats.count)
        with self.assertRaises(OverflowError):
            stats.add(999)
        self.assertEqual(before, (stats.minimum, stats.maximum, stats.total, stats.count))

        stats = Stats(0, 0, 0, maximum)
        before = (stats.minimum, stats.maximum, stats.total, stats.count)
        with self.assertRaises(OverflowError):
            stats.add(0)
        self.assertEqual(before, (stats.minimum, stats.maximum, stats.total, stats.count))


class CliTests(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run(
            [sys.executable, str(Path(__file__).with_name("processor.py")), *args],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

    def test_process_success_and_diagnostics(self):
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", delete=False) as source:
            source.write("B;1.0\nA;2.0\n")
            path = source.name
        try:
            result = self.run_cli("process", path)
            self.assertEqual(0, result.returncode)
            self.assertEqual("{A=2.0/2.0/2.0, B=1.0/1.0/1.0}\n", result.stdout)
            self.assertRegex(result.stderr, r"^process rows=2 stations=2 seconds=.* rows_per_second=.*\n$")
        finally:
            os.unlink(path)

    def test_failure_has_no_partial_stdout(self):
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", delete=False) as source:
            source.write("A;1.0\ninvalid\n")
            path = source.name
        try:
            result = self.run_cli("process", path)
            self.assertEqual(1, result.returncode)
            self.assertEqual("", result.stdout)
            self.assertIn("Error:", result.stderr)
        finally:
            os.unlink(path)

    def test_help_and_invalid_arguments(self):
        self.assertEqual(0, self.run_cli("--help").returncode)
        self.assertEqual(2, self.run_cli("bad").returncode)


if __name__ == "__main__":
    unittest.main()
