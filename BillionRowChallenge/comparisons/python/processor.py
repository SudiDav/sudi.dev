#!/usr/bin/env python3
"""Sequential, streaming weather-station aggregation for the comparison suite."""

import codecs
import sys
import time
import unicodedata
from dataclasses import dataclass


INT64_MAX = (1 << 63) - 1
INT64_MIN = -(1 << 63)
USAGE = "Usage:\n  process <input-path>\n  --help"


class InputError(ValueError):
    """An input record or encoding does not meet the file contract."""


@dataclass
class Stats:
    minimum: int
    maximum: int
    total: int
    count: int

    def add(self, tenths):
        next_total = self.total + tenths
        next_count = self.count + 1
        if next_total < INT64_MIN or next_total > INT64_MAX:
            raise OverflowError("signed 64-bit sum overflow")
        if next_count > INT64_MAX:
            raise OverflowError("signed 64-bit count overflow")
        self.total = next_total
        self.count = next_count
        if tenths < self.minimum:
            self.minimum = tenths
        if tenths > self.maximum:
            self.maximum = tenths

    @staticmethod
    def _format_tenths(value):
        sign = "-" if value < 0 else ""
        absolute = abs(value)
        return "{}{}.{}".format(sign, absolute // 10, absolute % 10)

    def render(self):
        magnitude, remainder = divmod(abs(self.total), self.count)
        if remainder * 2 >= self.count:
            magnitude += 1
        mean = -magnitude if self.total < 0 else magnitude
        return "{}/{}/{}".format(
            self._format_tenths(self.minimum),
            self._format_tenths(mean),
            self._format_tenths(self.maximum),
        )


@dataclass
class ProcessingResult:
    stations: dict
    row_count: int
    elapsed: float

    @property
    def rows_per_second(self):
        return self.row_count / self.elapsed if self.elapsed > 0 else 0

    def render(self):
        ordered = sorted(self.stations.items(), key=lambda pair: pair[0].encode("utf-16-be"))
        return "{" + ", ".join("{}={}".format(name, stats.render()) for name, stats in ordered) + "}"


def _invalid_utf8_line(path):
    decoder = codecs.getincrementaldecoder("utf-8")("strict")
    position = 0
    invalid_offset = 0
    with open(path, "rb") as source:
        while True:
            chunk = source.read(65536)
            if not chunk:
                pending = decoder.getstate()[0]
                try:
                    decoder.decode(b"", final=True)
                except UnicodeDecodeError as exception:
                    invalid_offset = position - len(pending) + exception.start
                break
            pending = decoder.getstate()[0]
            try:
                decoder.decode(chunk, final=False)
            except UnicodeDecodeError as exception:
                invalid_offset = position - len(pending) + exception.start
                break
            position += len(chunk)

    line = 1
    previous_carriage_return = False
    remaining = invalid_offset
    with open(path, "rb") as source:
        while remaining:
            chunk = source.read(min(65536, remaining))
            if not chunk:
                break
            for byte in chunk:
                if byte == 13:
                    line += 1
                    previous_carriage_return = True
                elif byte == 10:
                    if not previous_carriage_return:
                        line += 1
                    previous_carriage_return = False
                else:
                    previous_carriage_return = False
            remaining -= len(chunk)
    return line


def parse_line(line, line_number=1):
    delimiter = line.find(";")
    if delimiter <= 0 or delimiter != line.rfind(";"):
        raise InputError("Invalid record on line {}: expected exactly one semicolon and a nonempty station name.".format(line_number))

    station = line[:delimiter]
    is_ascii_station = station.isascii()
    station_too_long = len(station) > 100 if is_ascii_station else len(station.encode("utf-8", "strict")) > 100
    has_control = not station.isprintable() if is_ascii_station else any(
        unicodedata.category(character) == "Cc" for character in station
    )
    if station_too_long or has_control:
        raise InputError("Invalid record on line {}: station name exceeds 100 UTF-8 bytes or contains a control character.".format(line_number))

    text = line[delimiter + 1:]
    start = 1 if text.startswith("-") else 0
    point = text.find(".")
    if point <= start or point != text.rfind(".") or point != len(text) - 2:
        raise InputError("Invalid record on line {}: temperature must use ASCII digits and exactly one fractional digit.".format(line_number))
    integer_text = text[start:point]
    fraction_text = text[point + 1:]
    if not text.isascii() or not integer_text.isdigit() or not fraction_text.isdigit():
        raise InputError("Invalid record on line {}: temperature must use ASCII digits and exactly one fractional digit.".format(line_number))

    significant_integer = integer_text.lstrip("0")
    if len(significant_integer) > 2:
        raise InputError("Invalid record on line {}: temperature is outside -99.9 through 99.9.".format(line_number))
    tenths = int(significant_integer or "0") * 10 + ord(fraction_text) - ord("0")
    if start:
        tenths = -tenths
    if tenths < -999 or tenths > 999:
        raise InputError("Invalid record on line {}: temperature is outside -99.9 through 99.9.".format(line_number))
    return station, tenths


def process(path):
    started = time.perf_counter()
    stations = {}
    row_count = 0
    try:
        # newline=None enables universal newline handling while iteration remains buffered.
        with open(path, "r", encoding="utf-8-sig", errors="strict", newline=None) as source:
            for line_number, line in enumerate(source, 1):
                station, tenths = parse_line(line.rstrip("\n"), line_number)
                next_row_count = row_count + 1
                if next_row_count > INT64_MAX:
                    raise OverflowError("signed 64-bit row count overflow")
                stats = stations.get(station)
                if stats is None:
                    stations[station] = Stats(tenths, tenths, tenths, 1)
                else:
                    stats.add(tenths)
                row_count = next_row_count
    except UnicodeDecodeError as error:
        raise InputError("Invalid UTF-8 on line {}.".format(_invalid_utf8_line(path))) from error
    elapsed = time.perf_counter() - started
    return ProcessingResult(stations, row_count, elapsed)


def _invalid_arguments(error, message):
    error.write("Error: {}\n{}\n".format(message, USAGE))
    return 2


def main(argv=None, output=None, error=None):
    argv = sys.argv[1:] if argv is None else argv
    output = sys.stdout if output is None else output
    error = sys.stderr if error is None else error
    if argv in (["--help"], ["-h"]):
        output.write(USAGE + "\n")
        return 0
    if len(argv) != 2 or argv[0] != "process" or not argv[1].strip():
        return _invalid_arguments(error, "Unknown command or invalid number of arguments.")
    try:
        result = process(argv[1])
        output.write(result.render() + "\n")
        error.write("process rows={} stations={} seconds={:.6f} rows_per_second={:.0f}\n".format(
            result.row_count, len(result.stations), result.elapsed, result.rows_per_second
        ))
        return 0
    except (OSError, InputError, OverflowError, UnicodeError) as exception:
        error.write("Error: {}\n".format(exception))
        return 1


if __name__ == "__main__":
    sys.exit(main())
