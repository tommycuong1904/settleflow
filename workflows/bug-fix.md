# Bug Fix Workflow

## Goal

Resolve a bug using the minimum amount of context.

## Process

1. Read the reported error carefully.
2. Locate the most likely responsible file.
3. Inspect only that implementation.
4. Inspect direct imports only if needed.
5. Form one implementation hypothesis.
6. Apply the smallest possible fix.
7. Validate only the affected behavior.
8. Stop.

## Rules

- Do not scan the repository.
- Do not redesign the implementation.
- Do not refactor unrelated code.
- Do not introduce new abstractions.
- Do not fix nearby issues.
- Do not run the full build unless requested.
- Stop after the bug is fixed.