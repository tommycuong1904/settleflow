# Investigate Workflow

## Goal

Diagnose behavior with the minimum amount of context before deciding whether a code change is needed.

## Process

1. Restate the observed behavior or question.
2. Locate the nearest relevant implementation.
3. Inspect only the files needed to explain the behavior.
4. Form one diagnosis hypothesis at a time.
5. Validate only what is needed to confirm or reject the hypothesis.
6. Stop once the cause, uncertainty, or next safe action is clear.

## Rules

- Do not modify code unless the task explicitly includes a fix.
- Do not scan the repository.
- Do not run full lint or build by default.
- Do not inspect unrelated files.
- Escalate to another primary workflow only if the task changes from diagnosis to implementation or review.
