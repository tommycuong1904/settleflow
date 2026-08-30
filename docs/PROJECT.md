# PROJECT

Status: current
SSoT: Product decisions and stable project context
Last verified: 2026-08

> Stable product and project context. For implementation status, see `docs/CURRENT_STATE.md`.

## Product

SettleFlow is an Arc-native USDC payout workflow for crypto teams. It turns contributor compensation into a milestone-based agreement with approval-gated release and onchain settlement proof.

## Problem

Teams often manage contributor payments through chats, spreadsheets, and manual wallet transfers. That makes payout state, approval responsibility, release timing, and settlement evidence difficult to track consistently.

## Product concept

The stable product loop is:

1. Create a payout agreement.
2. Split the agreement into milestones.
3. Submit evidence of completed work.
4. Review and approve or reject the milestone.
5. Release USDC after approval.
6. Retain and display settlement proof.

The product is organized around explicit workflow state, workspace-scoped records, role-aware actions, and a clear distinction between approval and settlement.

## Users

Primary users are founders, operations leads, PMs, and team leads at crypto-native teams. Contributors are secondary users who submit milestone work and receive settlement.

## Stable scope

SettleFlow covers:

- milestone-based contributor payout agreements;
- workspace-scoped contributor and payout records;
- submission, review, approval, rejection, release, and proof states;
- USDC settlement on Arc;
- role-aware team operations and settlement visibility.

The current authorization model is documented in `docs/AUTHORIZATION.md`. Security guarantees and limitations are documented in `docs/SECURITY_INVARIANTS.md`.

## Product principles

- Approval precedes release.
- Every release should have inspectable settlement evidence.
- Workspace boundaries must be respected.
- Product permissions must be explicit rather than inferred from UI visibility.
- Arc and USDC remain central to the settlement experience.
- Product documentation should distinguish stable concepts from current implementation status.

## Out of scope

The product context does not promise capabilities that are not part of the verified current system, including:

- arbitrary multi-chain settlement or bridging;
- escrow smart-contract functionality unless separately verified;
- multi-signature approval thresholds;
- KYC/KYB or onchain identity attestations;
- production operational guarantees for custody, funding, compliance, or payment reliability.

Current implementation readiness and open gaps belong in `docs/CURRENT_STATE.md` and `docs/REAL_PRODUCT_ROADMAP.md`, not in this stable context document.

## Related canonical documents

- `docs/CURRENT_STATE.md` — live implementation status and numbers.
- `docs/ARCHITECTURE.md` — current system structure and data flow.
- `docs/AUTHORIZATION.md` — current roles, actors, and permissions.
- `docs/SECURITY_INVARIANTS.md` — current security and integrity invariants.
- `docs/REAL_PRODUCT_ROADMAP.md` — planned product hardening and future work.
