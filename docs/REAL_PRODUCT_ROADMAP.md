# SettleFlow Real Product Roadmap

## Goal
Turn SettleFlow from a demo-oriented prototype into a real usable MVP for milestone-based contributor payouts on Arc.

## Product Rules
- Existing flows/pages are no longer treated as demo surfaces.
- Existing flows must prefer real data, real state, real permissions, and real product behavior.
- Only brand-new pages may use temporary mockup/demo UI before real data wiring.
- Arc execution decisions must rely only on official Arc documentation.

## Phase status snapshot (as of `main` `38129aa`)

| Phase | Status | Notes |
| :--- | :--- | :--- |
| 1 — De-demo existing flows | **Mostly done** | Real payout creation + real detail redirect work; seeded demo IDs (`ws-demo`, `payout-1/2`) remain in seed/demo paths |
| 2 — Real workflow state machine | **Done** | Payout/milestone/proof states, activity logging, reload-safe persistence implemented |
| 3 — Real actors and permissions | **In progress** | Product-context actor boundary + route-level role checks exist, but remain seeded; no stored membership model |
| 4 — Auth/session | **Scaffold only** | Google sign-in route + smart-account address derivation exist; no server-side session/middleware |
| 5 — Workspace productization | **Mostly done** | Payout list/filters, real-data dashboard, contributor add/list (`/contributors`), settings; contributor edit/archive missing |
| 6 — Real Arc execution path | **Not started** | `createReleaseExecutor` still returns "not wired yet" failures |
| 7 — Reliability and hardening | **In progress** | 16 unit tests + idempotent release retry; no route/E2E tests yet |
| 8 — Ship-ready MVP | **Not started** | Legacy mock cleanup and ops docs pending |

## Phase 1 — De-demo existing flows
### Objective
Convert current payout surfaces into real product entry points.

### Tasks
1. Remove demo assumptions from `/payouts/new`, `/payouts/[id]`, dashboard, and release/proof/retry surfaces.
2. Stop relying on seeded IDs like `payout-1` / `payout-2` as primary workflow entry points.
3. Replace hardcoded values such as `ws-demo`, `user-owner`, `user-reviewer`, `user-contrib` in runtime product flows.
4. Make payout creation redirect to the real created payout detail page.
5. Ensure payout detail reads real persisted data.

### Done when
- A new payout can be created from the website.
- The app opens the real payout detail page for that new record.
- Primary testing no longer depends on seeded payout routes.

## Phase 2 — Real workflow state machine
### Objective
Make the full payout workflow persist and behave consistently.

### Tasks
1. Finalize payout states: `draft -> active -> partially_released -> completed`.
2. Finalize milestone states: `pending -> submitted -> approved/rejected -> released`.
3. Finalize proof states: `pending -> confirmed/failed`.
4. Harden create/update/activate/review/release/proof/retry transitions.
5. Add activity logging for important mutations.
6. Ensure reload-safe state persistence.

### Done when
- A payout can move through its real lifecycle without mock state.
- Reloads preserve true workflow state.

## Phase 3 — Real actors and permissions
### Objective
Replace hardcoded actors with workspace/user boundaries.

### Tasks
1. Use real `User`, `Workspace`, `WorkspaceMember`, and `Contributor` boundaries.
2. Finalize minimal roles: `owner`, `ops`, `reviewer`, `contributor`.
3. Resolve mutation permissions from stored membership, not hardcoded IDs.
4. Remove demo actor assumptions from UI payloads.

### Done when
- Runtime actions no longer depend on hardcoded actor IDs.
- Permission checks reflect stored workspace membership.

## Phase 4 — Auth/session
### Objective
Introduce real user identity for product operation.

### Tasks
1. Implement sign-in/sign-out/session handling.
2. Protect mutation routes and workspace routes.
3. Resolve current actor from session.
4. Scope UI and data by workspace membership.

### Done when
- Users can log in.
- Protected flows require a real session.
- Workspace data is user-scoped.

## Phase 5 — Workspace productization
### Objective
Make SettleFlow usable as a team operations product.

### Tasks
1. Build payout list and filters from real data.
2. Make dashboard fully real-data-driven.
3. Add contributor management (create/list done; edit/archive pending).
4. Add basic workspace settings.

### Done when
- A team can create, inspect, and operate payouts without seeded routes.

## Phase 6 — Real Arc execution path
### Objective
Move release execution from scaffold to real settlement integration.

### Tasks
1. Re-check execution requirements against official Arc docs only.
2. Choose supported execution path: browser wallet, circle wallet, or both with one shared state machine.
3. Implement real send path.
4. Persist tx hash, initiated/confirmed timestamps, failure reason, and explorer link.
5. Finalize reconcile strategy: synchronous where possible, async refresh where required.

### Done when
- Release no longer returns synthetic transaction data.
- Proof is attached to real transaction data.
- Failure/retry behavior is explicit and testable.

## Phase 7 — Reliability and hardening
### Objective
Make the MVP safe to iterate on.

### Tasks
1. Add tests for repositories, state transitions, permissions, and critical routes (unit payload/repository tests exist; route/E2E tests are still missing).
2. Add idempotency and duplicate protection.
3. Improve UI error surfaces.
4. Improve logging and diagnostics.
5. Clean up validation and migration hygiene.

### Done when
- Core payout workflow has meaningful regression protection.
- Common failures are debuggable.

## Phase 8 — Ship-ready MVP
### Objective
Finish the usable MVP surface and clean the repo directionally.

### Tasks
1. Polish loading/error/empty/success states.
2. Remove or isolate legacy mock/demo artifacts.
3. Finalize deploy/config/runtime docs.
4. Write operational usage notes.

### Done when
- The repo, docs, and runtime all describe a real MVP consistently.
- The MVP can be deployed, tested, and operated without demo-first assumptions.

## Delivery order
### Sprint A — Immediate
1. De-demo `/payouts/new`. *(done)*
2. Real payout creation -> real payout detail redirect. *(done)*
3. De-demo `/payouts/[id]`. *(done)*
4. Make dashboard read real data. *(done)*
5. Stop using seeded payouts as the main workflow path. *(partial — seeded demo IDs remain)*

### Sprint B — Usable product core
6. Real actors and permissions. *(in progress — seeded product-context boundary only)*
7. Auth/session. *(scaffold only — Google sign-in route, no session)*
8. Payout list + workspace scoping. *(payout list done; workspace scoping via seeded context only)*

### Sprint C — Settlement truth
9. Real Arc execution path. *(not started — executor placeholder)*
10. Real proof/retry. *(done — proof refresh + idempotent release retry)*
11. Reliability + tests. *(in progress — unit tests added, E2E pending)*

### Sprint D — Ship
12. Legacy cleanup.
13. UX polish.
14. Deploy + operate.

## Website verification milestones
- After Phase 1: create payout -> open real payout detail.
- After Phase 2: approve/reject/release/proof flow on real data.
- After Phase 4: login + role-based behavior.
- After Phase 6: real Arc transaction/proof path.

## Definition of complete MVP
- Real user boundary
- Real workspace boundary
- Real contributors
- Real payout lifecycle
- Real milestone review flow
- Real release/proof/retry behavior
- Real dashboard/list views
- Real permissions
- No dependency on seeded demo routes for core usage
- Docs/runtime/repo aligned on real product direction
