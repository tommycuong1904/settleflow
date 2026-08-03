# SettleFlow Core Release Wedge Progress

## Goal
Build one hackathon-credible core flow:

**Approved milestone → Release USDC on Arc → Show settlement proof**

---

## Current Status
- Branch: `feature/core-release-wedge`
- Phase: checkpoint-ready core wedge, engineering verification still narrower than full completion
- Current focus: preserve the checkpoint-ready wedge and avoid scope creep beyond `/payouts/[id]`
- Main demo screen: `/payouts/[id]`
- Priority: core wedge first, landing polish later
- Current after preview: `3001`
- Current mode recommendation: ship `demo-safe` first, not `real-safe`
- Next checkpoint:
  - keep the payout detail wedge stable for manual review/demo
  - decide later whether `failed` path verification is required for engineering sign-off

---

## Scope

### In scope
- clarify Arc release contract
- add execution mode (`mock` / `demo` / `real`)
- make release panel interactive
- add release states (`idle` / `submitting` / `confirmed` / `failed`)
- update settlement proof from release result
- use payout detail as the main demo surface
- add thin persistence only if needed

### Out of scope for this phase
- auth
- full database
- full payout CRUD
- multi-user roles
- large landing redesign
- UI library refactor

---

## Task Checklist

### Phase 1 — Arc release foundation
- [x] Expand `lib/arc/types.ts`
- [x] Add execution mode in `lib/arc/config.ts`
- [x] Refactor `lib/arc/send.ts` into a mode-aware adapter

### Phase 2 — Release interaction
- [x] Create a small client release shell for payout detail
- [x] Make `components/payouts/release-panel.tsx` interactive
- [ ] Add release state handling (`idle` / `submitting` / `confirmed` / `failed`)

**Implementation note:**
- The release panel is no longer static in code.
- Normal click interaction has been verified on the payout detail screen after scrolling to the correct in-viewport target.
- `idle` and `submitting` behavior have been observed on the preview surface.
- The checklist stays open until the release interaction is re-verified against the intended shipping mode and the state story is considered complete enough for the wedge demo.

### Phase 3 — Settlement proof
- [x] Add a mapper from Arc send result to proof model
- [ ] Upgrade `components/payouts/transaction-proof-card.tsx`
- [x] Wire proof updates into `app/payouts/[id]/page.tsx`

**Implementation note:**
- The proof card has already been improved on the demo surface.
- The checklist stays open until proof rendering is considered complete enough for the wedge definition of done, not just visually improved.

### Phase 4 — Demo credibility
- [x] Decide first shipping mode: `demo-safe` or `real-safe`
- [x] If needed, add thin persistence for release/proof state

---

## Recommended Execution Order
1. `lib/arc/types.ts`
2. `lib/arc/config.ts`
3. `lib/arc/send.ts`
4. `components/payouts/release-panel.tsx`
5. `components/payouts/transaction-proof-card.tsx`
6. `app/payouts/[id]/page.tsx`
7. optional persistence

---

## Definition of Done
This phase is done when:
- release is no longer a static UI affordance
- one approved milestone can trigger a believable release flow
- the payout detail screen shows release state transitions
- the settlement proof section updates from the release result
- the page is strong enough to serve as the main hackathon demo screen

**Interpretation for the current phase:**
- build success alone is not enough
- a visible button alone is not enough
- at minimum, the after preview should show a believable end-to-end wedge story on `/payouts/[id]`
- Phase 2 should not be marked complete until release interaction/state handling are verified against the chosen shipping mode

---

## Checkpoint 2 Acceptance Standard
For checkpoint use, the wedge can be treated as acceptable when all of the following are true on the review surface:
- the demo uses `/payouts/[id]` as the main story screen
- one approved milestone is visibly ready to release
- the after preview runs in `demo-safe`
- the reviewer can trigger release from the payout detail screen
- the page can move into a released / proof-visible story
- `Settlement Proof` shows a believable confirmed result with network, tx hash, and explorer action

This checkpoint acceptance standard is intentionally narrower than engineering completion.
It does **not** mean:
- full Phase 2 sign-off
- full verification of every intended state
- full `failed` path coverage
- production-safe real execution

---

## Notes
- Keep scope narrow.
- Do not expand into auth or full backend yet.
- The goal is not to make the app broader.
- The goal is to make one core workflow feel real.
- Use the payout detail page as the source-of-truth demo surface for this wedge.
- Distinguish clearly between `checkpoint-acceptable` and `engineering-complete`.

---

## Blockers
- No code blocker at the moment.
- No hard checkpoint blocker is currently known on the core wedge.
- Remaining gap is mostly engineering completeness, not checkpoint viability:
  - the `failed` path is still not the main validated demo story
  - Phase 2 remains intentionally open until every intended interaction state is verified to a stricter sign-off standard

---

## Progress Log

### 2026-08-02
- Created implementation plan for the core release wedge
- Created working branch: `feature/core-release-wedge`
- Added this progress tracker
- Started Phase 1 implementation
- Began Task 1: expand `lib/arc/types.ts`
- Completed Task 1: expanded Arc request/result types for release state and proof mapping
- Verified the app still builds successfully after the type changes
- Completed Task 2: added `executionMode` to `lib/arc/config.ts`
- Verified the app still builds successfully after the config change
- No web-visible behavior change yet from Task 2 alone
- Completed Task 3: refactored `lib/arc/send.ts` into a mode-aware adapter
- Verified the app still builds successfully after the adapter refactor
- Phase 1 foundation is now complete
- No web-visible behavior change yet from Task 3 alone
- Completed Task 4: extracted a client release shell for the payout detail right-hand panel
- Verified the app still builds successfully after the shell extraction
- Started local preview on port 3001 for web checks
- Implemented interactive release panel behavior with visible button states
- Verified the app still builds successfully after the interactive release panel changes
- Connected the release shell to `sendUsdcOnArc()` and local proof mapping
- Verified the app still builds successfully after wiring the release adapter into the shell
- Verified normal click interaction on `/payouts/[id]` after correcting viewport / scroll assumptions during browser verification
- Confirmed the payout detail screen can enter a believable release-in-progress state from the approved milestone path
- Improved the proof card and payout detail demo surface for checkpoint readability
- Cleaned duplicated CTA/state wording on the payout detail page so the core wedge story is easier to present
- Fixed payout detail demo-data consistency by changing `payout-detail` status from `partially_released` to `active`
- Reached the point where Phase 2 appears mostly implemented, but kept the Phase 2 checklist open because strict state verification is still incomplete
- Audited execution modes and concluded the next recommended shipping target is `demo-safe`, not `real-safe`
- Ran the after preview in `demo` mode on `3001` and verified the confirmed proof path on `/payouts/[id]`
- Verified the payout detail demo surface can move from ready-to-release into a released / proof-visible story on the review URL
- Confirmed `Settlement Proof` can show a `confirmed` state, Arc network, tx hash, and explorer action in `demo-safe`
- Did not mark Phase 2 complete yet because the `submitting` state was not cleanly captured in this pass and the `failed` path is still unverified
- Declared a narrower demo-safe checkpoint acceptance standard instead of treating full engineering sign-off as required for checkpoint use
- Fixed the payout detail summary so post-click aggregate state stays in sync with the released milestone story
- Added thin session persistence for the demo-safe release/proof path on `payout-detail`
- Fixed the payout detail shell to rehydrate persisted proof/release state after reload
- Fixed milestone helper copy so released milestones no longer read like pre-release items
- Re-verified the wedge on `3001`: post-click summary, workflow, release target, and settlement proof now stay consistent after reload
- Re-tested checkpoint readiness on `/payouts/payout-detail` and concluded the route is now `go` for checkpoint use, with only minor wording/polish gaps remaining
