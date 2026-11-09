---
name: create-prd
description: Turn a shaped yellowdot-os spec into a one-page PRD and a Given/When/Then checklist that needs human approval before implementation. Use after /shape-spec.
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

# Create PRD

Generate a one-page PRD and a verifiable implementation checklist from a shaped spec. The checklist requires explicit human approval before `/implement-prd` will run.

## Important Guidelines

- **Always use the ask_user capability** when asking the user anything
- **One page** — a PRD nobody reads is worse than no PRD. If it takes longer to generate than to read, it's too long.
- **Acceptance criteria are Given/When/Then** — every criterion must be phrased so a test can verify it
- **Never fill in the approval block yourself** — approval belongs to a human, always

## Prerequisites

A shaped spec must exist under `yellowdot-os/specs/`.

- If exactly one spec folder has no `prd.md` yet, use it (confirm with the user).
- If several candidates exist, use ask_user to pick one.
- If none exist, **stop** and tell the user:

```text
No shaped spec found. Run /shape-spec first (in plan mode), then /create-prd.
```

## Process

### Step 1: Absorb the Spec

Read the spec folder (`plan.md`, `shape.md`, `standards.md`, `references.md`) and the standards it references. Do not re-ask questions the spec already answers.

### Step 2: Draft Acceptance Criteria

Derive acceptance criteria from the spec's scope and decisions. Phrase each one Given/When/Then, numbered `AC-1`, `AC-2`, ...

use ask_user to confirm:

```text
Draft acceptance criteria for {feature}:

AC-1: Given an active subscriber, When they complete the daily challenge, Then their streak increments by 1
AC-2: Given a replayed callback event, When it is processed again, Then no duplicate record is created
AC-3: ...

Confirm, or adjust? (e.g. "drop AC-3", "add: admin can see X")
```

### Step 3: Draft the PRD

Write `prd.md` in the spec folder using the Output template below. Highlight anything marked as a **risk** or **open question** and resolve open questions with ask_user — a PRD with unresolved questions is not ready for approval.

### Step 4: Build the Checklist

Write `checklist.md` in the spec folder. Rules:

- Items are ordered, numbered, and independently verifiable
- **Tests come first:** the first implementation item (after any pure setup) is always *"Write the BDD test scenarios for every AC"* — with `Done means: one failing scenario exists per AC, failing for the right reason (not compilation errors)`. All later items make those scenarios pass. Never order the checklist implementation-first.
- Every item has a **Done means** line: a concrete, checkable criterion (a test that passes, a command whose output shows X, an endpoint that responds Y)
- Every acceptance criterion maps to at least one item (`Maps to: AC-n`); items with no AC mapping are plumbing and say `Maps to: —`
- Every item after the tests item says what it needs and where it works, so independent items can be built in parallel: `Depends on:` (item numbers, or `—`) and `Touches:` (the files or modules it will change). Only claim independence you're confident of — two items that edit the same file are not independent.
- Prefer 5–15 items. More than ~20 means the spec should be split.

### Step 5: Hand Over for Approval

Present the PRD and checklist, then **stop**:

```text
PRD and checklist are ready in yellowdot-os/specs/{folder}/.

Review them and, if you're happy, fill in the Approval block at the bottom
of checklist.md (check the box, add your name and date) — or tell me
"approve as <name>" and I'll fill it in on your instruction.

Then run /implement-prd to execute.
```

You may fill the approval block **only** when the user explicitly instructs you to approve on their behalf in this conversation. Record their name, not yours.

## Output: prd.md

```markdown
# {Feature Name} — PRD

**Spec:** {spec folder}  ·  **Date:** {date}

## Problem
[2-4 sentences: what hurts today, for whom]

## Goals
- [What this delivers, measurable where possible]

## Non-goals
- [What this deliberately does NOT do — as important as goals]

## User flows
1. [Actor] does [action] → [outcome]

## Acceptance criteria
- **AC-1:** Given ..., When ..., Then ...
- **AC-2:** Given ..., When ..., Then ...

## Risks & dependencies
- [Risk] → [mitigation]
- Depends on: [service/API/decision]
```

## Output: checklist.md

```markdown
# {Feature Name} — Implementation Checklist

**PRD:** ./prd.md  ·  **Status:** PENDING APPROVAL

## Items

- [ ] 1. Write the BDD test scenarios for every AC
  - Done means: one failing scenario exists per AC, failing for the right reason
  - Maps to: AC-1, AC-2
- [ ] 2. {Implementation item}
  - Done means: {verifiable criterion}
  - Maps to: AC-1
  - Depends on: 1
  - Touches: {files or modules}
- [ ] 3. {Implementation item}
  - Done means: {verifiable criterion}
  - Maps to: AC-2
  - Depends on: 1
  - Touches: {files or modules}

## Added during implementation

(none)

## Approval

- [ ] Approved for implementation
- Approved by:
- Date:
```

## Tips

- **Non-goals prevent scope creep** — spend real thought there.
- **"Done means" is the whole point** — an item you can't verify is an opinion, not a task.
- **BDD tie-in:** in repos whose profile includes a BDD testing standard, acceptance criteria become test scenarios almost verbatim — write them with that in mind.
