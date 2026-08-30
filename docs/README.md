# Docs Guide

## Entry point
- `../CONTEXT.md` (repo root) — one-file cheat sheet for any new model/agent. **Read it first.**
- `AGENTS.md` (repo root) — task routing rules (which doc to load per workflow).

## Documentation hierarchy and ownership

| Document | Owns |
|---|---|
| `PROJECT.md` | Stable product/project context |
| `ARCHITECTURE.md` | Current architecture and data flow |
| `DOMAIN_MODEL.md` | Implemented domain model |
| `WORKFLOW_STATE_MACHINE.md` | Implemented workflow/state behavior |
| `AUTHORIZATION.md` | Authorization model |
| `SECURITY_INVARIANTS.md` | Security invariants |
| `CURRENT_STATE.md` | Live current state and verification |
| `FEATURE_MATRIX.md` | Feature-level status |
| `REAL_PRODUCT_ROADMAP.md` | Future work and sequencing |

Runtime code is authoritative for behavior; `prisma/schema.prisma` and migrations are authoritative for persistence. Canonical docs describe verified implementation, `CURRENT_STATE.md` summarizes live status, the feature matrix summarizes feature status, and the roadmap describes future intent. Documentation does not override code or schema. `CURRENT_STATE.md`, `FEATURE_MATRIX.md`, and `REAL_PRODUCT_ROADMAP.md` are not implementation evidence by themselves. Archive material is historical/reference-only until independently re-verified.

## Read before coding

Use the task-specific loading rules in `AGENTS.md`; do not read every document for every task. As a shortcut: auth → authorization/security/architecture; domain/database → domain/architecture; workflow → workflow/domain/authorization; Arc/release → architecture/security/workflow; UI/product → project/current state; planning → current state/feature matrix/roadmap.

## Canonical Docs (read these first)
1. `PROJECT.md` — product vision (why/what)
2. `ARCHITECTURE.md` — how the system fits together
3. `CONVENTIONS.md` — code/test/doc conventions
4. `CURRENT_STATE.md` — current state; **single source of truth for live numbers**

These are the primary reference set for understanding the product, architecture, repository conventions, and current implementation state.

## Supporting Docs (secondary references)
- `PROJECT_MAP.md` — repository structure map
- `DOMAIN_MODEL.md` — domain entities
- `WORKFLOW_STATE_MACHINE.md` — payout/milestone/release/proof state transitions
- `FEATURE_MATRIX.md` — feature-by-feature status table
- `KNOWN_ISSUES.md` — known gaps and risks
- `REAL_PRODUCT_ROADMAP.md` — roadmap & phases
- `HANDOFF.md` — handoff notes + recommended next steps
- `DEMO_GUIDE.md` — step-by-step demo walkthrough
- `GOOGLE_OAUTH_SETUP.md` — Google OAuth client setup
- `screenshots/` — demo screenshots

## Archive
Archived files live under `archive/` — kept for historical reference, **not** current truth.
Includes the earlier `architecture.md`, `project-status.md`, `workboard.md`, plus superseded planning/checkpoint docs (`API_PLAN.md`, `DB_SCHEMA.md`, `IMPLEMENTATION_PLAN.md`, `mvp-scope.md`, `WALLET_ONBOARDING_PLAN.md`, `MERGE_PREP_AUTH_BOUNDARY_V1.md`, `PR_BODY_AUTH_BOUNDARY_V1.md`, `checkpoint-2-*`, `core-release-wedge-progress.md`, `progress-summary-checkpoint-2.md`).

## Notes
- Prefer canonical docs over older planning/checkpoint files when there is a conflict.
- For any live number (test count, phase status, commit), trust `docs/CURRENT_STATE.md`.
- `docs/archive/` preserves prior planning context while keeping the main `docs/` directory lean.
- Claims that materially affect engineering decisions must be traceable to current code/schema or a canonical implementation document. Use `Implemented`, `Partially implemented`, `Planned`, or `Not verified` rather than vague status labels.
