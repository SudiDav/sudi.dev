---
name: fix-bug
description: Fix a bug the yellowdot-os way with a failing regression test first, a stated root cause, the smallest fix, and a standards and security review. Use when the user reports a bug or a failing behaviour to fix.
disable-model-invocation: true
---
<!-- yellowdot-os adapter: claude-code
ask_user=AskUserQuestion
dispatch_one=Task/custom agents
dispatch_parallel=Task/custom agents
read=Read
run_verification=Bash
write_artifact=Write/Edit
-->

# Fix Bug

Fix one bug with evidence: reproduce it as a failing regression test, name the root cause, make the smallest change that turns the test green, and have it reviewed before the PR. The lightweight counterpart to `/create-prd` → `/implement-prd` for day-to-day bug work.

## Important Guidelines

- **Always use the ask_user capability** when asking the user anything
- **No fix without a failing test.** The regression test is written and seen failing *before* any production code changes. A bug you cannot reproduce is a question for the user, not a guess to code around.
- **Smallest fix that makes the test pass.** No refactors, renames, or drive-by improvements in the same change; note them as follow-ups instead.
- **Important decisions belong to the developer.** Stop and ask (options + recommendation) when the fix needs an architecture change, a new dependency, a schema or data change, a security- or PII-relevant tradeoff, or any choice between approaches whose tradeoffs matter.
- **Never paste real subscriber data.** Bug reports often contain MSISDNs and logs: mask them (`****1234`) in tests, fixtures, the bug record, and commit messages.

## Keep the Developer Informed

- **Task list:** create entries in the host's task list (or plan) for Reproduce, Root cause, Fix, Review, and Record; mark each in progress and completed as you go.
- **One status line at the end of every step below** — treat it as part of the step — e.g. `[reproduce] ✓ regression test fails for the reported reason`, `[root cause] ✓ src/mask.js:3 used slice(-3)`, `[review] ▶ standards + security/PII reviewers running`, `[review] ✓ reviewer-standards — pass`.
- The yellowdot-os progress hook announces each reviewer's start and finish with its VERDICT.

## Prerequisites

- The project has yellowdot-os installed (`yellowdot-os/standards/` exists)
- The project's test suite runs locally

## Process

### Step 1: Capture the Bug

If the user has not already given them, ask_user for:

1. **Symptom** — what happens (error text, wrong value, screenshot)
2. **Expected** — what should happen instead
3. **Reproduction** — steps, inputs, or the request that triggers it
4. **Where** — environment, operator/market, version, ticket or log link

Restate the bug in one sentence and confirm it before continuing.

### Step 2: Load Context

1. Read `yellowdot-os/standards/index.yml` and load the standards that apply to the affected code (always include `global/msisdn-pii.md` when subscriber data is involved)
2. Locate the code path: search for the endpoint, handler, message, or error text from Step 1 and read the relevant files
3. Record the base commit: `git rev-parse HEAD`

### Step 3: Reproduce — Failing Regression Test

1. Write a regression test at the level closest to the symptom (unit if the fault is isolated, integration if it spans components), following the project's testing standard. Name it after the behaviour, as a Given/When/Then scenario:

   ```text
   Given {the state that triggers the bug}
   When {the action}
   Then {the expected behaviour}   // regression: {one-line bug summary}
   ```

2. run_verification: run the test and confirm it **fails for the reason in the bug report** — not a compile error, missing fixture, or unrelated failure
3. If it passes or fails for another reason, the bug is not reproduced. Stop and ask_user with what you tried and what you observed. Do not change production code.

### Step 4: Root Cause

Explain the cause in two or three sentences with `file:line` references: what the code does, why that produces the symptom, and when it was likely introduced (`git log -L` or `git blame` on the lines, when useful).

If the fix needs a decision from the list in Important Guidelines, ask_user now with the options and your recommendation, and record the answer for the bug record.

### Step 5: Fix

1. Make the smallest change that addresses the root cause
2. run_verification: the regression test now passes
3. run_verification: run the full test suite; anything newly failing is part of this fix, not a follow-up
4. Commit following the repo's git conventions, e.g. `fix(scope): {what was wrong}` with the root cause in the body

### Step 6: Review — dispatch, parallel

Write the bug folder first (Step 7, sections Bug through Fix), including `standards.md` listing the standards loaded in Step 2, so the reviewers have context. Then dispatch `reviewer-standards` and `reviewer-security-pii` in parallel with this brief:

```text
Review the bug fix for {one-line bug summary}.

Spec folder: yellowdot-os/specs/{folder}/
Base commit: {base commit from Step 2}
The work under review is: git diff {base}..HEAD
Apply your review dimension and end with your VERDICT block.
```

Triage as `/implement-prd` does: fix every blocker or major finding (re-running the regression test and full suite after each fix), re-run only the reviewers that failed, at most 2 review rounds; after that, present outstanding findings with ask_user (fix manually / accept / drop). Minor findings are recorded, not fixed.

If the host cannot dispatch subagents, run the two reviews inline from the installed `reviewer-*.md` rubrics, one after the other, producing the same VERDICT blocks.

### Step 7: Bug Record and Close Out

write_artifact: create `yellowdot-os/specs/{YYYY-MM-DD-HHMM}-fix-{bug-slug}/bugfix.md`:

```markdown
# Fix: {one-line bug summary}

**Base commit:** {sha}  ·  **Fix commit(s):** {sha}  ·  **Ticket:** {link or —}

## Bug
{symptom, expected, reproduction — MSISDNs masked}

## Regression test
{test name and file} — failed before the fix: {the failure message}

## Root cause
{two or three sentences with file:line}

## Fix
{what changed and why this is the smallest correct fix}

## Decisions
{decisions asked of the user and their answers, or "none"}

## Review
- reviewer-standards: pass|fail — {findings or "none"}
- reviewer-security-pii: pass|fail — {findings or "none"}

## Follow-ups
{refactors or related issues noticed but deliberately not done, or "none"}
```

Then summarize for the user:

```text
Bug fixed: {one-line summary}
Regression test: {name} — failing before, passing now
Root cause: {one sentence}
Full test suite: {result}
Reviewers: Standards ✓ Security/PII ✓ ({n} minors noted)
Record: yellowdot-os/specs/{folder}/bugfix.md — paste it into the PR description.
```

## Tips

- **The test is the proof** — reviewers and the PR reviewer should be able to run one test and see the bug is gone
- **Can't reproduce locally?** Ask for the exact request, payload, or data shape (masked) before touching code
- **Found a second bug?** Note it in Follow-ups and fix it in its own run
