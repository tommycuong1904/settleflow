# FEATURE MATRIX

Status: current
SSoT: Current implementation + canonical docs
Last verified: 2026-08

| Feature | Status | Evidence / boundary |
| --- | --- | --- |
| Landing and product shell | Implemented | `app/(marketing)/**`, `app/(app)/layout.tsx` |
| Payout create/list/detail/edit | Implemented | `app/api/v1/payouts/**`, `lib/repositories/payout*.ts`, `app/(app)/payouts/**` |
| Payout activation validation | Implemented | `activatePayout`, target wallet and milestone-total checks |
| Milestone submission and resubmission | Implemented | `submitMilestone`, `lib/repositories/milestone-submission.ts` |
| Milestone approval/rejection | Implemented | `reviewMilestone`, required rejection comment |
| Release queue and proof records | Implemented | `queueMilestoneRelease`, `refreshReleaseProof` |
| Arc browser-wallet path | Partially implemented | Browser boundary exists; server executor fails explicitly for `browser_wallet` |
| Arc server release path | Implemented in code; operationally unverified | `createReleaseExecutor`, `ARC_SERVER_PRIVATE_KEY`, viem send path; not production-ready |
| Release retry | Implemented | `retryFailedRelease`, retry API route |
| Session authentication | Implemented for current MVP flow | Google/wallet auth routes, signed `sf_session`, `proxy.ts` gate |
| Workspace membership and actor mapping | Implemented | Prisma retains Ops and Reviewer for historical memberships; new invitations support Owner and Contributor only |
| Operation authorization | Implemented | `lib/runtime/product-policy.ts` and session-aware v1 handlers |
| Contributor create/edit/archive | Implemented | contributor routes/repository; EVM validation and duplicate-wallet guard |
| Activity ledger and CSV export | Implemented | activity repositories and `/activity` surface |
| Workspace webhook settings/test | Implemented | settings and webhook routes/repository |
| Owner/Contributor MVP policy | Implemented | Owner-only review/release; Contributor submit/resubmit; Reviewer/Ops retained only for historical data |
| Web3-only release | Implemented | `browser_wallet` is the sole enabled new-release mode; Circle Smart Wallet is Coming soon |
| In-app notifications | Implemented for MVP events | workspace/user-scoped submit, decision, and release-result notifications with read state |
| Browser Push notifications | Implemented, configuration required | opt-in Settings control, service worker, scoped subscriptions, and VAPID delivery; requires environment VAPID keys and operational delivery verification |
| Automated test coverage | Implemented, scope limited; operational verification not implied | Unit and DB-backed route integration are committed; Playwright smoke covers public Web3-first authentication boundaries; authenticated workflow E2E and deterministic concurrency remain deferred |
| Escrow smart contract | Planned | No implemented escrow contract path verified |
| Multi-chain bridging | Planned | No implemented bridge path verified |
| Multi-signature approval | Planned | No implemented threshold model verified |
| KYC/KYB attestation | Planned | No implemented attestation integration verified |

## Status definitions

- **Implemented** — behavior is directly represented by current code and/or schema.
- **Partially implemented** — an implementation path exists, but an important boundary or verification gap remains.
- **Planned** — future capability; not presented as current behavior.

Detailed domain and workflow semantics are in `docs/DOMAIN_MODEL.md` and `docs/WORKFLOW_STATE_MACHINE.md`. Authorization and security boundaries are in `docs/AUTHORIZATION.md` and `docs/SECURITY_INVARIANTS.md`.
