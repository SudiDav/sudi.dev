# AI Agent Configuration

Agent config is executable code. Hooks, MCP servers, skills, and editor tasks run with the developer's credentials the moment a repo is opened in an AI tool — the 2026 npm worms (Miasma, ChainDrop/Shai-Hulud) persisted exactly there.

## Instruction files

- Shared agent instructions live in `AGENTS.md` at the repo root (read by Claude Code, Cursor, Codex, Copilot, and Gemini CLI); nested `AGENTS.md` files only for genuinely different subtrees
- Commit a `CLAUDE.md` whose first line is `@AGENTS.md`, plus any Claude-only notes — Claude Code (≥ 2.1.277) reads `AGENTS.md` natively only while no `CLAUDE.md` or `CLAUDE.local.md` exists, so the import keeps it loaded when a developer adds a personal `CLAUDE.local.md`
- Keep instruction files short and current; anything that must never be skipped belongs in a hook or CI check, not in prose

## What counts as agent config

- `.claude/`, `.cursor/`, `.codex/`, `.gemini/`, `.agents/`, `.github/copilot-instructions.md`
- `.mcp.json` and any MCP server entry, `SKILL.md` files, `AGENTS.md` / `CLAUDE.md`
- `.vscode/tasks.json` and `.vscode/settings.json` (auto-run tasks)

## Rules

- All agent config paths are listed in `CODEOWNERS` and need a human review; an agent never approves a change to its own config
- A PR that adds a hook, MCP server, or auto-run task says so in its description and justifies it; project hooks run for everyone who opens the repo in the agent
- MCP servers come from the org allowlist only; remote servers must support the current MCP authorization spec (issuer validation, audience-bound tokens) — no unauthenticated remote servers
- Third-party skills and plugins are vendored and reviewed like dependencies, never installed from a registry on the fly
- Never open an untrusted clone (external PR branch, forked repo, archive from a vendor) in an agent with hooks or MCP enabled — inspect it first in a plain editor or a sandbox
- Agents never see production secrets or unmasked MSISDNs: no secrets in the agent's environment, no production data in fixtures or prompts

## Dependencies

- Install scripts are off by default: `ignore-scripts=true` in `.npmrc` (default in npm 12; pnpm and Bun already block them); allowlist the few packages that genuinely need a build step
- New dependencies wait out a minimum release age (7 days) before adoption, unless a security fix requires otherwise
- Valid provenance is necessary, not sufficient — compromised maintainer accounts publish with valid provenance

## Agents in CI

- Pin agent actions by full commit SHA and require a current agent version (Claude Code ≥ 2.1.128 for `claude-code-action`)
- No secrets on untrusted triggers: agent jobs on issues, comments, or fork PRs run with a read-only token and no deploy credentials
- Do not trust an actor because its name ends in `[bot]`; allow specific app identities only
- AI-authored PRs get at least one human reviewer who did not prompt the change
