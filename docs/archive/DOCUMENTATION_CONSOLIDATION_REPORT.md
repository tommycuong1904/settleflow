> **Historical / Superseded — not current SSoT.**

# SettleFlow Documentation Consolidation Report

## 1. Original HEAD

```text
98cfeb3a0751b12be4d69b63469a600b1e645534
```

The working tree was already dirty before this task. Pre-existing application, test, seed, configuration, and documentation changes were preserved.

## 2. Branch

```text
docs/consolidation
```

Created from the original HEAD without resetting or stashing existing changes.

## 3. Documentation changed/moved

### Modified

- `CONTEXT.md`
  - Removed the obsolete active `HANDOFF.md` reference.
  - Clarified that historical handoffs are archived.
- `docs/README.md`
  - Rewritten as the documentation navigation/index.
  - Defines canonical ownership boundaries, archive rules, reading order, and status vocabulary.
- `docs/AUTHORIZATION.md`
  - Corrected unknown-role behavior to match current code: unknown roles throw `UNKNOWN_WORKSPACE_ROLE`.
- `docs/CURRENT_STATE.md`
  - Updated the stale `HANDOFF.md` operational-prerequisite reference.
- `docs/KNOWN_ISSUES.md`
  - Removed the stale `HANDOFF.md` dependency.
- `docs/PROJECT_MAP.md`
  - Updated the handoff path to its archived location.

### Moved to archive

- `docs/HANDOFF.md` → `docs/archive/HANDOFF_2026-archive.md`
- `docs/AUTHORIZATION_AUDIT_ROUND_2.md` → `docs/archive/AUTHORIZATION_AUDIT_ROUND_2.md`
- `docs/PRODUCT_ARCHITECTURE_AUDIT.md` → `docs/archive/PRODUCT_ARCHITECTURE_AUDIT.md`
- `docs/DOCS_AUDIT_REPORT.md` → `docs/archive/DOCS_AUDIT_REPORT.md`

No application, schema, migration, test, configuration, or UI files were created by this consolidation.

## 4. Before → after structure

### Before

The `docs/` directory mixed canonical documents, current-state reports, audits, temporary handoffs, operational runbooks, and historical planning/checkpoint material. Active references to `docs/HANDOFF.md` were stale after the handoff had effectively become historical.

### After

```text
README.md
CONTEXT.md
AGENTS.md

docs/
├── README.md                         canonical navigation/index
├── PROJECT.md                        product definition
├── DOMAIN_MODEL.md                   domain entities and relationships
├── AUTHORIZATION.md                  authorization model
├── SECURITY_INVARIANTS.md            security/integrity invariants
├── WORKFLOW_STATE_MACHINE.md         workflow lifecycle
├── ARCHITECTURE.md                   technical architecture
├── CURRENT_STATE.md                  current implementation status
├── FEATURE_MATRIX.md                 feature status
├── KNOWN_ISSUES.md                   unresolved issues
├── REAL_PRODUCT_ROADMAP.md           future direction
├── CONVENTIONS.md                    engineering/documentation conventions
├── PROJECT_MAP.md                    detailed repository map
├── DEMO_GUIDE.md                     demo guide
├── GOOGLE_OAUTH_SETUP.md             setup guide
├── *RUNBOOK.md                       operational runbooks
├── STAGING_*.md                      staging specifications/checklists/gates
├── WEBHOOK_ISOLATION_POLICY.md       webhook policy
└── archive/
    ├── HANDOFF_2026-archive.md
    ├── AUTHORIZATION_AUDIT_ROUND_2.md
    ├── PRODUCT_ARCHITECTURE_AUDIT.md
    ├── DOCS_AUDIT_REPORT.md
    └── existing historical plans/checkpoints
```

## 5. SSoT responsibility

- `PROJECT.md` — stable product definition, problem, scope, principles, boundaries.
- `DOMAIN_MODEL.md` — persisted entities, relationships, ownership semantics, schema-backed terminology.
- `AUTHORIZATION.md` — workspace roles, runtime actors, role mapping, permissions, authorization boundaries.
- `SECURITY_INVARIANTS.md` — security/integrity invariants, enforcement points, evidence, limitations.
- `WORKFLOW_STATE_MACHINE.md` — payout, milestone, release, proof states and transitions.
- `ARCHITECTURE.md` — current technical architecture, request flow, repository boundaries, Arc integration boundaries.
- `CURRENT_STATE.md` — current implementation status, verification, live numbers, readiness status.
- `FEATURE_MATRIX.md` — compact feature-level status summary.
- `KNOWN_ISSUES.md` — confirmed unresolved issues, gaps, risks, verification limitations.
- `REAL_PRODUCT_ROADMAP.md` — future direction and sequencing only.
- `CONVENTIONS.md` — engineering, testing, naming, documentation conventions.
- `PROJECT_MAP.md` — detailed repository/file structure only.
- `docs/README.md` — documentation navigation and ownership map.
- `DEMO_GUIDE.md` — current demo procedure.
- `GOOGLE_OAUTH_SETUP.md` — Google OAuth setup procedure.
- Operational runbooks — repeatable deployment, staging, release, secret, incident, database, and webhook procedures.
- `docs/archive/**` — historical, superseded, or audit-specific material only.

## 6. Archived files and reasons

- `HANDOFF.md`: temporary checkpoint/handoff content; current status belongs in `CURRENT_STATE.md`, procedures belong in runbooks.
- `AUTHORIZATION_AUDIT_ROUND_2.md`: audit snapshot; current authorization belongs in `AUTHORIZATION.md`.
- `PRODUCT_ARCHITECTURE_AUDIT.md`: historical product/domain assessment; stable product meaning belongs in `PROJECT.md` and current domain semantics in `DOMAIN_MODEL.md`.
- `DOCS_AUDIT_REPORT.md`: prior documentation-audit record; it should not compete with the current index.

Useful historical information was preserved; nothing was deleted merely to reduce file count.

## 7. Important docs-vs-code discrepancies

### Authorization

Prisma stores four workspace roles:

```text
owner, ops, reviewer, contributor
```

Runtime product actors have three values:

```text
owner, reviewer, contributor
```

`ops` maps to runtime `owner`. Unknown roles throw `UNKNOWN_WORKSPACE_ROLE`.

### Payout creation

Current policy remains Owner-only:

```text
owner -> create payout
contributor -> cannot create payout
```

This conflicts with the business scenario where a Contributor should create a payout to hire another Contributor. The docs preserve this as current behavior, not implemented future architecture.

### Contributor semantics

The codebase uses Contributor in two distinct relationships:

- `WorkspaceMember.role = contributor`
- `Payout.contributorId -> Contributor.id`

`Payout.createdByUserId` separately represents the payout creator. The documentation distinguishes these relationships, but application authorization still relies heavily on workspace actors.

### Owner scope and payout permissions

The codebase contains payout creator and assigned-contributor relationships, but several mutation permissions remain Owner-actor based, including parts of payout creation, draft editing/activation, release, proof refresh, retry, and contributor management. This is an authorization design gap, not a documentation-only issue.

### Current-state freshness

`CURRENT_STATE.md` contains historical checkpoint/live-verification claims and dates that should be revalidated before merge. No replacement runtime evidence was invented.

## 8. Decisions requiring human approval

1. Whether payout creation should be a workspace capability available to Contributor members.
2. Whether creation requires workspace membership or only verified User plus workspace access.
3. Whether payout editing belongs to the creator, Owner/admin, explicit payout manager, or a combination.
4. Whether release authorization belongs to creator, Owner/admin, ops, explicit settlement operator, or a combination.
5. Whether Reviewer remains workspace-wide or becomes payout-specific.
6. Whether `ops -> owner` mapping should remain.
7. Whether to add an explicit capability model instead of expanding role semantics.
8. Whether Contributor remains both a workspace role and separate payout-assignee profile.
9. Whether duplicate wallet uniqueness should be enforced at database level in addition to repository guards.
10. Whether legacy API routes must reach exact authorization parity with `/api/v1/**`.

## 9. Git diff summary

Documentation-related working-tree changes showed:

```text
15 documentation/root files changed
221 insertions
385 deletions
```

This summary included pre-existing documentation modifications that were present before the task, plus the consolidation changes.

`git diff --check` completed successfully with no whitespace errors.

No commit or push was performed.

## 10. Application-change confirmation

No application behavior was changed by the consolidation.

No changes were made by this task to:

- application logic;
- Prisma schema;
- Prisma migrations;
- tests;
- configuration;
- UI;
- deployment;
- database;
- running processes.

Pre-existing application/test/schema-related working-tree changes were preserved exactly as found.

**Status: documentation-only branch, uncommitted, waiting for review.**
