---
name: inject-standards
description: Load the yellowdot-os standards relevant to the current task into context. Use before planning or writing code in a repo that has yellowdot-os/standards/, or when asked which standards apply.
---
<!-- yellowdot-os adapter: claude-code
ask_user=AskUserQuestion
dispatch_one=Task/custom agents
dispatch_parallel=Task/custom agents
read=Read
run_verification=Bash
write_artifact=Write/Edit
-->

# Inject Standards

Inject relevant standards into the current context, formatted appropriately for the situation.

## Usage Modes

This command supports two modes:

### Auto-Suggest Mode (no arguments)

```text
/inject-standards
```

Analyzes context and suggests relevant standards.

### Explicit Mode (with arguments)

```text
/inject-standards api                           # All standards in api/
/inject-standards api/response-format           # Single file
/inject-standards api/response-format api/auth  # Multiple files
/inject-standards root                          # All standards in the root folder
/inject-standards root/naming                   # Single file from root folder
```

Directly injects specified standards without suggestions.

**Note:** `root` is a reserved keyword — it refers to `.md` files directly in `yellowdot-os/standards/` (not in a subfolder).

## Process

### Step 1: Detect Context Scenario

Before injecting standards, determine which scenario we're in. Read the current conversation and check if we're in plan mode.

**Three scenarios:**

1. **Conversation** — Regular chat, implementing code, answering questions
2. **Creating a Skill** — Building a file in the project's installed skills directory (`.claude/skills/` or `.agents/skills/`)
3. **Shaping/Planning** — In plan mode, building a spec, running `/shape-spec`

**Detection logic:**

- If currently in plan mode OR conversation clearly mentions "spec", "plan", "shape" → **Shaping/Planning**
- If conversation clearly mentions creating a skill, editing `.claude/skills/` or `.agents/skills/`, or building a reusable procedure → **Creating a Skill**
- Otherwise → **Ask to confirm** (do not assume)

**If neither skill nor plan is clearly detected**, use ask_user to confirm:

```text
I'll inject the relevant standards. How should I format them?

1. **Conversation** — Read standards into our chat (for implementation work)
2. **Skill** — Output file references to include in a skill you're building
3. **Plan** — Output file references to include in a plan/spec

Which scenario? (1, 2, or 3)
```

Always ask when uncertain — don't assume conversation by default. Exception: if you invoked this skill yourself during implementation (the user did not type `/inject-standards`), use the Conversation scenario and inject without asking.

### Step 2: Read the Index (Auto-Suggest Mode)

Read `yellowdot-os/standards/index.yml` to get the list of available standards and their descriptions.

If index.yml doesn't exist or is empty:

```text
No standards index found. Run /discover-standards first to create standards,
or /index-standards if you have standards files without an index.
```

### Step 3: Analyze Work Context

Look at the current conversation to understand what the user is working on:

- What type of work? (API, database, UI, etc.)
- What technologies mentioned?
- What's the goal?

### Step 4: Match and Suggest

Match index descriptions against the context. use ask_user to present suggestions:

```text
Based on your task, these standards may be relevant:

1. **api/response-format** — API response envelope structure, status codes
2. **api/error-handling** — Error codes, exception handling, error responses
3. **global/naming** — File naming, variable naming conventions

Inject these standards? (yes / just 1 and 3 / add: database/migrations / none)
```

Keep suggestions focused — typically 2-5 standards. Don't overwhelm with too many options.

### Step 5: Inject Based on Scenario

Format the output differently based on the detected scenario:

---

#### Scenario: Conversation

Read the standards and announce them:

```text
I've read the following standards as they are relevant to what we're working on:

--- Standard: api/response-format ---

[full content of the standard file]

--- End Standard ---

--- Standard: api/error-handling ---

[full content of the standard file]

--- End Standard ---

**Key points:**
- All API responses use { success, data, error } envelope
- Error codes follow AUTH_xxx, DB_xxx pattern
```

---

#### Scenario: Creating a Skill

First, use ask_user to determine how to include the standards:

```text
How should these standards be included in your skill?

1. **References** — Add @ file paths that point to the standards (keeps skill lightweight, standards stay in sync)
2. **Copy content** — Paste the full standards content into the skill (self-contained, but won't update if standards change)

Which approach? (1 or 2)
```

**If References (option 1):**

```text
Be sure to include references to the following standards files in the appropriate location in the file(s) that make up this skill:

@yellowdot-os/standards/api/response-format.md
@yellowdot-os/standards/api/error-handling.md
@yellowdot-os/standards/global/naming.md

These standards cover:
- API response envelope structure, status codes
- Error codes, exception handling, error responses
- File naming, variable naming conventions
```

**If Copy content (option 2):**

```text
Include the following standards content in your skill:

--- Standard: api/response-format ---

[full content of the standard file]

--- End Standard ---

--- Standard: api/error-handling ---

[full content of the standard file]

--- End Standard ---

These standards cover:
- API response envelope structure, status codes
- Error codes, exception handling, error responses
- File naming, variable naming conventions
```

---

#### Scenario: Shaping/Planning

First, use ask_user to determine how to include the standards:

```text
How should these standards be included in your plan?

1. **References** — Add @ file paths that point to the standards (keeps plan lightweight, standards stay in sync)
2. **Copy content** — Paste the full standards content into the plan (self-contained, but won't update if standards change)

Which approach? (1 or 2)
```

**If References (option 1):**

```text
Be sure to include references to the following standards files in the appropriate location in the plan we're building:

@yellowdot-os/standards/api/response-format.md
@yellowdot-os/standards/api/error-handling.md
@yellowdot-os/standards/global/naming.md

These standards cover:
- API response envelope structure, status codes
- Error codes, exception handling, error responses
- File naming, variable naming conventions
```

**If Copy content (option 2):**

```text
Include the following standards content in your plan:

--- Standard: api/response-format ---

[full content of the standard file]

--- End Standard ---

--- Standard: api/error-handling ---

[full content of the standard file]

--- End Standard ---

These standards cover:
- API response envelope structure, status codes
- Error codes, exception handling, error responses
- File naming, variable naming conventions
```

---

### Step 6: Surface Related Skills (Conversation scenario only)

When in conversation scenario, check if the project's skills directory (`.claude/skills/` or `.agents/skills/`) exists and contains related skills:

```text
Related Skills you might want to use:
- create-api-endpoint — Scaffolds new API endpoints following these standards
```

Don't invoke skills automatically — just surface them for awareness.

---

## Explicit Mode

When arguments are provided, skip the suggestion step but still detect scenario.

### Step 1: Detect Scenario

Same as auto-suggest mode.

### Step 2: Parse Arguments

Arguments can be:

- **Folder name** — `api` → inject all `.md` files in `yellowdot-os/standards/api/`
- **Folder/file** — `api/response-format` → inject `yellowdot-os/standards/api/response-format.md`
- **Root folder** — `root` → inject all `.md` files directly in `yellowdot-os/standards/` (not in subfolders)
- **Root file** — `root/naming` → inject `yellowdot-os/standards/naming.md`

Multiple arguments inject multiple standards.

### Step 3: Validate

Check that specified files/folders exist. If not:

```text
Standard not found: api/nonexistent

Available standards in api/:
- response-format
- error-handling
- authentication

Did you mean one of these?
```

### Step 4: Inject Based on Scenario

Same formatting as auto-suggest mode, based on detected scenario.

---

## Tips

- **Run early** — Inject standards at the start of a task, before implementation
- **Be specific** — If you know which standards apply, use explicit mode
- **Check the index** — If suggestions seem wrong, run `/index-standards` to rebuild
- **Keep standards concise** — Injected standards consume tokens; shorter is better

## Integration

Invoke it directly anytime you need standards in context. (`/shape-spec` reads the same `index.yml` itself during planning.)
