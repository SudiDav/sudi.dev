#!/usr/bin/env bash
# yellowdot-os PreToolUse guard (Claude Code and Codex).
#
# Blocks a Write/Edit (Claude Code) or apply_patch (Codex) whose NEW content
# contains a full subscriber MSISDN in E.164 form for our operator markets,
# or a well-known secret format. Only new content is scanned (for patches:
# the added lines), so an edit that removes a leak is never blocked. Shell
# commands are scanned only when they are a git commit (the message).
# Exit 2 blocks the tool call and stderr is shown to the agent as the reason.
# Unparseable input or a missing python3 fails open: the guard must never
# brick every edit. Standards: msisdn-pii.md, secrets-policy.md.
#
# Synthetic test data: add `yellowdot-os:allow-msisdn` on the same line.

if ! command -v python3 >/dev/null 2>&1; then
    echo "yellowdot-os guard: python3 not found; MSISDN/secret check skipped" >&2
    exit 0
fi

read -r -d '' GUARD_PY <<'PY'
import json, re, sys

try:
    payload = json.load(sys.stdin)
    tool_input = payload.get("tool_input") or {}
except Exception:
    sys.exit(0)

NEW_TEXT_KEYS = {"content", "contents", "new_string", "newString", "new_str", "file_text", "text"}

def new_text(node):
    if isinstance(node, dict):
        for key, value in node.items():
            if key in NEW_TEXT_KEYS and isinstance(value, str):
                yield None, value
            elif isinstance(value, (dict, list)):
                yield from new_text(value)
    elif isinstance(node, list):
        for item in node:
            yield from new_text(item)

def patch_additions(patch):
    # Codex apply_patch text: "*** Add File: p" / "*** Update File: p" headers,
    # added lines start with "+". Yields (path, added text) per file.
    path, added = None, []
    for raw in patch.splitlines():
        if raw.startswith(("*** Add File: ", "*** Update File: ")):
            if path and added:
                yield path, "\n".join(added)
            path, added = raw.split(": ", 1)[1], []
        elif raw.startswith("*** Move to: "):
            continue
        elif raw.startswith("*** "):
            if path and added:
                yield path, "\n".join(added)
            path, added = None, []
        elif path and raw.startswith("+"):
            added.append(raw[1:])
    if path and added:
        yield path, "\n".join(added)

COMMIT = "commit message"

def pieces(tool_input):
    patch = tool_input.get("command") or tool_input.get("patch") or tool_input.get("input")
    if isinstance(patch, str) and "*** Begin Patch" in patch:
        yield from patch_additions(patch)
    elif isinstance(tool_input.get("command"), str):
        if re.search(r"\bgit\b[^\n;&|]*\bcommit\b", tool_input["command"]):
            yield COMMIT, tool_input["command"]
    else:
        yield from new_text(tool_input)

MSISDN = re.compile(
    r"(?<![0-9A-Za-z])\+?(?:27\d{9}|233\d{9}|234\d{10}|225\d{10}|231\d{7,9}|24[23]\d{9})(?![0-9A-Za-z])"
)
SECRETS = [
    ("private key", re.compile(r"-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----")),
    ("AWS access key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("GitHub token", re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})")),
    ("Stripe live key", re.compile(r"\bsk_live_[A-Za-z0-9]{16,}")),
    ("Anthropic API key", re.compile(r"\bsk-ant-[A-Za-z0-9_-]{20,}")),
    ("Slack token", re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}")),
    ("hardcoded credential", re.compile(
        r"(?i)\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|client[_-]?secret)\b[\"']?\s*[:=]\s*[\"'][^\"'\s$]{8,}[\"']"
    )),
]

default_path = tool_input.get("file_path") or tool_input.get("path") or "(unknown file)"
problems, paths = [], []
for piece_path, text in pieces(tool_input):
    where = piece_path or default_path
    for number, line in enumerate(text.splitlines(), 1):
        found = []
        if MSISDN.search(line) and "yellowdot-os:allow-msisdn" not in line:
            found.append("looks like a full MSISDN - mask it (****1234) or keep it out of the repo")
        for label, pattern in SECRETS:
            if pattern.search(line):
                found.append(f"looks like a {label} secret - read it from the environment or a secret store")
        for reason in found:
            if piece_path == COMMIT:
                label = COMMIT
            else:
                label = f"line {number}" if piece_path is None else f"{where}, added line {number}"
            problems.append(f"{label}: {reason}")
            if where not in paths:
                paths.append(where)

if problems:
    if paths == [COMMIT]:
        print("yellowdot-os guard blocked this commit:", file=sys.stderr)
    else:
        print(f"yellowdot-os guard blocked this write to {', '.join(paths)}:", file=sys.stderr)
    for problem in problems[:5]:
        print(f"  - {problem}", file=sys.stderr)
    print("See yellowdot-os/standards/global/msisdn-pii.md and secrets-policy.md. "
          "Synthetic test numbers: add 'yellowdot-os:allow-msisdn' on that line.", file=sys.stderr)
    sys.exit(2)
PY

payload=$(cat)
# Fast path: shell commands other than git commit are never scanned.
if [[ "$payload" == *'"command"'* && "$payload" != *"*** Begin Patch"* && "$payload" != *commit* ]]; then
    exit 0
fi
printf '%s' "$payload" | python3 -c "$GUARD_PY"
