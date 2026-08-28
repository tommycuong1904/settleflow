# Docs Guide

## Entry point
- `../CONTEXT.md` (repo root) — one-file cheat sheet for any new model/agent. **Read it first.**
- `AGENTS.md` (repo root) — task routing rules (which doc to load per workflow).

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

