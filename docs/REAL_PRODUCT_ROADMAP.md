# REAL PRODUCT ROADMAP

Status: current
SSoT: Product priorities and future planning
Last verified: 2026-08

## Goal

Move SettleFlow from an active MVP implementation toward a reliable, operable payout product without overstating the readiness of live settlement.

## Current position

Core payout, milestone, session, workspace, contributor, proof, and mode-aware Arc execution paths exist in code. The remaining roadmap focuses on verification, operational hardening, and explicitly future product capabilities. See `docs/CURRENT_STATE.md` for live facts.

## Reliability and hardening checkpoint

Completed at `6004b05`:

1. Committed DB-backed route-level integration for authenticated, workspace-scoped authorization and release flows.
2. Verification of release failure, retry, proof-refresh, duplicate prevention, actor tampering, and cross-workspace behavior.
3. Isolated PostgreSQL test database infrastructure and safe non-executing test paths.

Browser/E2E coverage and deterministic concurrency remain deferred. Reliability verification does not claim production-safe payments.

## Then: ship-ready MVP

1. Define deployment and migration runbooks.
2. Confirm production authentication/session configuration and secret management.
3. Establish release reconciliation/observability expectations.
4. Validate Arc operational and compliance requirements for the selected execution mode.

Before any controlled real Arc staging transaction, establish a dedicated staging environment/database and wallet, secret custody/rotation, transaction guardrails, reconciliation, monitoring, incident recovery, webhook destination isolation, and explicit staging approval.

No delivery dates are assigned here.

## Phase 4 operational sequence

1. **4A — Operational Documentation & Safety Planning:** establish the runbook set, ownership, environment matrix, and explicit safety gates.
2. **4B — Staging Infrastructure Isolation:** provision independently scoped staging app, database, secrets, wallet, webhook destination, and monitoring.
3. **4C — Approved Production-Code Hardening:** only narrowly approved limits, idempotency/concurrency, reconciliation, logging, or execution-mode controls.
4. **4D — Staging Verification Without Transaction:** verify deployment, migration, auth, isolation, monitoring, and incident procedures without sending funds.
5. **4E — Real Arc Staging:** one bounded transaction only after a separate written safety gate and explicit approval.
6. **4F — Post-Transaction Reconciliation & Documentation:** reconcile proof/state, record incidents, and decide next steps.

Real Arc execution is **NOT AUTHORIZED** by this roadmap until all required gates are satisfied.

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
