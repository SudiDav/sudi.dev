#!/usr/bin/env bash
# yellowdot-os SubagentStart/SubagentStop hook (Claude Code and Codex).
#
# Makes agent work visible while it happens: when a yellowdot-os builder or
# reviewer starts or finishes, the developer sees a one-line message (with
# the agent's RESULT/VERDICT and how long it ran), and the same line is
# appended to yellowdot-os/.progress/progress.log for `tail -f`.
# Informational only: it always exits 0 and never blocks an agent.

command -v python3 >/dev/null 2>&1 || exit 0

read -r -d '' PROGRESS_PY <<'PY'
import json, os, re, sys, time

AGENTS = {"prd-implementer", "reviewer-ac-fidelity", "reviewer-standards", "reviewer-security-pii"}

try:
    payload = json.load(sys.stdin)
except Exception:
    sys.exit(0)

event = payload.get("hook_event_name", "")
name = str(payload.get("agent_type", "")).split(":")[-1]
agent_id = re.sub(r"[^A-Za-z0-9_.-]", "_", str(payload.get("agent_id", "agent")))
if name not in AGENTS or event not in ("SubagentStart", "SubagentStop"):
    sys.exit(0)

project = os.environ.get("CLAUDE_PROJECT_DIR") or payload.get("cwd") or os.getcwd()
log_dir = os.path.join(project, "yellowdot-os", ".progress")
logging = os.path.isdir(os.path.join(project, "yellowdot-os"))
if logging:
    os.makedirs(log_dir, exist_ok=True)
    ignore = os.path.join(log_dir, ".gitignore")
    if not os.path.exists(ignore):
        with open(ignore, "w") as handle:
            handle.write("*")
stamp = time.strftime("%H:%M:%S")
start_file = os.path.join(log_dir, agent_id + ".start")

def summary(message):
    result = re.search(r"^RESULT:\s*(\S+)", message, re.M)
    if result:
        item = re.search(r"^Item:\s*(\S+)", message, re.M)
        return "RESULT: " + result.group(1) + (f" · item {item.group(1)}" if item else ""), result.group(1) == "done"
    verdict = re.search(r"^VERDICT:\s*(pass|fail)", message, re.M)
    if verdict:
        serious = len(re.findall(r"^- \[(?:blocker|major)\]", message, re.M))
        extra = f" · {serious} blocker/major" if serious else ""
        return "VERDICT: " + verdict.group(1) + extra, verdict.group(1) == "pass"
    return "finished", True

if event == "SubagentStart":
    if logging:
        with open(start_file, "w") as handle:
            handle.write(str(time.time()))
    message = f"▶ yellowdot-os: {name} started ({stamp})"
    line = f"{stamp} started {name} [{agent_id}]"
else:
    elapsed = ""
    if logging and os.path.exists(start_file):
        try:
            seconds = int(time.time() - float(open(start_file).read().strip()))
            elapsed = f" ({seconds // 60}m {seconds % 60}s)" if seconds >= 60 else f" ({seconds}s)"
        finally:
            os.remove(start_file)
    text, ok = summary(str(payload.get("last_assistant_message", "")))
    message = f"{'✓' if ok else '✗'} yellowdot-os: {name} finished — {text}{elapsed}"
    line = f"{stamp} finished {name} [{agent_id}] — {text}{elapsed}"

if logging:
    with open(os.path.join(log_dir, "progress.log"), "a") as handle:
        handle.write(line + "\n")
print(json.dumps({"systemMessage": message}, ensure_ascii=False))
PY

python3 -c "$PROGRESS_PY" 2>/dev/null
exit 0
