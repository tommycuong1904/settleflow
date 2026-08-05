"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/shared/button";
import { SectionCard } from "@/components/shared/section-card";
import { mockContributors } from "@/lib/data/mock-contributors";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";

type MilestoneDraft = {
  id: string;
  title: string;
  description: string;
  amount: string;
  state: string;
};

type FormErrors = {
  title?: string;
  contributorId?: string;
  walletAddress?: string;
  milestones?: string;
  totalAmount?: string;
};

const initialMilestoneDrafts: MilestoneDraft[] = [
  {
    id: "milestone-draft-1",
    title: "Draft campaign concepts",
    description: "Create 3 visual directions for review and first approval.",
    amount: "80",
    state: "Review milestone",
  },
  {
    id: "milestone-draft-2",
    title: "Finalize social asset set",
    description: "Deliver approved launch assets for X, Telegram, and Farcaster.",
    amount: "120",
    state: "Release milestone",
  },
  {
    id: "milestone-draft-3",
    title: "Export all format variants",
    description: "Ship final size variants and handoff package for launch week.",
    amount: "100",
    state: "Settlement proof",
  },
];

const inputClassName =
  "w-full rounded-2xl border border-[var(--border-soft)] bg-[rgba(8,15,31,0.78)] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-cyan-300/40 focus:bg-[rgba(8,15,31,0.92)]";

function isLikelyWalletAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function sanitizeAmountInput(value: string) {
  return value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
}

export default function CreatePayoutPage() {
  const [payoutTitle, setPayoutTitle] = useState("Community Campaign Design");
  const [contributorId, setContributorId] = useState(mockContributors[0]?.id ?? "");
  const [walletAddress, setWalletAddress] = useState(
    mockContributors[0]?.walletAddress ?? "",
  );
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(initialMilestoneDrafts);
  const [submitState, setSubmitState] = useState<"idle" | "creating" | "created">("idle");
  const [errors, setErrors] = useState<FormErrors>({});
  const [createdSummary, setCreatedSummary] = useState<{
    title: string;
    contributorName: string;
    totalAmount: number;
    milestoneCount: number;
  } | null>(null);

  const selectedContributor =
    mockContributors.find((contributor) => contributor.id === contributorId) ??
    mockContributors[0];

  const totalAmount = useMemo(
    () =>
      milestones.reduce((sum, milestone) => {
        const amount = Number(milestone.amount);
        return Number.isFinite(amount) ? sum + amount : sum;
      }, 0),
    [milestones],
  );

  function handleContributorChange(nextContributorId: string) {
    setContributorId(nextContributorId);
    const contributor = mockContributors.find((item) => item.id === nextContributorId);
    if (contributor) {
      setWalletAddress(contributor.walletAddress);
    }
  }

  function handleMilestoneChange(
    milestoneId: string,
    field: keyof Omit<MilestoneDraft, "id">,
    value: string,
  ) {
    const nextValue = field === "amount" ? sanitizeAmountInput(value) : value;

    setMilestones((current) =>
      current.map((milestone) =>
        milestone.id === milestoneId ? { ...milestone, [field]: nextValue } : milestone,
      ),
    );
  }

  function handleAddMilestone() {
    setMilestones((current) => [
      ...current,
      {
        id: `milestone-draft-${current.length + 1}-${Date.now()}`,
        title: "",
        description: "",
        amount: "",
        state: current.length % 2 === 0 ? "Review milestone" : "Release milestone",
      },
    ]);
  }

  function handleRemoveMilestone(milestoneId: string) {
    setMilestones((current) => current.filter((milestone) => milestone.id !== milestoneId));
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!payoutTitle.trim()) {
      nextErrors.title = "Payout title is required.";
    }

    if (!contributorId) {
      nextErrors.contributorId = "Contributor selection is required.";
    }

    if (!walletAddress.trim()) {
      nextErrors.walletAddress = "Wallet address is required.";
    } else if (!isLikelyWalletAddress(walletAddress)) {
      nextErrors.walletAddress = "Wallet address should look like a valid EVM address.";
    }

    if (!milestones.length) {
      nextErrors.milestones = "At least one milestone is required.";
    }

    const invalidMilestone = milestones.find(
      (milestone) =>
        !milestone.title.trim() ||
        !milestone.description.trim() ||
        !Number.isFinite(Number(milestone.amount)) ||
        Number(milestone.amount) <= 0,
    );

    if (invalidMilestone) {
      nextErrors.milestones =
        "Each milestone needs a title, description, and amount greater than 0.";
    }

    if (totalAmount <= 0) {
      nextErrors.totalAmount = "Total amount must be greater than 0.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleCreatePayout() {
    if (!validateForm()) {
      setSubmitState("idle");
      return;
    }

    setSubmitState("creating");
    await new Promise((resolve) => setTimeout(resolve, 900));

    setCreatedSummary({
      title: payoutTitle.trim(),
      contributorName: selectedContributor?.name ?? "Contributor",
      totalAmount,
      milestoneCount: milestones.length,
    });
    setSubmitState("created");
  }

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
                {milestones.length}
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

        {submitState === "created" && createdSummary ? (
          <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-100">
            <p className="font-semibold text-white">Payout draft created</p>
            <p className="mt-2 leading-6">
              <span className="font-semibold text-white">{createdSummary.title}</span> is now
              framed as a {formatUsdc(createdSummary.totalAmount)} USDC payout for{" "}
              <span className="font-semibold text-white">{createdSummary.contributorName}</span>
              across {createdSummary.milestoneCount} milestone(s).
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/payouts/payout-detail">
                <Button>Open payout detail flow</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="secondary">Return to dashboard</Button>
              </Link>
            </div>
          </div>
        ) : null}

        <SectionCard title="Payout Basics">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm text-[var(--text-primary)]">
              <span>Payout title</span>
              <input
                className={inputClassName}
                value={payoutTitle}
                onChange={(event) => setPayoutTitle(event.target.value)}
              />
              {errors.title ? <p className="text-xs text-rose-300">{errors.title}</p> : null}
            </label>
            <label className="space-y-2 text-sm text-[var(--text-primary)]">
              <span>Contributor</span>
              <select
                className={inputClassName}
                value={contributorId}
                onChange={(event) => handleContributorChange(event.target.value)}
              >
                {mockContributors.map((contributor) => (
                  <option key={contributor.id} value={contributor.id}>
                    {contributor.name} · {contributor.role}
                  </option>
                ))}
              </select>
              {errors.contributorId ? (
                <p className="text-xs text-rose-300">{errors.contributorId}</p>
              ) : null}
            </label>
            <label className="space-y-2 text-sm text-[var(--text-primary)] md:col-span-2">
              <span>Wallet address</span>
              <input
                className={inputClassName}
                value={walletAddress}
                onChange={(event) => setWalletAddress(event.target.value)}
              />
              {errors.walletAddress ? (
                <p className="text-xs text-rose-300">{errors.walletAddress}</p>
              ) : null}
            </label>
            <label className="space-y-2 text-sm text-[var(--text-primary)]">
              <span>Total amount (USDC)</span>
              <input className={inputClassName} value={String(totalAmount)} readOnly />
              {errors.totalAmount ? (
                <p className="text-xs text-rose-300">{errors.totalAmount}</p>
              ) : null}
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

          {errors.milestones ? (
            <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {errors.milestones}
            </div>
          ) : null}

          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <div key={milestone.id} className="sf-shell rounded-3xl p-5">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                      Milestone {index + 1}
                    </p>
                    <p className="text-lg font-semibold text-white">
                      {milestone.title.trim() || "Untitled milestone"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                      {milestone.state}
                    </span>
                    {milestones.length > 1 ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-200 transition-colors hover:text-rose-100"
                        onClick={() => handleRemoveMilestone(milestone.id)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                  <label className="space-y-2 text-sm text-[var(--text-primary)]">
                    <span>Milestone title</span>
                    <input
                      className={inputClassName}
                      value={milestone.title}
                      onChange={(event) =>
                        handleMilestoneChange(milestone.id, "title", event.target.value)
                      }
                    />
                  </label>
                  <label className="space-y-2 text-sm text-[var(--text-primary)]">
                    <span>Amount</span>
                    <input
                      className={inputClassName}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={milestone.amount}
                      onChange={(event) =>
                        handleMilestoneChange(milestone.id, "amount", event.target.value)
                      }
                    />
                  </label>
                </div>
                <label className="mt-4 block space-y-2 text-sm text-[var(--text-primary)]">
                  <span>Description</span>
                  <textarea
                    className={`${inputClassName} min-h-28 resize-none`}
                    value={milestone.description}
                    onChange={(event) =>
                      handleMilestoneChange(milestone.id, "description", event.target.value)
                    }
                  />
                </label>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={handleAddMilestone}>
              Add Milestone
            </Button>
            <Button onClick={() => void handleCreatePayout()}>
              {submitState === "creating" ? "Creating payout..." : "Create payout draft"}
            </Button>
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
                Payout title
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {payoutTitle.trim() || "Untitled payout draft"}
              </p>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Recipient
              </p>
              <p className="mt-2 text-lg font-semibold text-white">{selectedContributor.name}</p>
              <p className="mt-1 text-[var(--text-muted)]">{selectedContributor.role}</p>
              <p className="mt-3 font-mono text-xs text-cyan-100">
                {shortenAddress(walletAddress || selectedContributor.walletAddress)}
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
                <p className="mt-2 font-semibold text-white">{milestones.length}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Preview timeline
              </p>
              {milestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.62)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">
                        {index + 1}. {milestone.title.trim() || "Untitled milestone"}
                      </p>
                      <p className="mt-1 text-[var(--text-muted)]">
                        {milestone.description.trim() || "Description will appear here after the draft is refined."}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {Number(milestone.amount) > 0 ? `${formatUsdc(Number(milestone.amount))} USDC` : "0 USDC"}
                      </p>
                      <p className="mt-1 text-xs text-cyan-100">{milestone.state}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-dashed border-[var(--border-soft)] px-4 py-4 text-sm leading-6 text-[var(--text-muted)]">
              Once the payout is created, the team can move into milestone review,
              approval, release, and settlement proof on Arc without changing the
              contributor context.
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
