# Agent Instructions

## Before starting

Read these files in order:

1. docs/README.md
2. docs/PROJECT.md
3. docs/ARCHITECTURE.md
4. docs/CONVENTIONS.md
5. docs/CURRENT_STATE.md
6. The assigned task file

Do not scan the entire repository unless necessary.

## Working rules

- Work on one task at a time.
- Inspect existing code before editing.
- Prefer modifying existing patterns over introducing new ones.
- Do not change unrelated files.
- Do not install new dependencies without explaining why.
- Do not modify environment files or secrets.
- Do not delete working functionality to simplify the task.

## Execution process

1. Restate the task.
2. Identify relevant files.
3. Propose a short implementation plan.
4. Implement the smallest valid change.
5. Run relevant tests.
6. Run lint and build checks.
7. Review the diff.
8. Report the result.

## Stop conditions

Stop and ask for clarification when:

- The task conflicts with architecture documentation.
- Required credentials are missing.
- A destructive database migration is required.
- The implementation would affect unrelated modules.
- The acceptance criteria cannot be verified.

## Completion report

Return:

- Summary
- Files changed
- Tests executed
- Test results
- Assumptions
- Remaining risks

## Existing project stabilization rules

- Preserve currently working behavior.
- Do not perform repository-wide refactors.
- Do not move files unless required by the active task.
- Do not replace libraries only for stylistic reasons.
- Follow existing patterns when they are functional.
- Document inconsistencies instead of fixing all of them immediately.
- Separate bug fixes from refactoring.
- Make the smallest reversible change.