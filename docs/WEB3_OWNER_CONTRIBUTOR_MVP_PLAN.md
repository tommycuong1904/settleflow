# Web3 Owner/Contributor MVP execution plan

## Product boundary

The active MVP has two roles only: Owner and Contributor. Owners create,
review, approve, reject, and release payouts. Contributors can view only their
assigned payout work and submit or resubmit evidence. Reviewer and Ops remain
historical schema values and future expansion paths; they are not offered in
the active experience.

Web3 EOA is the sole supported release source. Google/Web2 and Circle Smart
Wallet surfaces remain disabled and labelled **Coming soon**; Circle
provisioning and release endpoints are server-gated independently of provider
credentials. No real Arc transaction is authorized by this plan.

## Delivery order

1. **Policy and server guards**
   - Restrict review decisions to Owner.
   - Reject Circle release modes while the feature is disabled.
   - Preserve existing historical memberships without granting new UI paths.
2. **Web3 release UX**
   - State the selected Web3 source wallet, destination, amount, token, and
     network before signing.
   - Make pending/unknown-broadcast paths non-retryable.
   - Show disabled Circle availability without exposing a payment CTA.
3. **Clear status and next-action surfaces**
   - Use distinct work and payment status copy.
   - Give Owner a review/release/reconciliation queue and Contributor a
     focused My Work view.
4. **In-app notifications**
   - Add scoped, durable notifications for submit, approve, reject, confirmed
     release, and safe release failure.
   - Do not add email, Slack/Discord delivery, or delivery retries in this
     phase.
5. **Verification**
   - Add focused policy and release-mode tests, then DB integration coverage.
   - Add browser E2E as a separate hardening follow-up; it cannot authorize
     real Arc settlement.

## Explicitly deferred

- Circle/Web2 wallet provisioning and settlement;
- Reviewer/Ops assignment and dashboards;
- cancellation, pause, dispute, deadlines, sequential milestones;
- wallet unlink lifecycle;
- email/Slack delivery and durable webhook retry/replay;
- real Arc staging or production settlement.

## Completion criteria

- Owner-only review and Web3-only release are enforced server-side.
- UI never represents approval as payment confirmation.
- Contributor data remains relationship- and workspace-scoped.
- All affected unit, type, lint, DB integration, and build checks pass.
