# Agent Instructions

## Before starting

Use this file as the single execution router.

Load docs progressively by task type. Do not read docs by default.
Read only as far as needed, and only when the active workflow requires it.

Read `CONTEXT.md` (repo root) first — it is the one-file cheat sheet: stack, key commands, structure, doc map.
`docs/CURRENT_STATE.md` is the single source of truth for live numbers (test count, phase status, current commit).
Historical/planning/checkpoint docs live under `docs/archive/` and are not current truth.

## Documentation source of truth

Use this precedence when documentation and implementation disagree:

1. Runtime source code — actual behavior, routes, validation, authorization, and execution.
2. `prisma/schema.prisma` and migrations — persisted models, relations, enums, and database constraints.
3. Canonical implementation docs — architecture, domain, workflow, authorization, and security.
4. `docs/CURRENT_STATE.md` — current verified status and limitations.
5. `docs/FEATURE_MATRIX.md` — feature-level status.
6. `docs/REAL_PRODUCT_ROADMAP.md` — future intent and sequencing.
7. `docs/archive/**` — historical/reference material only.

Documentation does not override implementation. Verify against code when statements conflict; verify against Prisma when persistence facts conflict.

### Read before coding

Load only the task-specific documents needed:

- Authentication: `AUTHORIZATION.md`, `SECURITY_INVARIANTS.md`, `ARCHITECTURE.md`
- Authorization/workspace: `AUTHORIZATION.md`, `SECURITY_INVARIANTS.md`, `DOMAIN_MODEL.md`
- Database/domain: `DOMAIN_MODEL.md`, `ARCHITECTURE.md`
- Payout/milestone/release: `WORKFLOW_STATE_MACHINE.md`, `DOMAIN_MODEL.md`, `AUTHORIZATION.md`; add `SECURITY_INVARIANTS.md` when relevant
- Arc/release execution: `ARCHITECTURE.md`, `SECURITY_INVARIANTS.md`, `WORKFLOW_STATE_MACHINE.md`
- UI/product behavior: `PROJECT.md`, `CURRENT_STATE.md`, and relevant domain/workflow docs
- Planning: `CURRENT_STATE.md`, `FEATURE_MATRIX.md`, `REAL_PRODUCT_ROADMAP.md`

When changing routes, models/enums, policy, security boundaries, state transitions, or feature implementation, check the affected canonical docs for drift. Do not treat roadmap entries, feature-matrix entries, archives, or historical plans as implementation evidence. Prefer the status terms `Implemented`, `Partially implemented`, `Planned`, and `Not verified`; implemented-in-development is not production-ready. Preserve pre-existing working-tree changes and never reset or discard unrelated changes.

Task-based doc loading rules:

- `bug`
  - default: no docs
  - load `docs/CURRENT_STATE.md` only if the bug depends on current flow/state
  - load `docs/CONVENTIONS.md` only if the fix depends on naming/structure conventions
- `ui`
  - default: no docs
  - load `docs/CONVENTIONS.md` only when existing code does not make the design/style pattern clear
  - load `docs/CURRENT_STATE.md` only if the UI depends on current flow/state
- `feature`
  - load first: `docs/PROJECT.md`, `docs/CURRENT_STATE.md`
  - load `docs/ARCHITECTURE.md` only if needed
  - load `docs/CONVENTIONS.md` only if needed
- `investigate`
  - default: no docs
  - load `docs/CURRENT_STATE.md` or `docs/ARCHITECTURE.md` only if needed to explain behavior
- `review`
  - default: no docs
  - load `docs/CONVENTIONS.md` only if needed for standards
  - load `docs/PROJECT.md` only if needed for product-fit review
- `release`
  - load first: `docs/CURRENT_STATE.md`
  - do not load `docs/CONVENTIONS.md` by default

Also load the assigned task file if one exists and is relevant to the active task.

Do not scan the entire repository unless necessary.
Do not reread files already inspected during the current task unless they changed or a specific detail must be re-verified.

## Working rules

- Work on one task at a time.
- Inspect existing code before editing.
- Prefer modifying existing patterns over introducing new ones.
- Do not change unrelated files.
- Do not install new dependencies without explaining why.
- Do not modify environment files or secrets.
- Do not delete working functionality to simplify the task.

## Execution process

1. Route the task to one primary workflow.
2. Identify only the nearest relevant files.
3. Load docs only if the selected workflow requires them.
4. Form a minimal implementation plan internally.
5. Implement the smallest valid change.
6. Validate the narrowest affected behavior first.
7. Run lint and build only when required by the workflow or risk level.
8. Review the relevant diff.
9. Report the result briefly.

Do not output an implementation plan for routine tasks unless requested.

## Stop conditions

Stop and ask for clarification when:

- The task conflicts with architecture documentation.
- Required credentials are missing.
- A destructive database migration is required.
- The task requires significant changes outside the reasonably inferred scope.
- The acceptance criteria cannot be verified.

## Completion report

Keep the final report concise.

Return:

- Summary
- Files changed
- Validation performed
- Remaining risks, only if any

Do not include empty sections.

## Existing project stabilization rules

- Preserve currently working behavior.
- Do not perform repository-wide refactors.
- Do not move files unless required by the active task.
- Do not replace libraries only for stylistic reasons.
- Follow existing patterns when they are functional.
- Document inconsistencies instead of fixing all of them immediately.
- Separate bug fixes from refactoring.
- Make the smallest reversible change.

## Specialized Workflows

Use only ONE primary workflow per task.

Primary workflows:

- bug → `workflows/bug-fix.md`
- ui → `workflows/ui-change.md`
- feature → `workflows/feature.md`
- investigate → `workflows/investigate.md`
- review → `workflows/review.md`
- release → `workflows/release.md`

Supporting rules:

- `workflows/search.md` is a supporting locate-code rule, not a primary workflow.
- `workflows/testing.md` is a supporting validation rule, not a primary workflow.

Short routing aliases:

- `bug:` → `bug`
- `ui:` → `ui`
- `feature:` → `feature`
- `investigate:` → `investigate`
- `review:` → `review`
- `release:` → `release`

### Short command behavior

User instructions may be intentionally brief and may be written in Vietnamese or English.

When a short routing alias is present, select that workflow directly.
Treat everything after the alias as the task instruction.

Examples:

- `ui: làm hero gọn hơn` → workflow: `ui`
- `bug: sửa lỗi connect wallet` → workflow: `bug`
- `feature: thêm transaction history` → workflow: `feature`
- `investigate: tìm nguyên nhân balance không cập nhật` → workflow: `investigate`

Do not ask the user to restate workflow rules already defined in this file.
Do not ask the user to translate Vietnamese instructions.

For short commands, infer the relevant scope from the nearest existing implementation.

Ask for clarification only when a missing decision would materially change the implementation.

Fallback routing:

- broken behavior / fix request → `bug`
- visual/layout/style change → `ui`
- new capability / flow addition → `feature`
- trace / diagnose / explain behavior → `investigate`
- no-edit audit / assessment → `review`
- pre-ship verification → `release`
