# SettleFlow Documentation

Runtime code is authoritative for behavior; `prisma/schema.prisma` and migrations are authoritative for persistence. This directory separates stable product meaning, current implementation, and future intent.

## Canonical sources of truth

| Document | Owns |
|---|---|
| `PROJECT.md` | Product definition, problem, scope, boundaries |
| `DOMAIN_MODEL.md` | Persisted entities, relationships, ownership semantics |
| `AUTHORIZATION.md` | Stored roles, runtime actors, permissions, authorization rules |
| `SECURITY_INVARIANTS.md` | Security/integrity invariants and limitations |
| `WORKFLOW_STATE_MACHINE.md` | Payout, milestone, release, and proof lifecycle |
| `ARCHITECTURE.md` | Current technical structure and system boundaries |
| `CURRENT_STATE.md` | Current implementation status, verification, live numbers |
| `FEATURE_MATRIX.md` | Feature-level status summary |
| `KNOWN_ISSUES.md` | Confirmed unresolved issues and risks |
| `REAL_PRODUCT_ROADMAP.md` | Future direction only |
| `CONVENTIONS.md` | Engineering, testing, documentation conventions |
| `PROJECT_MAP.md` | Detailed repository map, when file-level orientation is needed |

## Operational and setup guides

- `DEMO_GUIDE.md` — current demo walkthrough.
- `GOOGLE_OAUTH_SETUP.md` — Google OAuth setup.
- `ARC_STAGING_SAFETY_RUNBOOK.md`, `STAGING_ENVIRONMENT_SPEC.md`, `STAGING_PROVISIONING_CHECKLIST.md`, `STAGING_BOUNDED_TRANSACTION_GATE.md` — staging controls.
- `DEPLOYMENT_RUNBOOK.md`, `OPERATIONS_RUNBOOK.md`, `DATABASE_MIGRATION_RECOVERY_RUNBOOK.md` — deployment and operations.
- `RELEASE_RECONCILIATION_RUNBOOK.md`, `SECRETS_AND_KEY_MANAGEMENT_RUNBOOK.md`, `INCIDENT_RESPONSE_RUNBOOK.md`, `WEBHOOK_ISOLATION_POLICY.md` — specialized operations.

## Reading order

1. `PROJECT.md`
2. `DOMAIN_MODEL.md`
3. `AUTHORIZATION.md` and `SECURITY_INVARIANTS.md`
4. `WORKFLOW_STATE_MACHINE.md`
5. `ARCHITECTURE.md`
6. `CURRENT_STATE.md`
7. Supporting guides as needed

## Historical material

`archive/` contains superseded plans, checkpoints, audits, and handoffs. Archived material is context only and is not current implementation evidence. Recent archived items include:

- `archive/HANDOFF_2026-archive.md`
- `archive/AUTHORIZATION_AUDIT_ROUND_2.md`
- `archive/PRODUCT_ARCHITECTURE_AUDIT.md`
- `archive/DOCS_AUDIT_REPORT.md`

## Maintenance rules

- One question has one canonical document; update cross-references instead of copying facts.
- Use `Implemented`, `Partially implemented`, `Planned`, and `Not verified`.
- Do not mix proposed architecture or historical checkpoints with current behavior.
- When code and docs disagree, follow code/schema and record the drift in `CURRENT_STATE.md` or `KNOWN_ISSUES.md`.
- Operational runbooks remain in `docs/`; completed audits and superseded planning belong in `archive/`.

For task-routing rules see `AGENTS.md`; for repository orientation see `CONTEXT.md`; for developer quick start see the root `README.md`.

Last reviewed on branch `docs/consolidation`. Verify dates and live numbers before merging.
