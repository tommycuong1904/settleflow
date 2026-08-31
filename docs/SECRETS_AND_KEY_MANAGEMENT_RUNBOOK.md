# Secrets & Key Management Runbook

## Scope

This document defines management only; it contains no secret values.

## Variables

Protect `SETTLEFLOW_AUTH_SECRET`, `ARC_SERVER_PRIVATE_KEY`, `DATABASE_URL`, `SETTLEFLOW_TEST_DATABASE_URL`, and server webhook configuration. `NEXT_PUBLIC_*` variables are client-exposed configuration, not secret storage.

## Rules

Use unique values per environment, least-privilege access, environment-scoped storage, and role-based access. Never commit secrets, print values during diagnostics, expose signing keys through `NEXT_PUBLIC_*`, or reuse production signing keys in staging.

## Rotation and incidents

Security/Key Custodian owns generation, access review, rotation, revocation, and suspected exposure response. Rotate authentication secrets with a planned session impact. Immediately disable/revoke an exposed signing key, freeze releases, and reconcile possible transactions before replacement.

## Verification

Deployment checks confirm required variable presence without displaying values. Production must fail closed when `SETTLEFLOW_AUTH_SECRET` is absent. `ARC_SERVER_PRIVATE_KEY` must exist only in the explicitly approved server environment and must never be used for diagnostics or tests.
