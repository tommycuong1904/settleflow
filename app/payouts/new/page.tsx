"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";

type MilestoneDraft = {
  id: string;
  title: string;
  description: string;
  amount: string;
  state: string;
};

type ContributorOption = {
  id: string;
  displayName: string;
  walletAddress: string;
  status?: string;
};

type FormErrors = {
  title?: string;
  contributorId?: string;
  walletAddress?: string;
  milestones?: string;
  totalAmount?: string;
  submit?: string;
};

const initialMilestoneDrafts: MilestoneDraft[] = [
  {
    id: "milestone-draft-1",
    title: "Draft campaign concepts",
    description: "Create 3 visual directions for review and first approval.",
    amount: "80",
    state: "Planned milestone",
  },
];

function isLikelyWalletAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function sanitizeAmountInput(value: string) {
  return value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
}

function CreatePayoutPageContent() {
  const router = useRouter();
  const productContext = useResolvedProductContext();
  const [contributors, setContributors] = useState<ContributorOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payoutTitle, setPayoutTitle] = useState("Community Campaign Design");
  const [contributorId, setContributorId] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(initialMilestoneDrafts);
  const [submitState, setSubmitState] = useState<"idle" | "creating" | "created">("idle");
  const [errors, setErrors] = useState<FormErrors>({});
  const [createdSummary, setCreatedSummary] = useState<{
    payoutId: string;
    title: string;
    contributorName: string;
    totalAmount: number;
    milestoneCount: number;
  } | null>(null);

  const selectedContributor = contributors.find((contributor) => contributor.id === contributorId) ?? null;

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/contributors?status=active")
      .then(async (response) => {
        const data = (await response.json()) as { data?: ContributorOption[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Unable to load contributors.");
        if (!cancelled) {
          const nextContributors = data.data ?? [];
          setContributors(nextContributors);
          if (nextContributors[0]) {
            setContributorId(nextContributors[0].id);
            setWalletAddress(nextContributors[0].walletAddress);
          }
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Unable to load contributors.");
      });
    return () => { cancelled = true; };
  }, [productContext.workspaceId]);

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
    const contributor = contributors.find((item) => item.id === nextContributorId);
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
        state: "Planned milestone",
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
    if (submitState === "creating") return;

    if (!validateForm()) {
      setSubmitState("idle");
      return;
    }

    setSubmitState("creating");
    setErrors({});
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("/api/v1/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          title: payoutTitle.trim(),
          contributorId,
          targetWalletAddress: walletAddress.trim(),
          totalAmountUsdc: String(totalAmount),
          currency: "USDC",
          milestones: milestones.map((milestone, index) => ({
            title: milestone.title.trim(),
            description: milestone.description.trim(),
            amountUsdc: milestone.amount,
            sequence: index + 1,
          })),
        }),
      });
      const data = (await response.json()) as { payout?: { id: string }; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to create payout.");
      const payoutId = data.payout?.id ?? "";
      setCreatedSummary({
        payoutId,
        title: payoutTitle.trim(),
        contributorName: selectedContributor?.displayName ?? "Contributor",
        totalAmount,
        milestoneCount: milestones.length,
      });
      setSubmitState("created");
      if (payoutId) {
        router.push(`/payouts/${payoutId}`);
        return;
      }
    } catch (error) {
      setErrors({
        submit:
          error instanceof DOMException && error.name === "AbortError"
            ? "Creating the payout timed out. Please try again."
            : error instanceof Error
              ? error.message
              : "Unable to create payout.",
      });
      setSubmitState("idle");
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-6">
        {loadError ? <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{loadError}</p> : null}
        {errors.submit ? <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{errors.submit}</p> : null}
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

        <Card className="sf-shell">
          <CardHeader>
            <CardTitle>Payout Basics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2 text-sm text-[var(--text-primary)]">
                <span>Payout title</span>
                <Input
                  value={payoutTitle}
                  onChange={(event) => setPayoutTitle(event.target.value)}
                />
                {errors.title ? <p className="text-xs text-rose-300">{errors.title}</p> : null}
              </label>
              <label className="space-y-2 text-sm text-[var(--text-primary)]">
                <span>Contributor</span>
                <Select value={contributorId} onValueChange={handleContributorChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contributor" />
                  </SelectTrigger>
                  <SelectContent>
                    {contributors.map((contributor) => (
                      <SelectItem key={contributor.id} value={contributor.id}>
                        {contributor.displayName} · {contributor.status ?? "active"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.contributorId ? (
                  <p className="text-xs text-rose-300">{errors.contributorId}</p>
                ) : null}
              </label>
              <label className="space-y-2 text-sm text-[var(--text-primary)] md:col-span-2">
                <span>Wallet address</span>
                <Input
                  value={walletAddress}
                  onChange={(event) => setWalletAddress(event.target.value)}
                />
                {errors.walletAddress ? (
                  <p className="text-xs text-rose-300">{errors.walletAddress}</p>
                ) : null}
              </label>
              <label className="space-y-2 text-sm text-[var(--text-primary)]">
                <span>Total amount (USDC)</span>
                <Input value={String(totalAmount)} readOnly />
                {errors.totalAmount ? (
                  <p className="text-xs text-rose-300">{errors.totalAmount}</p>
                ) : null}
              </label>
              <Card className="bg-[rgba(15,23,42,0.64)]">
                <CardContent className="p-5">
                  <p className="font-semibold text-white">Why this agreement matters</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    Contributors get clarity on payout scope, while teams keep each
                    release locked behind explicit milestone review.
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card className="sf-shell">
          <CardHeader>
            <CardTitle>Milestone Structure</CardTitle>
          </CardHeader>
          <CardContent>
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
              <Card key={milestone.id} className="sf-shell">
                <CardContent className="p-5">
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
                    <Badge>{milestone.state}</Badge>
                    {milestones.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-rose-200 hover:bg-rose-400/10 hover:text-rose-100"
                        onClick={() => handleRemoveMilestone(milestone.id)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                  <label className="space-y-2 text-sm text-[var(--text-primary)]">
                    <span>Milestone title</span>
                    <Input
                      value={milestone.title}
                      onChange={(event) =>
                        handleMilestoneChange(milestone.id, "title", event.target.value)
                      }
                    />
                  </label>
                  <label className="space-y-2 text-sm text-[var(--text-primary)]">
                    <span>Amount</span>
                    <Input
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
                  <Textarea
                    className="min-h-28 resize-none"
                    value={milestone.description}
                    onChange={(event) =>
                      handleMilestoneChange(milestone.id, "description", event.target.value)
                    }
                  />
                </label>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={handleAddMilestone}>
              Add Milestone
            </Button>
            <Button disabled={submitState === "creating"} onClick={() => void handleCreatePayout()}>
              {submitState === "creating" ? "Creating payout..." : "Create payout draft"}
            </Button>
          </div>
          </CardContent>
        </Card>

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
              <Button asChild>
                <Link href={`/payouts/${createdSummary.payoutId}`}>Open payout detail</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/dashboard">Return to dashboard</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        <Card className="sf-shell">
          <CardHeader>
            <CardTitle>Approval Logic</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card className="sf-shell">
          <CardHeader>
            <CardTitle>Settlement Preview</CardTitle>
            <CardDescription>Review the final payout story before creating the draft.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5 text-sm text-[var(--text-primary)]">
              <Card className="bg-[rgba(15,23,42,0.62)]">
                <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Payout title
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {payoutTitle.trim() || "Untitled payout draft"}
              </p>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Recipient
              </p>
              <p className="mt-2 text-lg font-semibold text-white">{selectedContributor?.displayName ?? "No contributor selected"}</p>
              <p className="mt-1 text-[var(--text-muted)]">{selectedContributor?.status ?? ""}</p>
              <p className="mt-3 font-mono text-xs text-cyan-100">
                {shortenAddress(walletAddress || selectedContributor?.walletAddress || "")}
              </p>
                </CardContent>
              </Card>

              <div className="grid gap-3 sm:grid-cols-2">
              <Card className="bg-[rgba(15,23,42,0.62)]">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Total payout
                  </p>
                  <p className="mt-2 font-semibold text-white">{formatUsdc(totalAmount)} USDC</p>
                </CardContent>
              </Card>
              <Card className="bg-[rgba(15,23,42,0.62)]">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Total milestones
                  </p>
                  <p className="mt-2 font-semibold text-white">{milestones.length}</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Preview timeline
              </p>
              {milestones.map((milestone, index) => (
                <Card key={milestone.id} className="bg-[rgba(15,23,42,0.62)]">
                  <CardContent className="p-4">
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
                      <div className="mt-2 flex justify-end">
                        <Badge variant="secondary">{milestone.state}</Badge>
                      </div>
                    </div>
                  </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-dashed bg-transparent">
              <CardContent className="px-4 py-4 text-sm leading-6 text-[var(--text-muted)]">
                Once the payout is created, the team can move into milestone review,
                approval, release, and settlement proof on Arc without changing the
                contributor context.
              </CardContent>
            </Card>
          </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CreatePayoutPage() {
  return (
    <Suspense fallback={null}>
      <CreatePayoutPageContent />
    </Suspense>
  );
}
