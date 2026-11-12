# CI/CD Requirements

Minimum bar for every active repo:

1. **PR checks**: build + tests + lint run on every pull request; no direct push-to-main deploys for production services
2. **Tests gate deploys**: a deploy workflow that doesn't depend on a green test job is incomplete
3. **No theater**: no `|| true` lint/test/sast stages — a check that can't fail is worse than no check
4. **Pinned actions**: third-party actions pinned to a version (no `@master`)
5. **Two blessed deploy paths** (use the shared reusable workflows, don't hand-roll):
   - Container path: Docker → GHCR → Helm → self-hosted k8s, environment-gated promotion (dev → staging → prod)
   - VM path (legacy/simple services): SSH + docker-compose via the shared workflow, per-repo deploy key
6. **Environments**: prod deploys go through GitHub environment protection with named approvers; secrets live in environments, not repo-level plaintext
7. **Runner labels tell the truth** about where and how a workflow deploys
