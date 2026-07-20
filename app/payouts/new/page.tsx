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

export default function CreatePayoutPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
            Create payout
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Set up a milestone-based USDC payout
          </h1>
          <p className="text-sm text-slate-300">
            Define the contributor, split the payout into milestones, and make
            release conditional on approval.
          </p>
        </div>

        <SectionCard title="Payout Details">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-300">
              <span>Payout title</span>
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                defaultValue="Community Campaign Design"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span>Contributor</span>
              <select className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none">
                {mockContributors.map((contributor) => (
                  <option key={contributor.id} value={contributor.id}>
                    {contributor.name} · {contributor.role}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
              <span>Wallet address</span>
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                defaultValue={selectedContributor.walletAddress}
              />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span>Total amount (USDC)</span>
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                defaultValue={String(totalAmount)}
              />
            </label>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">Why this flow matters</p>
              <p className="mt-2 leading-6 text-slate-400">
                Contributors get clarity on milestones, while teams keep payout
                release gated by review.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Milestones">
          <div className="space-y-4">
            {milestoneDrafts.map((milestone, index) => (
              <div
                key={milestone.title}
                className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Milestone {index + 1}
                  </p>
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                    {milestone.state}
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Milestone title</span>
                    <input
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                      defaultValue={milestone.title}
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Amount</span>
                    <input
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                      defaultValue={String(milestone.amount)}
                    />
                  </label>
                </div>
                <label className="space-y-2 text-sm text-slate-300">
                  <span>Description</span>
                  <textarea
                    className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                    defaultValue={milestone.description}
                  />
                </label>
              </div>
            ))}
          </div>
          <button className="mt-4 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900">
            Add Milestone
          </button>
        </SectionCard>
      </div>

      <div className="flex flex-col gap-6">
        <SectionCard title="Payout Preview">
          <div className="space-y-4 text-sm text-slate-300">
            <div>
              <p className="text-slate-400">Contributor</p>
              <p className="font-semibold text-white">{selectedContributor.name}</p>
              <p className="mt-1 text-slate-400">{selectedContributor.role}</p>
            </div>
            <div>
              <p className="text-slate-400">Wallet</p>
              <p className="font-semibold text-white">
                {shortenAddress(selectedContributor.walletAddress)}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Total payout</p>
              <p className="font-semibold text-white">{formatUsdc(totalAmount)} USDC</p>
            </div>
            <div>
              <p className="text-slate-400">Milestone count</p>
              <p className="font-semibold text-white">
                {milestoneDrafts.length} milestones
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Workflow Preview">
          <div className="space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="font-semibold text-white">1. Contributor submits work</p>
              <p className="mt-2 text-slate-400">
                Milestone stays unreleased until reviewer confirms completion.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="font-semibold text-white">2. Reviewer approves milestone</p>
              <p className="mt-2 text-slate-400">
                Approval unlocks the milestone for USDC payout release.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="font-semibold text-white">3. Release USDC on Arc</p>
              <p className="mt-2 text-slate-400">
                Settlement proof appears after release and confirms the Arc flow.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Milestone Split">
          <div className="space-y-3">
            {milestoneDrafts.map((milestone) => (
              <div
                key={milestone.title}
                className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300"
              >
                <span>{milestone.title}</span>
                <span className="font-semibold text-white">
                  {formatUsdc(milestone.amount)} USDC
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button className="rounded-xl border border-cyan-300 bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
              Create Payout
            </button>
            <button className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900">
              Save Draft
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
