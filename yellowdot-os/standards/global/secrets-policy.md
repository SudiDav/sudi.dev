# Secrets Policy

Non-negotiable, all repos, all stacks.

- No credentials in committed files: no passwords/API keys/JWT signing secrets in `appsettings*.json`, `.env`, source code, or workflow files. Committed `appsettings.json` holds structure only; values come from environment/k8s secrets/GitHub environments
- `.env.example` documents required keys; real `.env` is gitignored
- No PATs or tokens embedded in git remote URLs, scripts, or compose files
- No hardcoded infrastructure IPs or internal hostnames in workflows and source — use secrets/vars
- Deploy keys are per-repo, not shared across repos (retire shared org-wide SSH keys)
- If a secret lands in git history: rotate it immediately first, then clean up — rotation is the fix, history rewriting is cosmetic
- Frontends: nothing secret goes in `VITE_*`/client bundles; auth credentials do not belong in frontend env files
