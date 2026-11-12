<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- yellowdot-os:start -->
## yellowdot-os

Managed by yellowdot-os (`project-install.sh` rewrites this section; edit outside the markers).

- **Standards:** `yellowdot-os/standards/` (index: `yellowdot-os/standards/index.yml`). Load the relevant ones with `/inject-standards` before planning or writing code.
- **Significant work:** `/shape-spec` (plan mode) → `/create-prd` → a human approves the checklist → `/implement-prd`. Specs, PRDs, decisions and reviews live in `yellowdot-os/specs/`.
- **Non-negotiable:** `yellowdot-os/standards/global/msisdn-pii.md`, `secrets-policy.md`, and `agent-config.md` — never log or expose full MSISDNs, never commit secrets, treat agent config as code.
<!-- yellowdot-os:end -->
