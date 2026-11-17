# Git & Repo Conventions

- Branches: `feat/…`, `fix/…`, `chore/…`, `refactor/…`, `docs/…` — descriptive, no tool or bot names
- Commits: imperative, concise, conventional-commits style preferred; no AI/assistant attribution trailers or "generated with" notices
- New product variants start from the profile template (`/yd:new-service` once available) — never by copying/forking an existing operator repo wholesale
- Repos never contain: compiled binaries/DLLs, `node_modules`, `coverage/`, `logs/`, `.DS_Store`, build artifacts, one-off data exports (CSV/XLSX), or another project's leftovers
- Package/solution names match the repo name
- Every repo has a real README: what it is, which profile it follows, how to run it, where it deploys — stock framework READMEs don't count
- Copied workflow files must be renamed and rewired for the current repo — a workflow carrying a previous project's name is a defect
- Git is not a file share: release artifacts go to GHCR/releases, not committed zips
