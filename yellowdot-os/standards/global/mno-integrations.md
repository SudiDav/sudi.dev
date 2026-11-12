# MNO Integration Knowledge Base (index)

Recurring integration domains across YellowDot products. This is the index; each area should grow into its own standard/guide as knowledge is extracted from the reference services.

| Area | What it covers | Reference implementations |
|---|---|---|
| SDP subscription billing | subscribe/unsubscribe flows, renewal callbacks, charge results | fortress-api SubscriptionManagement, YDApps SDP.api, sdp-callback-service |
| Operator wrappers | per-MNO API quirks (MTN SA/GH/Congo/NG, Vodacom SA, Telkom SA, Orange CI/Liberia, Glo NG, Telecel) | fortress-api *Wrapper services, LuckyNumber renderers |
| Callback/webhook ingestion | MNO + aggregator event callbacks, idempotency, replay | EventReceivingService, sdp-callback-service, ProcessSubCallbacks |
| SMS delivery | Kannel integration, DLR (delivery report) handling, sender IDs | sms-kannel-api |
| USSD | session handling, per-operator menu rendering (JSON/plaintext), i18n | LuckyNumber |
| Draws → winners → payouts | draw pipelines, winner selection, disbursement (e.g. Orange Money), notification | winning-number-2025 lineage, OrangeMoney, scheduled-jobs |
| Rewards crediting | airtime/voucher crediting via internal Recharge/Say Thanks/Auth services | rewards-api family |
| Identity & multi-tenancy | Keycloak realms, LDAP associations claim pipeline, tenant scoping | sdp-security, fortress-api Shared.Auth, TriviaEngine |

Rules of thumb until the guides exist:

- Callbacks are at-least-once: every callback handler must be idempotent
- Never trust client-submitted results for anything that pays out — server-side or event-driven scoring only
- Per-operator behavior is configuration/strategy, not `if (operator == "MTN")` scattered through business logic
