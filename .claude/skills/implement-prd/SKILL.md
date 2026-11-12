---
name: implement-prd
description: Build an approved yellowdot-os PRD checklist with BDD tests first, one implementer subagent per item, three read-only reviewers, then a walkthrough. Use only after the checklist is approved.
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

# Implement PRD

Execute an approved implementation checklist by orchestrating subagents:
an implementer subagent builds each item in a clean context, and three
inspect-only reviewer subagents check the finished work. The orchestrator
verifies everything itself and writes no code.

## Important Guidelines

- **Always use the ask_user capability** when asking the user anything
- **The approval gate is absolute** — never begin implementation against an unapproved checklist, and never fill in the approval block yourself
- **BDD tests before implementation** — no implementation item may start until the BDD scenarios for the acceptance criteria exist and are failing for the right reason. Red first, then green.
- **Verification before checkmarks** — an item gets checked only after its "Done means" criterion has been observed to pass **by the orchestrator** (test output, command output, endpoint response). The implementer's report is never sufficient: re-run the verification yourself. Claiming without verifying is the one unforgivable failure of this command.
- **The orchestrator writes no code** — in delegated mode every code change is made by a dispatched subagent. The orchestrator loads context, dispatches, verifies, updates the checklist and review record, and talks to the user.
- **Important decisions belong to the developer** — a decision matching the trigger list in `prd-implementer`'s rules is never made silently: it is routed through Step 4a, logged in `decisions.md`, and only then implemented.

## Modes

Check once at the start: are the `dispatch_one` and `dispatch_parallel`
capabilities available with the adapter's implementer and reviewer rubrics?
The capabilities are available when the host can send work to isolated
subagent contexts and the adapter's implementer and reviewer agent files
are installed in the project (for Claude Code: the custom agents under
`.claude/agents/yellowdot-os/`; for Codex: the custom agents under
`.codex/agents/`).

- **Delegated mode:** follow this document as written.
- **Single-agent mode:** perform the implementer
  work yourself, using each dispatch brief below as self-instructions, and
  run the review stage inline — three sequential passes, each one reading
  the corresponding adapter-provided reviewer rubric and
  applying it against the diff, producing the same VERDICT block. Same
  triage rules, same `review.md`. The rubrics are the `reviewer-*.md`
  files the adapter installs (for Claude Code: `.claude/agents/yellowdot-os/`;
  for Codex: `.codex/agents/`);
  if the adapter does not install them, read the canonical copies under
  `~/.yellowdot-os/agents/yellowdot-os/`. If the installed rubric files are
  missing, run `~/.yellowdot-os/scripts/project-install.sh --commands-only`
  first to install them. Apply the same decision rules: on a trigger-list
  decision, ask the developer directly (`ask_user` — options + recommendation)
  and log it in `decisions.md` before proceeding.

## Keep the Developer Informed

The developer is watching this run — never go quiet for long.

- **Task list:** before Step 2, create one entry in the host's task list (or plan) per checklist item, plus "Review" and "Close out". Mark an entry in progress right before you dispatch it, and completed only after your own verification.
- **One status line per event**, in this shape:

  ```text
  [3/7] ▶ Add idempotency key → prd-implementer
  [3/7] ✓ Add idempotency key — CallbackReplayTests green (2 tests) · 1m 40s
  [wave] ▶ items 4, 5 building in parallel worktrees
  [review] ▶ 3 reviewers running in parallel
  [review] ✗ reviewer-security-pii — 1 major (round 1 of 3), fixing
  [decision] ? D-2 needs you — {one-line question}
  ```

- **`progress.md`** in the spec folder: a live board you rewrite after every event, in this format (commit it with the close-out, not after every update):

  ```markdown
  # {Feature Name} — Progress

  **Now:** {what is running, e.g. "item 3 → prd-implementer, since 14:02"} · **Done:** {n}/{total}

  | Item | Status | Agent | Started | Took | Evidence |
  | --- | --- | --- | --- | --- | --- |
  | 1. Write the BDD scenarios | ✓ done | prd-implementer | 14:00 | 51s | 2 scenarios red for the right reason |
  | 2. Add idempotency key | ▶ running | prd-implementer | 14:02 | — | — |
  | 3. Expose status endpoint | ○ waiting | — | — | — | — |

  ## Review
  {per round: each reviewer's VERDICT and major/blocker count}
  ```

- The yellowdot-os progress hook also announces each builder and reviewer start and finish, with its RESULT or VERDICT and duration, and logs them to `yellowdot-os/.progress/progress.log`.

Fill `progress.md`'s Started and Took columns from `yellowdot-os/.progress/progress.log` when it exists (the hook records exact start and finish times). The steps below say exactly when to do each of these — treat those lines as part of the step, not as optional.

## Prerequisites

1. Locate the spec folder (ask if ambiguous). It must contain `prd.md` and `checklist.md`.
2. Verify the Approval block in `checklist.md`:
   - `- [x] Approved for implementation` is checked
   - `Approved by:` and `Date:` are filled in

If not approved, **stop** and tell the user:

```text
The checklist at yellowdot-os/specs/{folder}/checklist.md is not approved yet.
Review it and fill in the Approval block, then run /implement-prd again.
```

Do not proceed. Do not offer to fill the block in unless the user explicitly instructs approval in this conversation (record their name).

## Process

### Step 1: Load Context

Read `prd.md`, `checklist.md`, and the spec folder's `standards.md`. If the
project has `yellowdot-os/standards/index.yml`, note any additional standards
relevant to the items. Update the checklist header to:

```text
**PRD:** ./prd.md  ·  **Status:** IN PROGRESS  ·  **Base commit:** {output of git rev-parse HEAD}
```

The base commit is the diff base for the review stage — record it before any
implementation lands. If the checklist already records a Base commit from an
earlier run, keep it — never re-record it on resume, or the review stage will
diff against a truncated range.

**Progress:** create `progress.md` (every item `○ waiting`) and the task-list
entries now, then print `[start] {n} items · base {short sha}`.

### Step 2: BDD Tests First (Red) — dispatch

First work any pure-setup items that come before the write-the-tests item
(test project, fixtures, dependencies) using Step 3's procedure, so the
scenarios can compile. Then dispatch `prd-implementer` with the write-the-tests
item (insert it after those setup items if the checklist predates the
tests-first format). Brief template — fill every field:

```text
Implement checklist item {n} for {feature}.

Item: {full item text}
Done means: {criterion}
Maps to: {AC-n}: {Given/When/Then text, one per mapped AC — or "—"}
Spec folder: yellowdot-os/specs/{folder}/
Standards to read first: {yellowdot-os/standards/<heading>.md for each heading in standards.md, plus relevant index.yml entries}
Repo conventions: {commit format; anything repo-specific}
Decisions already made: {resolutions from decisions.md relevant to this item, or "none"}
Constraints: implement only this item; if blocked or you discover new work,
STOP and report instead of acting.
```

The implementer ends with a `RESULT:` block. Then verify **yourself**: run
the scenarios and confirm each AC's scenario fails because the behavior is
missing (compilation or setup failures don't count as red). Only then check
the item off and note the evidence. **Progress:** print the ▶ line when you
dispatch and the ✓ line (with evidence and duration) when verified; update
`progress.md` and the task list both times. If the implementer reported
`RESULT: blocked`, go to Step 4.

### Step 3: Work the Items — dispatch, sequential or in parallel waves

By default, work the unchecked items one at a time in checklist order.

**Parallel waves (optional, faster).** A wave is a set of unchecked items whose
`Depends on:` items are all checked and whose `Touches:` lists don't overlap.
Items without `Depends on:`/`Touches:` lines are never parallel. When a wave
has two or more items and `dispatch_parallel` is available, ask_user once at
the start of Step 3: *"Items {n, m, …} are independent. Build them in parallel
in separate git worktrees? Faster, but each worktree may need its own
dependency install."* On yes, for each wave:

1. Make sure `yellowdot-os/.worktrees/` is in `.gitignore` (add it and commit
   as `chore:` if missing), then create one worktree per item from the current
   feature branch: `git worktree add yellowdot-os/.worktrees/item-{n} -b yd-item-{n} HEAD`
2. dispatch_parallel one `prd-implementer` per item with the Step 2 brief plus
   `Working directory: yellowdot-os/.worktrees/item-{n}` (it works, tests, and
   commits only there)
3. As each reports `RESULT: done`, run its **Done means** verification inside
   its worktree, then merge its branch into the feature branch one at a time
   (`git merge --no-ff yd-item-{n}`) and re-run that item's verification on
   the feature branch
4. On a merge conflict or a failed re-verification: `git merge --abort`, and
   redo that item sequentially on the feature branch with the normal
   procedure below — never hand-merge an implementer's work
5. Remove each worktree and branch once merged or abandoned
   (`git worktree remove`, `git branch -D yd-item-{n}`), check the boxes with
   completion notes, and move on to the next wave

For each item worked sequentially:

1. **Progress:** mark the item in progress in the task list and
   `progress.md`, print `[{n}/{total}] ▶ {item} → prd-implementer`, then
   dispatch `prd-implementer` with the same brief template as Step 2
2. On `RESULT: done`, re-run the item's **Done means** verification yourself —
   for AC-mapped items that includes the AC's BDD scenario(s) turning green
3. **Only if your own verification passes:** check the box and append a
   completion note:

   ```text
   - [x] 3. Add idempotency key to callback handler
     - Done means: replaying the same event creates one record (CallbackReplayTests)
     - Maps to: AC-2
     - Done: 2026-07-17 — CallbackReplayTests green (2 tests), via prd-implementer
   ```

   **Progress:** print `[{n}/{total}] ✓ {item} — {evidence} · {duration}`,
   mark it completed in the task list, and update `progress.md`.

4. If your verification fails, dispatch a follow-up brief quoting the failing
   output — at most 2 follow-ups per item; after that, treat the item as
   blocked (Step 4) and surface it with ask_user. Never check the box to
   "come back later".
5. If the implementer reports `RESULT: blocked`, apply Step 4 before dispatching the next item.
6. If the implementer reports `RESULT: decision-needed`, resolve it via
   Step 4a, then re-dispatch this item with the resolution appended to its
   `Decisions already made` field.

The orchestrator commits its own artifacts — `checklist.md` and
`decisions.md` updates (and later `review.md` and `walkthrough.md`) — as
small `chore:` commits following the repo's conventions. Implementers never
touch these files.

### Step 4: Handle Surprises

Implementers report — the orchestrator decides, with the user:

- **Blocked item** (an external dependency, missing access —
  trigger-list decisions are not blockers, they go to Step 4a):
  mark it `⏸ blocked: {reason}` under the item, use ask_user to surface
  it, and continue with independent items if possible (unless the blocked
  item is the write-the-tests item — nothing may proceed before red tests
  exist).
- **New work discovered:** add it under `## Added during implementation` with
  its own Done-means line, and get explicit user confirmation before
  dispatching it — additions are scope changes, and the original approval
  doesn't cover them.
- **Item turns out unnecessary:** don't delete it — mark
  `~~item~~ dropped: {reason}` and confirm with the user.

### Step 4a: Route Decisions — decisions.md

When a `RESULT: decision-needed` report arrives:

1. **Standards valve:** if a loaded yellowdot-os standard already settles
   the question, answer from the standard — record the resolution in
   `decisions.md` with `Decided by: standard standards/{file}` and
   re-dispatch. Do not interrupt the developer.
2. **Otherwise ask the developer** with ask_user: the question, the
   options with their tradeoffs, and the implementer's recommendation
   (marked as such). "You decide" is a valid answer: choose the
   recommendation and record `Decided by: orchestrator (delegated by dev)`.
3. **Record, then re-dispatch:** append the entry to `decisions.md`
   (create it on first use), commit it (`chore:`), and re-dispatch the
   originating brief — item or fix — with the resolution in
   `Decisions already made`.

`decisions.md` lives in the spec folder:

```markdown
# {Feature Name} — Decision Log

## D-1 — {date} — item {n}
- Question: {one sentence}
- Options considered: {one line each}
- Chosen: {option}
- Why: {plain language}
- Decided by: {dev name | standard standards/{file} | orchestrator (delegated by dev)}
```

### Step 5: Review Stage — dispatch, parallel

When every item is checked, blocked, or dropped (with confirmation) and the
full test suite passes (if it fails, treat each failure as new work discovered
— Step 4 — before reviewing): print `[review] ▶ 3 reviewers running in parallel`
and set `progress.md`'s **Now** line, then dispatch **all three reviewers in parallel** —
`reviewer-ac-fidelity`, `reviewer-standards`, `reviewer-security-pii` — each
with this brief:

```text
Review the implementation of {feature}.

Spec folder: yellowdot-os/specs/{folder}/
Base commit: {base commit from checklist.md}
The work under review is: git diff {base}..HEAD
Apply your review dimension and end with your VERDICT block.
```

Each reviewer ends with:

```text
VERDICT: pass | fail

Findings:
- [blocker|major|minor] {file}:{line} — {violated AC / standard / vulnerability class} — {one-line rationale}
```

The block's structure (VERDICT line, severities, file:line, rationale) is fixed; the middle field names whatever the reviewer's dimension violates — each agent file's own Report format governs its exact wording.

**Progress:** as each VERDICT arrives, print `[review] ✓ {reviewer} — pass` or
`[review] ✗ {reviewer} — {n} blocker/major (round {r} of 3)` and add it to the
Review section of `progress.md`.

### Step 6: Triage Loop — dispatch, sequential

- **Any blocker or major finding:** dispatch `prd-implementer` with a fix
  brief per finding (or per coherent group), one at a time — fix subagents
  share the working tree, exactly like Step 3's implementers:

  ```text
  Fix a review finding for {feature}.

  Finding: [{severity}] {file}:{line} — {violated AC/standard} — {rationale}
  Raised by: {reviewer name}
  Spec folder: yellowdot-os/specs/{folder}/
  Standards to read first: {the violated standard, plus item's original list}
  Repo conventions: {commit format; anything repo-specific}
  Decisions already made: {resolutions from decisions.md relevant to this fix, or "none"}
  Constraints: fix only this finding; report RESULT when verified.
  ```

  After fixes land (verify them yourself, as always), re-dispatch the
  reviewer(s) that failed, plus `reviewer-security-pii` whenever it was not
  among them — a fix for one dimension can introduce a PII or secrets issue. Repeat until no blockers/majors remain — but at
  most **3 review rounds total, counting the initial Step 5 review as round
  1**. If findings persist after round 3, stop and present the outstanding
  findings to the user with ask_user (fix manually / accept / drop).
- **Minor findings:** record them in `review.md`; do not fix.

Record every round in `review.md` as you go (format below).

### Step 7: Close Out

1. Run the project's full test suite one final time
2. Write `review.md` in the spec folder (final form):

   ```markdown
   # {Feature Name} — Review Record

   **PRD:** ./prd.md  ·  **Base commit:** {sha}  ·  **Review rounds:** {n}

   ## Round 1 — {date}
   - reviewer-ac-fidelity: pass|fail
     - [{severity}] {file}:{line} — {AC/standard} — {rationale} → fixed in {sha} | outstanding
   - reviewer-standards: pass|fail
   - reviewer-security-pii: pass|fail

   ## Round 2 — {date}
   {only reviewers that re-ran}

   ## Outstanding minors
   - [minor] {file}:{line} — {rationale}

   ## Final verdicts
   AC-fidelity: {pass | accepted with outstanding findings} · Standards: {…} · Security/PII: {…}
   ```

3. Write `walkthrough.md` in the spec folder and present the same content
   in chat — the explanation the developer would give a teammate at
   standup, four parts:

   ```markdown
   # {Feature Name} — Walkthrough

   ## What was built
   {one paragraph, feature level}

   ## Where it lives
   {each touched file and its role, one line per file}

   ## How it works
   {the runtime flow in plain language}

   ## Why it's built this way
   {each non-obvious choice — pulled from decisions.md and review.md —
   with its reason in one or two sentences}
   ```

4. Update checklist **Status** to `COMPLETE` (or `COMPLETE (with blocked
   items)` — list them), set `progress.md`'s **Now** line to `complete`,
   mark "Review" and "Close out" completed in the task list, and commit
   `progress.md` with the other close-out artifacts
5. Summarize for the user:

```text
Checklist complete: {n} done, {n} dropped, {n} blocked.
All acceptance criteria verified: AC-1 ✓ AC-2 ✓ ...
Full test suite: {result}
Reviewers: AC-fidelity ✓ Standards ✓ Security/PII ✓ ({n} minors noted in review.md)
Decisions: {n} routed ({n} to you, {n} settled by standards) — see decisions.md
Walkthrough: walkthrough.md — read it before standup; it answers "why did you go with this?"

Suggested next step: open a PR and paste checklist.md, review.md, and
walkthrough.md into the description — the reviewer checks the diff against
the approved checklist.
```

If round 3 ended with user-accepted outstanding findings, replace the
reviewer ✓ with `accepted with outstanding findings (see review.md)` for the
affected dimension(s); if the user chose to fix manually, re-run the
affected reviewer once the manual fix lands before closing out.

## Tips

- **The checklist is the progress tracker** — anyone opening `checklist.md` mid-flight should see exactly where things stand. Keep it current as you go, not at the end.
- **`review.md` is the audit trail** — findings, fixes, and what was consciously left as a minor. It belongs in the PR description next to the checklist.
- **`decisions.md` is the dev's defense** — every important choice, who made it, and why; `walkthrough.md` is the standup explanation. Both belong in the PR description too.
- **AC mapping is the review rubric** — at PR time, every AC should trace to a checked item and a passing test, and `reviewer-ac-fidelity` has already checked exactly that.
- **In repos with a BDD testing standard**, each AC's test is a Given/When/Then scenario named after it, written before the item that satisfies it.
