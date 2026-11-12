# MSISDN & PII Handling

The MSISDN is the universal subscriber identifier across all YellowDot products. It is PII and must be treated as such in every service.

- Normalize at the boundary: store MSISDNs in E.164 without `+` (use libphonenumber-js / libphonenumber-csharp at ingestion; never store mixed local/international formats)
- Mask in logs: log at most the last 3–4 digits (`****1234`); never log full MSISDNs, even at debug level
- Never put an MSISDN in a URL query string, error message, or analytics event
- Databases: MSISDN columns are not exported, dumped to shared locations, or copied into lower environments unmasked
- Winner/draw exports (CSV/XLSX) containing MSISDNs are delivery artifacts, not repo content — never commit them
- Blacklist/DND status must be checked before outbound SMS or billing actions (blacklist-api / DND service patterns)
- Retention: follow the per-market regulatory requirement; when in doubt, ask before persisting new MSISDN-keyed data
- The yellowdot-os guard hook blocks agent writes that contain a full MSISDN; synthetic test numbers need `yellowdot-os:allow-msisdn` on the same line — never real subscriber numbers
- Agents and AI tools never receive unmasked MSISDNs — not in prompts, fixtures, screenshots, or MCP tool results (see `agent-config.md`)

## Market-specific obligations (2026)

Confirm current obligations with compliance before shipping; these change.

- **South Africa:** direct-marketing flows (promo SMS, win-back, cross-sell) check the national opt-out registry under the CPA Amendment Regulations (in force 15 Apr 2026) in addition to POPIA s69 consent and DND
- **Nigeria:** breach clocks are short — NCC cyber-incident notice within 4 hours and subscriber notice within 48 hours, on top of NDPA notification to the NDPC; the incident runbook must be able to identify affected MSISDNs within that window
