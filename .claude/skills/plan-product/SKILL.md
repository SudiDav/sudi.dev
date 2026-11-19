---
name: plan-product
description: Create or update the product mission, roadmap and tech-stack docs in yellowdot-os/product/ through a short interview. Use when starting a repo on yellowdot-os or when the product direction changes.
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

# Plan Product

Establish foundational product documentation through an interactive conversation. Creates mission, roadmap, and tech stack files in `yellowdot-os/product/`.

## Important Guidelines

- **Always use the ask_user capability** when asking the user anything
- **Keep it lightweight** — gather enough to create useful docs without over-documenting
- **One question at a time** — don't overwhelm with multiple questions

## Process

### Step 1: Check for Existing Product Docs

Check if `yellowdot-os/product/` exists and contains any of these files:

- `mission.md`
- `roadmap.md`
- `tech-stack.md`

**If any files exist**, use ask_user:

```text
I found existing product documentation:
- mission.md: [exists/missing]
- roadmap.md: [exists/missing]
- tech-stack.md: [exists/missing]

Would you like to:
1. Start fresh (replace all)
2. Update specific files
3. Cancel

(Choose 1, 2, or 3)
```

If option 2, ask which files to update and only gather info for those.
If option 3, stop here.

**If no files exist**, proceed to Step 2.

### Step 2: Gather Product Vision (for mission.md)

Use ask_user:

```text
Let's define your product's mission.

**What problem does this product solve?**

(Describe the core problem or pain point you're addressing)
```

After they respond, use ask_user:

```text
**Who is this product for?**

(Describe your target users or audience)
```

After they respond, use ask_user:

```text
**What makes your solution unique?**

(What's the key differentiator or approach?)
```

### Step 3: Gather Roadmap (for roadmap.md)

Use ask_user:

```text
Now let's outline your development roadmap.

**What are the must-have features for launch (MVP)?**

(List the core features needed for the first usable version)
```

After they respond, use ask_user:

```text
**What features are planned for after launch?**

(List features you'd like to add in future phases, or say "none yet")
```

### Step 4: Establish Tech Stack (for tech-stack.md)

First, check if `yellowdot-os/standards/global/tech-stack.md` exists.

**If the tech-stack standard exists**, read it and use ask_user:

```text
I found a tech stack standard in your standards:

[Summarize the key technologies from global/tech-stack.md]

Does this project use the same tech stack, or does it differ?

1. Same as standard (use as-is)
2. Different (I'll specify)

(Choose 1 or 2)
```

If they choose option 1, use the standard's content for tech-stack.md.
If they choose option 2, proceed to ask them to specify (see below).

**If no tech-stack standard exists** (or they chose option 2 above), use ask_user:

```text
**What technologies does this project use?**

Please describe your tech stack:
- Frontend: (e.g., React, Vue, vanilla JS, or N/A)
- Backend: (e.g., Rails, Node, Django, or N/A)
- Database: (e.g., PostgreSQL, MongoDB, or N/A)
- Other: (hosting, APIs, tools, etc.)
```

### Step 5: Generate Files

Create the `yellowdot-os/product/` directory if it doesn't exist.

Generate each file based on the information gathered:

#### mission.md

```markdown
# Product Mission

## Problem

[Insert what problem this product solves - from Step 2]

## Target Users

[Insert who this product is for - from Step 2]

## Solution

[Insert what makes the solution unique - from Step 2]
```

#### roadmap.md

```markdown
# Product Roadmap

## Phase 1: MVP

[Insert must-have features for launch - from Step 3]

## Phase 2: Post-Launch

[Insert planned future features - from Step 3, or "To be determined" if they said none yet]
```

#### tech-stack.md

```markdown
# Tech Stack

[Organize the tech stack information into logical sections]

## Frontend

[Frontend technologies, or "N/A" if not applicable]

## Backend

[Backend technologies, or "N/A" if not applicable]

## Database

[Database choice, or "N/A" if not applicable]

## Other

[Other tools, hosting, services - or omit this section if nothing mentioned]
```

### Step 6: Confirm Completion

After creating all files, output to user:

```text
✓ Product documentation created:

  yellowdot-os/product/mission.md
  yellowdot-os/product/roadmap.md
  yellowdot-os/product/tech-stack.md

Review these files to ensure they accurately capture your product vision.
You can edit them directly or run /plan-product again to update.
```

## Tips

- If the user provides very brief answers, that's fine — the docs can be expanded later
- If they want to skip a section, create the file with a placeholder like "To be defined"
- The `/shape-spec` command will read these files when planning features, so having them populated helps with context
