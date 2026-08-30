# REAL PRODUCT ROADMAP

Status: current
SSoT: Product priorities and future planning
Last verified: 2026-08

## Goal

Move SettleFlow from an active MVP implementation toward a reliable, operable payout product without overstating the readiness of live settlement.

## Current position

Core payout, milestone, session, workspace, contributor, proof, and mode-aware Arc execution paths exist in code. The remaining roadmap focuses on verification, operational hardening, and explicitly future product capabilities. See `docs/CURRENT_STATE.md` for live facts.

## Next: reliability and hardening

1. Add committed route-level integration and browser/E2E coverage for authenticated and workspace-scoped flows.
2. Verify failure, retry, proof-refresh, and idempotency behavior across release paths.
3. Establish operational controls for server signing keys, funding, gas/fee handling, monitoring, and incident recovery.
4. Reconcile remaining legacy mock/demo paths and document any intentionally retained development fallback.

Why: implementation exists, but these checks are required before claiming production-safe payments or broad regression confidence.

## Then: ship-ready MVP

1. Define deployment and migration runbooks.
2. Confirm production authentication/session configuration and secret management.
3. Establish release reconciliation/observability expectations.
4. Validate Arc operational and compliance requirements for the selected execution mode.

No delivery dates are assigned here.

## Future product capabilities

These are not current commitments or implemented behavior:

- escrow smart-contract settlement;
- multi-chain/CCTP bridging;
- multi-signature approval thresholds;
- KYC/KYB or identity-attestation integrations;
- additional workspace and operational administration features.

Each future capability requires a separate design and verification pass before being treated as part of the implemented product.

## Sequencing principles

- Preserve the current repository, API, Prisma, authorization, and release boundaries while hardening them.
- Prefer evidence from code, tests, and controlled environments over status labels.
- Keep live status in `docs/CURRENT_STATE.md`, feature status in `docs/FEATURE_MATRIX.md`, and detailed rules in their canonical documents.
- Do not equate “implemented in development” with “production ready.”
