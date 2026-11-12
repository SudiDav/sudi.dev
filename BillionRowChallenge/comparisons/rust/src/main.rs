use std::env;
use std::io;

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    let code = billion_rows_rust::run_process_cli(
        &args,
        &mut io::stdout().lock(),
        &mut io::stderr().lock(),
    );
    std::process::exit(code);
}
