use std::collections::HashMap;
use std::fs::File;
use std::io::{self, BufRead, BufReader};
use std::path::Path;
use std::time::{Duration, Instant};

#[derive(Debug)]
pub struct StationStats {
    min_tenths: i32,
    max_tenths: i32,
    sum_tenths: i64,
    count: i64,
}

impl StationStats {
    fn new(temperature: i32) -> Self {
        Self {
            min_tenths: temperature,
            max_tenths: temperature,
            sum_tenths: i64::from(temperature),
            count: 1,
        }
    }

    fn add(&mut self, temperature: i32) -> Result<(), String> {
        let sum = self
            .sum_tenths
            .checked_add(i64::from(temperature))
            .ok_or_else(|| "temperature sum overflow".to_owned())?;
        let count = self
            .count
            .checked_add(1)
            .ok_or_else(|| "row count overflow".to_owned())?;
        self.sum_tenths = sum;
        self.count = count;
        self.min_tenths = self.min_tenths.min(temperature);
        self.max_tenths = self.max_tenths.max(temperature);
        Ok(())
    }

    fn mean_tenths(&self) -> i128 {
        let sum = i128::from(self.sum_tenths);
        let count = i128::from(self.count);
        let quotient = sum / count;
        let remainder = sum % count;
        if remainder.abs() * 2 >= count {
            quotient + sum.signum()
        } else {
            quotient
        }
    }

    fn formatted(&self) -> String {
        format!(
            "{}/{}/{}",
            format_tenths(i128::from(self.min_tenths)),
            format_tenths(self.mean_tenths()),
            format_tenths(i128::from(self.max_tenths))
        )
    }
}

#[derive(Debug)]
pub struct ProcessingResult {
    pub stations: HashMap<String, StationStats>,
    pub row_count: i64,
    pub elapsed: Duration,
}

impl ProcessingResult {
    pub fn output(&self) -> String {
        let mut names: Vec<&String> = self.stations.keys().collect();
        names.sort_by(|left, right| left.encode_utf16().cmp(right.encode_utf16()));
        let entries = names
            .into_iter()
            .map(|name| format!("{name}={}", self.stations[name].formatted()))
            .collect::<Vec<_>>()
            .join(", ");
        format!("{{{entries}}}\n")
    }

    pub fn rows_per_second(&self) -> f64 {
        if self.elapsed.as_secs_f64() > 0.0 {
            self.row_count as f64 / self.elapsed.as_secs_f64()
        } else {
            0.0
        }
    }
}

pub fn process(path: impl AsRef<Path>) -> Result<ProcessingResult, String> {
    let started = Instant::now();
    let file = File::open(path.as_ref()).map_err(|error| error.to_string())?;
    let mut reader = BufReader::new(file);
    process_reader(&mut reader, started)
}

fn process_reader<R: BufRead>(
    reader: &mut R,
    started: Instant,
) -> Result<ProcessingResult, String> {
    let mut stations = HashMap::<String, StationStats>::new();
    let mut row_count = 0_i64;
    let mut line_number = 0_i64;
    let mut first_record = true;
    let mut after_cr = false;
    let mut record = Vec::new();

    loop {
        let chunk = reader.fill_buf().map_err(|error| error.to_string())?;
        if chunk.is_empty() {
            break;
        }

        let mut consumed = 0;
        while consumed < chunk.len() {
            if after_cr {
                after_cr = false;
                if chunk[consumed] == b'\n' {
                    consumed += 1;
                    continue;
                }
            }

            let remaining = &chunk[consumed..];
            let delimiter = remaining
                .iter()
                .position(|byte| *byte == b'\r' || *byte == b'\n');
            let Some(offset) = delimiter else {
                record.extend_from_slice(remaining);
                consumed = chunk.len();
                break;
            };
            record.extend_from_slice(&remaining[..offset]);
            let delimiter_byte = remaining[offset];
            finish_record(
                &mut record,
                &mut first_record,
                &mut line_number,
                &mut row_count,
                &mut stations,
                true,
            )?;
            consumed += offset + 1;
            if delimiter_byte == b'\r' {
                after_cr = true;
            }
        }
        reader.consume(consumed);
    }

    if !record.is_empty() {
        finish_record(
            &mut record,
            &mut first_record,
            &mut line_number,
            &mut row_count,
            &mut stations,
            false,
        )?;
    }

    Ok(ProcessingResult {
        stations,
        row_count,
        elapsed: started.elapsed(),
    })
}

fn finish_record(
    record: &mut Vec<u8>,
    first_record: &mut bool,
    line_number: &mut i64,
    row_count: &mut i64,
    stations: &mut HashMap<String, StationStats>,
    terminated: bool,
) -> Result<(), String> {
    *line_number = line_number
        .checked_add(1)
        .ok_or_else(|| "line number overflow".to_owned())?;
    if *first_record {
        *first_record = false;
        if record.starts_with(b"\xef\xbb\xbf") {
            record.drain(..3);
        }
    }
    // A preamble with no following bytes is an empty file to StreamReader. With a
    // line terminator it remains an empty record and is rejected below.
    if !terminated && record.is_empty() {
        return Ok(());
    }
    let (station, temperature) = parse_record(record, *line_number)?;
    *row_count = row_count
        .checked_add(1)
        .ok_or_else(|| "row count overflow".to_owned())?;
    if let Some(stats) = stations.get_mut(station) {
        stats
            .add(temperature)
            .map_err(|error| format!("Invalid record on line {}: {error}.", *line_number))?;
    } else {
        stations.insert(station.to_owned(), StationStats::new(temperature));
    }
    record.clear();
    Ok(())
}

fn parse_record(bytes: &[u8], line_number: i64) -> Result<(&str, i32), String> {
    let line =
        std::str::from_utf8(bytes).map_err(|_| format!("Invalid UTF-8 on line {line_number}."))?;
    let delimiter = line.find(';');
    let Some(delimiter) = delimiter else {
        return Err(invalid_line(
            line_number,
            "expected exactly one semicolon and a nonempty station name",
        ));
    };
    if delimiter == 0 || line[delimiter + 1..].contains(';') {
        return Err(invalid_line(
            line_number,
            "expected exactly one semicolon and a nonempty station name",
        ));
    }
    let station = &line[..delimiter];
    if station.len() > 100 || station.chars().any(char::is_control) {
        return Err(invalid_line(
            line_number,
            "station name exceeds 100 UTF-8 bytes or contains a control character",
        ));
    }
    let temperature = parse_temperature(&line[delimiter + 1..])
        .ok_or_else(|| invalid_line(line_number, "temperature must be ASCII, in range -99.9 through 99.9, with exactly one fractional digit"))?;
    Ok((station, temperature))
}

fn parse_temperature(text: &str) -> Option<i32> {
    let bytes = text.as_bytes();
    let negative = bytes.first() == Some(&b'-');
    let start = usize::from(negative);
    if bytes.len() < start + 3 || bytes[bytes.len() - 2] != b'.' {
        return None;
    }
    if bytes[start..bytes.len() - 2].is_empty()
        || !bytes[start..bytes.len() - 2].iter().all(u8::is_ascii_digit)
        || !bytes[bytes.len() - 1].is_ascii_digit()
    {
        return None;
    }
    let mut whole = 0_i32;
    for digit in &bytes[start..bytes.len() - 2] {
        whole = whole
            .checked_mul(10)?
            .checked_add(i32::from(*digit - b'0'))?;
    }
    let mut tenths = whole
        .checked_mul(10)?
        .checked_add(i32::from(bytes[bytes.len() - 1] - b'0'))?;
    if tenths > 999 {
        return None;
    }
    if negative {
        tenths = -tenths;
    }
    Some(tenths)
}

fn invalid_line(line_number: i64, reason: &str) -> String {
    format!("Invalid record on line {line_number}: {reason}.")
}

fn format_tenths(value: i128) -> String {
    let sign = if value < 0 { "-" } else { "" };
    let magnitude = value.abs();
    format!("{sign}{}.{:01}", magnitude / 10, magnitude % 10)
}

pub fn process_cli(args: &[String]) -> (i32, String, String) {
    const USAGE: &str = "Usage:\n  process <input-path>\n  --help\n";
    if args.len() == 1 && (args[0] == "--help" || args[0] == "-h") {
        return (0, USAGE.to_owned(), String::new());
    }
    if args.len() != 2 || args[0] != "process" || args[1].trim().is_empty() {
        return (
            2,
            String::new(),
            format!("Error: Unknown command or invalid number of arguments.\n{USAGE}"),
        );
    }
    match process(&args[1]) {
        Ok(result) => {
            let diagnostic = format!(
                "process rows={} stations={} seconds={:.6} rows_per_second={:.0}\n",
                result.row_count,
                result.stations.len(),
                result.elapsed.as_secs_f64(),
                result.rows_per_second()
            );
            (0, result.output(), diagnostic)
        }
        Err(error) => (1, String::new(), format!("Error: {error}\n")),
    }
}

pub fn run_process_cli(
    args: &[String],
    stdout: &mut impl io::Write,
    stderr: &mut impl io::Write,
) -> i32 {
    let (code, output, diagnostic) = process_cli(args);
    let _ = stdout.write_all(output.as_bytes());
    let _ = stderr.write_all(diagnostic.as_bytes());
    code
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::{AtomicUsize, Ordering};

    static NEXT_FILE: AtomicUsize = AtomicUsize::new(0);

    fn file(bytes: &[u8]) -> std::path::PathBuf {
        let path = std::env::temp_dir().join(format!(
            "billion-rows-rust-test-{}-{}",
            std::process::id(),
            NEXT_FILE.fetch_add(1, Ordering::Relaxed)
        ));
        fs::write(&path, bytes).unwrap();
        path
    }

    #[test]
    fn formats_exact_aggregates_and_ordinal_utf16_sort_order() {
        let path = file("B;1.0\n😀;2.0\n\u{e000};3.0\nA;-0.1\nA;0.0\nA;0.0\n".as_bytes());
        let result = process(&path);
        fs::remove_file(path).unwrap();
        assert_eq!(
            result.unwrap().output(),
            "{A=-0.1/0.0/0.0, B=1.0/1.0/1.0, 😀=2.0/2.0/2.0, \u{e000}=3.0/3.0/3.0}\n"
        );
    }

    #[test]
    fn rounds_positive_and_negative_midpoints_away_from_zero() {
        let path = file(b"positive;0.0\npositive;0.1\nnegative;-0.1\nnegative;0.0\n");
        let result = process(&path);
        fs::remove_file(path).unwrap();
        assert_eq!(
            result.unwrap().output(),
            "{negative=-0.1/-0.1/0.0, positive=0.0/0.1/0.1}\n"
        );
    }

    #[test]
    fn accepts_utf8_bom_crlf_cr_and_unterminated_final_record() {
        let path = file(b"\xef\xbb\xbffirst;1.0\r\nsecond;2.0\rthird;3.0");
        let result = process(&path);
        fs::remove_file(path).unwrap();
        assert_eq!(result.unwrap().row_count, 3);
    }

    #[test]
    fn rejects_temperature_accumulation_overflow() {
        let path = file(b"A;214748364.8\n");
        let result = process(&path);
        fs::remove_file(path).unwrap();
        assert!(result.is_err());
    }

    #[test]
    fn bom_only_input_has_no_records() {
        let path = file(b"\xef\xbb\xbf");
        let result = process(&path);
        fs::remove_file(path).unwrap();
        assert_eq!(result.unwrap().output(), "{}\n");
    }

    #[test]
    fn processes_records_separated_only_by_carriage_returns() {
        let path = file(b"first;1.0\rsecond;2.0\rthird;3.0");
        let source = File::open(&path).unwrap();
        let mut reader = BufReader::with_capacity(1, source);
        let result = process_reader(&mut reader, Instant::now());
        fs::remove_file(path).unwrap();
        assert_eq!(result.unwrap().row_count, 3);
    }

    #[test]
    fn rejects_malformed_encoding_records_and_utf16_bom() {
        for bytes in [
            &b"ok;1.0\nbad;1.00\n"[..],
            b"name;1.0;extra\n",
            b";1.0\n",
            b"name;100.0\n",
            b"name;1.0\n\xff",
            b"\xff\xfe",
            b"name;1.0\n\n",
        ] {
            let path = file(bytes);
            assert!(process(&path).is_err(), "accepted {bytes:?}");
            fs::remove_file(path).unwrap();
        }
    }

    #[test]
    fn rejects_control_and_overlong_station_names() {
        let long_name = format!("{};1.0", "é".repeat(51));
        for contents in [format!("bad\u{7f}name;1.0"), long_name] {
            let path = file(contents.as_bytes());
            assert!(process(&path).is_err());
            fs::remove_file(path).unwrap();
        }
    }

    #[test]
    fn overflow_does_not_mutate_station_statistics() {
        let mut stats = StationStats {
            min_tenths: 0,
            max_tenths: 0,
            sum_tenths: i64::MAX,
            count: 1,
        };
        assert!(stats.add(1).is_err());
        assert_eq!(stats.sum_tenths, i64::MAX);
        assert_eq!(stats.count, 1);

        stats.sum_tenths = 0;
        stats.count = i64::MAX;
        assert!(stats.add(0).is_err());
        assert_eq!(stats.count, i64::MAX);
    }

    #[test]
    fn failed_cli_processing_writes_no_partial_aggregate() {
        let path = file(b"valid;1.0\ninvalid;1.00\n");
        let args = vec!["process".to_owned(), path.to_string_lossy().into_owned()];
        let mut stdout = Vec::new();
        let mut stderr = Vec::new();
        let exit_code = run_process_cli(&args, &mut stdout, &mut stderr);
        fs::remove_file(path).unwrap();
        assert_eq!(exit_code, 1);
        assert!(stdout.is_empty());
        assert!(String::from_utf8(stderr).unwrap().contains("line 2"));
    }

    #[test]
    fn empty_input_is_an_empty_aggregate() {
        let path = file(b"");
        let result = process(&path);
        fs::remove_file(path).unwrap();
        assert_eq!(result.unwrap().output(), "{}\n");
    }
}
