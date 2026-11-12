# Tech Stack — Org Baseline

Org-wide constants. Stack-specific detail lives in each profile's `tech-stack.md` (dotnet-service, node-api, game-frontend, infra).

## Constants across YellowDot / KHM

- **Database:** MySQL/MariaDB is the relational store everywhere (Postgres only as a vendored dependency of third-party systems like Keycloak)
- **Identity:** Keycloak (OIDC/JWT) with the LDAP associations pipeline (sdp-security)
- **Caching/queues:** Redis; BullMQ (Node) / background workers (.NET); Kafka for cross-service events on the platform stacks
- **Observability:** structured logging shipped to Grafana Loki; OpenTelemetry where supported
- **Source & CI:** GitHub (khm-technology org) + GitHub Actions, self-hosted runners for k8s deploys
- **Hosting:** self-hosted bare metal — Proxmox VE + Ceph, self-hosted Kubernetes (fortress-prod, games-prod namespaces), plus legacy nginx VMs
- **Registry:** GHCR for container images
- **Domain:** MSISDN-keyed subscriber products (games, trivia, draws, rewards) integrated with African MNOs via SDP billing, USSD, and SMS
