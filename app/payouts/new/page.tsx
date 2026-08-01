import { Button } from "@/components/shared/button";
import { SectionCard } from "@/components/shared/section-card";
import { mockContributors } from "@/lib/data/mock-contributors";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";

const selectedContributor = mockContributors[0];

const milestoneDrafts = [
  {
    title: "Draft campaign concepts",
    description: "Create 3 visual directions for review and first approval.",
    amount: 80,
    state: "Review milestone",
  },
  {
    title: "Finalize social asset set",
    description: "Deliver approved launch assets for X, Telegram, and Farcaster.",
    amount: 120,
    state: "Release milestone",
  },
  {
    title: "Export all format variants",
    description: "Ship final size variants and handoff package for launch week.",
    amount: 100,
    state: "Settlement proof",
  },
];

const totalAmount = milestoneDrafts.reduce(
  (sum, milestone) => sum + milestone.amount,
  0,
);

const inputClassName =
  "w-full rounded-2xl border border-[var(--border-soft)] bg-[rgba(8,15,31,0.78)] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-cyan-300/40 focus:bg-[rgba(8,15,31,0.92)]";

export default function CreatePayoutPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
              Create payout
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Build a milestone-based payout agreement for Arc settlement.
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-[var(--text-primary)] md:text-base">
              Define who gets paid, how milestones unlock review and release, and
              how settlement proof should appear once USDC moves on Arc.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Total payout
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                {formatUsdc(totalAmount)} USDC
              </p>
            </div>
            <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Milestones
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                {milestoneDrafts.length}
              </p>
            </div>
            <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Release rule
              </p>
              <p className="mt-2 text-lg font-semibold tracking-tight text-white">
                Release after approval
              </p>
            </div>
          </div>
        </div>

        <SectionCard title="Payout Basics">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm text-[var(--text-primary)]">
              <span>Payout title</span>
              <input className={inputClassName} defaultValue="Community Campaign Design" />
            </label>
            <label className="space-y-2 text-sm text-[var(--text-primary)]">
              <span>Contributor</span>
              <select className={inputClassName} defaultValue={selectedContributor.id}>
                {mockContributors.map((contributor) => (
                  <option key={contributor.id} value={contributor.id}>
                    {contributor.name} · {contributor.role}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-[var(--text-primary)] md:col-span-2">
              <span>Wallet address</span>
              <input
                className={inputClassName}
                defaultValue={selectedContributor.walletAddress}
              />
            </label>
            <label className="space-y-2 text-sm text-[var(--text-primary)]">
              <span>Total amount (USDC)</span>
              <input className={inputClassName} defaultValue={String(totalAmount)} />
            </label>
            <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.64)] p-5 text-sm text-[var(--text-primary)]">
              <p className="font-semibold text-white">Why this agreement matters</p>
              <p className="mt-2 leading-6 text-[var(--text-muted)]">
                Contributors get clarity on payout scope, while teams keep each
                release locked behind explicit milestone review.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Milestone Structure">
          <div className="mb-5 rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.66)] p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Review step
                </p>
                <p className="mt-2 font-semibold text-white">Submit → review → approve</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Release rule
                </p>
                <p className="mt-2 font-semibold text-white">Only approved milestones can release</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Settlement rail
                </p>
                <p className="mt-2 font-semibold text-white">USDC on Arc Testnet</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {milestoneDrafts.map((milestone, index) => (
              <div
                key={milestone.title}
                className="sf-shell rounded-3xl p-5"
              >
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                      Milestone {index + 1}
                    </p>
                    <p className="text-lg font-semibold text-white">{milestone.title}</p>
                  </div>
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                    {milestone.state}
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                  <label className="space-y-2 text-sm text-[var(--text-primary)]">
                    <span>Milestone title</span>
                    <input className={inputClassName} defaultValue={milestone.title} />
                  </label>
                  <label className="space-y-2 text-sm text-[var(--text-primary)]">
                    <span>Amount</span>
                    <input className={inputClassName} defaultValue={String(milestone.amount)} />
                  </label>
                </div>
                <label className="mt-4 block space-y-2 text-sm text-[var(--text-primary)]">
                  <span>Description</span>
                  <textarea
                    className={`${inputClassName} min-h-28 resize-none`}
                    defaultValue={milestone.description}
                  />
                </label>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button variant="secondary">Add Milestone</Button>
          </div>
        </SectionCard>
      </div>

      <div className="flex flex-col gap-6">
        <SectionCard title="Approval Logic">
          <div className="space-y-3 text-sm text-[var(--text-primary)]">
            {[
              {
                title: "Submit work",
                description:
                  "Contributors complete a milestone and submit work for review.",
              },
              {
                title: "Reviewer checks milestone",
                description:
                  "A milestone stays locked until the reviewer confirms completion.",
              },
              {
                title: "Approve before release",
                description:
                  "Approval is the one event that unlocks release on Arc.",
              },
              {
                title: "Release and attach proof",
                description:
                  "Once released, settlement proof becomes part of the payout record.",
              },
            ].map((step, index) => (
              <div
                key={step.title}
                className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.62)] p-4"
              >
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-xs font-semibold text-cyan-100">
                    {index + 1}
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-semibold text-white">{step.title}</p>
                    <p className="leading-6 text-[var(--text-muted)]">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Settlement Preview">
          <div className="space-y-5 text-sm text-[var(--text-primary)]">
            <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.62)] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Recipient
              </p>
              <p className="mt-2 text-lg font-semibold text-white">{selectedContributor.name}</p>
              <p className="mt-1 text-[var(--text-muted)]">{selectedContributor.role}</p>
              <p className="mt-3 font-mono text-xs text-cyan-100">
                {shortenAddress(selectedContributor.walletAddress)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.62)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Total payout
                </p>
                <p className="mt-2 font-semibold text-white">{formatUsdc(totalAmount)} USDC</p>
              </div>
              <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.62)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Total milestones
                </p>
                <p className="mt-2 font-semibold text-white">{milestoneDrafts.length}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Agreement split
              </p>
              {milestoneDrafts.map((milestone) => (
                <div
                  key={milestone.title}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border-soft)] bg-[rgba(8,15,31,0.74)] p-4"
                >
                  <div>
                    <p className="font-semibold text-white">{milestone.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{milestone.state}</p>
                  </div>
                  <span className="font-semibold text-cyan-100">
                    {formatUsdc(milestone.amount)} USDC
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Release + Proof Flow">
          <div className="space-y-3 text-sm text-[var(--text-primary)]">
            {[
              "Submit",
              "Review",
              "Approve",
              "Release",
              "Proof",
            ].map((step) => (
              <div
                key={step}
                className="flex items-center gap-3 rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.56)] px-4 py-3"
              >
                <div className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                <p className="font-medium text-white">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-3 rounded-3xl border border-[var(--border-soft)] bg-[rgba(8,15,31,0.72)] p-5">
            <p className="text-sm font-semibold text-white">Ready to create the agreement?</p>
            <p className="text-sm leading-6 text-[var(--text-muted)]">
              Creating the payout locks this milestone structure into a review-first payout flow.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button variant="primary">Create Payout</Button>
              <Button variant="secondary">Save Draft</Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
