"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/shared/button";
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
import { useWallet } from "@/lib/context/wallet-context";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { Lock, CheckCircle2, AlertCircle } from "lucide-react";

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
  milestoneErrors?: Record<string, { title?: string; amount?: string; description?: string }>;
};

const initialMilestoneDrafts: MilestoneDraft[] = [
  {
    id: "milestone-draft-1",
    title: "Draft campaign concepts",
    description: "Create 3 visual directions for review and first approval.",
    amount: "0.1",
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
  const searchParams = useSearchParams();
  const queryContributorId = searchParams.get("contributorId");
  const productContext = useResolvedProductContext();
  const { isConnected, openAuthModal, address, email, network } = useWallet();
  const [contributors, setContributors] = useState<ContributorOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payoutTitle, setPayoutTitle] = useState("Community Campaign Design");
  const [contributorId, setContributorId] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(initialMilestoneDrafts);
  const [creationStep, setCreationStep] = useState<1 | 2 | 3>(1);
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
          const target = queryContributorId ? nextContributors.find((item) => item.id === queryContributorId) : undefined;
          const initial = target || nextContributors[0];
          if (initial) {
            setContributorId(initial.id);
            setWalletAddress(initial.walletAddress);
          }
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Unable to load contributors.");
      });
    return () => { cancelled = true; };
  }, [productContext.workspaceId, queryContributorId]);

  const totalAmount = useMemo(
    () =>
      milestones.reduce((sum, milestone) => {
        const amount = Number(milestone.amount);
        return Number.isFinite(amount) ? sum + amount : sum;
      }, 0),
    [milestones]
  );

  function handleContributorChange(nextContributorId: string) {
    setContributorId(nextContributorId);
    if (errors.contributorId) setErrors((prev) => ({ ...prev, contributorId: undefined }));
    const contributor = contributors.find((item) => item.id === nextContributorId);
    if (contributor) {
      setWalletAddress(contributor.walletAddress);
      if (errors.walletAddress) setErrors((prev) => ({ ...prev, walletAddress: undefined }));
    }
  }

  function handleMilestoneChange(
    milestoneId: string,
    field: keyof Omit<MilestoneDraft, "id">,
    value: string,
  ) {
    const nextValue = field === "amount" ? sanitizeAmountInput(value) : value;
    setMilestones((current) =>
      current.map((milestone) => (milestone.id === milestoneId ? { ...milestone, [field]: nextValue } : milestone))
    );
    const errKey = field as keyof NonNullable<typeof errors.milestoneErrors>[string];
    if (errors.milestoneErrors?.[milestoneId]?.[errKey]) {
      setErrors((prev) => {
        const nextMs = { ...prev.milestoneErrors };
        if (nextMs[milestoneId]) {
          delete nextMs[milestoneId][errKey];
          if (Object.keys(nextMs[milestoneId]).length === 0) delete nextMs[milestoneId];
        }
        return { ...prev, milestoneErrors: nextMs, milestones: Object.keys(nextMs).length === 0 ? undefined : prev.milestones };
      });
    }
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
    const nextMilestoneErrors: Record<string, { title?: string; amount?: string; description?: string }> = {};

    if (!payoutTitle.trim()) {
      nextErrors.title = "Payout title is required.";
    }
    if (!contributorId) {
      nextErrors.contributorId = "Contributor selection is required.";
    }
    if (!walletAddress.trim()) {
      nextErrors.walletAddress = "Wallet address is required.";
    } else if (!isLikelyWalletAddress(walletAddress)) {
      nextErrors.walletAddress = "Wallet address must be a valid EVM address (e.g. 0x...).";
    }
    if (!milestones.length) {
      nextErrors.milestones = "At least one milestone is required.";
    }

    let hasInvalidMilestone = false;
    milestones.forEach((milestone, index) => {
      const msErr: { title?: string; amount?: string; description?: string } = {};
      if (!milestone.title.trim()) {
        msErr.title = `Milestone ${index + 1} title is required.`;
        hasInvalidMilestone = true;
      }
      if (!milestone.description.trim()) {
        msErr.description = `Milestone ${index + 1} description is required.`;
        hasInvalidMilestone = true;
      }
      if (!Number.isFinite(Number(milestone.amount)) || Number(milestone.amount) <= 0) {
        msErr.amount = `Milestone ${index + 1} amount must be greater than 0.`;
        hasInvalidMilestone = true;
      }
      if (Object.keys(msErr).length > 0) {
        nextMilestoneErrors[milestone.id] = msErr;
      }
    });

    if (hasInvalidMilestone) {
      nextErrors.milestones = "Please fix the highlighted errors in your milestones below.";
    }
    if (totalAmount <= 0) {
      nextErrors.totalAmount = "Total amount must be greater than 0 USDC.";
    }

    nextErrors.milestoneErrors = nextMilestoneErrors;
    setErrors(nextErrors);

    const hasErrors = Object.keys(nextErrors).length > 0 && (Boolean(nextErrors.title) || Boolean(nextErrors.contributorId) || Boolean(nextErrors.walletAddress) || Boolean(nextErrors.milestones) || Boolean(nextErrors.totalAmount));
    if (hasErrors) {
      setTimeout(() => {
        const firstErrorEl = document.querySelector('[data-error="true"]');
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
    }
    return !hasErrors;
  }

  function continueFromContributor() {
    const nextErrors: FormErrors = {};
    if (!payoutTitle.trim()) nextErrors.title = "Payout title is required.";
    if (!contributorId) nextErrors.contributorId = "Contributor selection is required.";
    if (!walletAddress.trim() || !isLikelyWalletAddress(walletAddress)) nextErrors.walletAddress = "Choose a contributor with a valid wallet address.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setCreationStep(2);
  }

  function continueFromPlan() {
    const valid = milestones.length > 0 && milestones.every((milestone) => milestone.title.trim() && milestone.description.trim() && Number(milestone.amount) > 0);
    if (!valid || totalAmount <= 0) {
      validateForm();
      return;
    }
    setCreationStep(3);
  }

  async function handleCreatePayout() {
    if (submitState === "creating") return;
    if (!isConnected) {
      openAuthModal();
      return;
    }
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

  const hasFormErrors = Object.keys(errors).length > 0 && !errors.submit;

  return (
    <section className="flex flex-col gap-6" aria-label="Create Payout Page Content">
      <ol className="grid grid-cols-3 gap-2" aria-label="Create payout progress">{["Choose contributor", "Plan payments", "Review & create"].map((label, index) => { const step = index + 1; const complete = creationStep > step; const current = creationStep === step; return <li key={label} className="flex flex-col items-center text-center"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${complete ? "bg-emerald-600 text-white" : current ? "bg-black text-white" : "bg-[var(--surface-strong)] text-[var(--text-muted)]"}`}>{complete ? "✓" : step}</span><p className={`mt-1 text-xs ${current ? "font-medium text-[var(--foreground)]" : "text-[var(--text-muted)]"}`}>{label}</p></li>; })}</ol>
      <div className="grid w-full gap-6">
        <div className="space-y-6">
          {loadError ? <p role="alert" className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-700">{loadError}</p> : null}
          {errors.submit ? <p role="alert" className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-700">{errors.submit}</p> : null}

          {/* Summary Error Alert */}
          {hasFormErrors ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 flex items-start gap-3 shadow-xs animate-in fade-in" role="alert">
              <AlertCircle size={20} className="text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-800">Please fill out all required fields</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-rose-600">
                  {errors.title ? <li>{errors.title}</li> : null}
                  {errors.contributorId ? <li>{errors.contributorId}</li> : null}
                  {errors.walletAddress ? <li>{errors.walletAddress}</li> : null}
                  {errors.totalAmount ? <li>{errors.totalAmount}</li> : null}
                  {errors.milestones ? <li>{errors.milestones}</li> : null}
                </ul>
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Total payout</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">{formatUsdc(totalAmount)} USDC</p>
              </div>
              <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Milestones</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">{milestones.length}</p>
              </div>
              <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Release rule</p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-[var(--foreground)]">Release after approval</p>
              </div>
            </div>
          </div>

          {/* Auth Status Notice */}
          {isConnected ? (
            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-xs text-cyan-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />
                <span>
                  Creating payout agreement as {" "}
                  <strong className="text-[var(--foreground)] font-medium">
                    {email || (address ? shortenAddress(address) : "Connected Account")}
                  </strong>{" "}
                  on <strong className="text-cyan-700 font-semibold">{network}</strong>.
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-5 py-3.5 text-xs text-amber-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <Lock size={16} className="text-amber-400 shrink-0" />
                <span>
                  You are in <strong className="text-amber-800 font-medium">Preview Mode</strong>. You can configure milestones, but you will be prompted to sign in before saving.
                </span>
              </div>
              <button
                type="button"
                onClick={openAuthModal}
                className="shrink-0 rounded-full bg-amber-400/20 hover:bg-amber-400/30 text-amber-800 px-4 py-1.5 font-medium transition-colors border border-amber-400/40 text-xs"
              >
                Sign In / Connect
              </button>
            </div>
          )}

          <Card className={cn("sf-shell", creationStep === 1 ? "" : "hidden")}>
            <CardHeader>
              <CardTitle>Payout Basics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2 text-sm text-[var(--text-primary)]" data-error={Boolean(errors.title)}>
                  <span>Payout title <span className="text-rose-500 font-semibold">*</span></span>
                  <Input
                    value={payoutTitle}
                    onChange={(event) => {
                      setPayoutTitle(event.target.value);
                      if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                    }}
                    className={cn(errors.title && "border-rose-500 bg-rose-500/5 focus:border-rose-500")}
                  />
                  {errors.title ? <p className="text-xs text-rose-600 font-medium">{errors.title}</p> : null}
                </label>
                <label className="space-y-2 text-sm text-[var(--text-primary)]" data-error={Boolean(errors.contributorId)}>
                  <span>Contributor <span className="text-rose-500 font-semibold">*</span></span>
                  <Select value={contributorId} onValueChange={handleContributorChange}>
                    <SelectTrigger className={cn(errors.contributorId && "border-rose-500 bg-rose-500/5")}>
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
                    <p className="text-xs text-rose-600 font-medium">{errors.contributorId}</p>
                  ) : null}
                </label>
                <label className="space-y-2 text-sm text-[var(--text-primary)] md:col-span-2" data-error={Boolean(errors.walletAddress)}>
                  <span>Wallet address <span className="text-rose-500 font-semibold">*</span></span>
                  <Input
                    value={walletAddress}
                    onChange={(event) => {
                      setWalletAddress(event.target.value);
                      if (errors.walletAddress) setErrors((prev) => ({ ...prev, walletAddress: undefined }));
                    }}
                    className={cn(errors.walletAddress && "border-rose-500 bg-rose-500/5 focus:border-rose-500")}
                  />
                  {errors.walletAddress ? (
                    <p className="text-xs text-rose-600 font-medium">{errors.walletAddress}</p>
                  ) : null}
                </label>
                <label className="space-y-2 text-sm text-[var(--text-primary)]" data-error={Boolean(errors.totalAmount)}>
                  <span>Total amount (USDC)</span>
                  <Input value={String(totalAmount)} readOnly className={cn(errors.totalAmount && "border-rose-500 bg-rose-500/5")} />
                  {errors.totalAmount ? (
                    <p className="text-xs text-rose-600 font-medium">{errors.totalAmount}</p>
                  ) : null}
                </label>
                <Card className="bg-[var(--surface-muted)]">
                  <CardContent className="p-5">
                    <p className="font-semibold text-[var(--foreground)]">Why this agreement matters</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                      Contributors get clarity on payout scope, while teams keep each
                      release locked behind explicit milestone review.
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="mt-6 flex justify-end"><Button onClick={continueFromContributor}>Continue to payment plan</Button></div>
            </CardContent>
          </Card>

          <Card className={cn("sf-shell", creationStep === 2 ? "" : "hidden")}>
            <CardHeader>
              <CardTitle>Milestone Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-5 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Review step</p>
                    <p className="mt-2 font-semibold text-[var(--foreground)]">Submit → review → approve</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Release rule</p>
                    <p className="mt-2 font-semibold text-[var(--foreground)]">Only approved milestones can release</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Settlement rail</p>
                    <p className="mt-2 font-semibold text-[var(--foreground)]">USDC on Arc Testnet</p>
                  </div>
                </div>
              </div>

              {errors.milestones ? (
                <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-700 font-medium">
                  {errors.milestones}
                </div>
              ) : null}

              <div className="space-y-4">
                {milestones.map((milestone, index) => {
                  const msErr = errors.milestoneErrors?.[milestone.id];
                  return (
                    <Card key={milestone.id} className="sf-shell">
                      <CardContent className="p-5">
                        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                              Milestone {index + 1}
                            </p>
                            <p className="text-lg font-semibold text-[var(--foreground)]">
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
                                className="text-rose-600 hover:bg-rose-400/10 hover:text-rose-700"
                                onClick={() => handleRemoveMilestone(milestone.id)}
                              >
                                Remove
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                          <label className="space-y-2 text-sm text-[var(--text-primary)]" data-error={Boolean(msErr?.title)}>
                            <span>Milestone title <span className="text-rose-500 font-semibold">*</span></span>
                            <Input
                              value={milestone.title}
                              onChange={(event) =>
                                handleMilestoneChange(milestone.id, "title", event.target.value)
                              }
                              className={cn(msErr?.title && "border-rose-500 bg-rose-500/5 focus:border-rose-500")}
                            />
                            {msErr?.title ? <p className="text-xs text-rose-600 font-medium">{msErr.title}</p> : null}
                          </label>
                          <label className="space-y-2 text-sm text-[var(--text-primary)]" data-error={Boolean(msErr?.amount)}>
                            <span>Amount (USDC) <span className="text-rose-500 font-semibold">*</span></span>
                            <Input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              value={milestone.amount}
                              onChange={(event) =>
                                handleMilestoneChange(milestone.id, "amount", event.target.value)
                              }
                              className={cn(msErr?.amount && "border-rose-500 bg-rose-500/5 focus:border-rose-500")}
                            />
                            {msErr?.amount ? <p className="text-xs text-rose-600 font-medium">{msErr.amount}</p> : null}
                          </label>
                        </div>
                        <label className="mt-4 block space-y-2 text-sm text-[var(--text-primary)]" data-error={Boolean(msErr?.description)}>
                          <span>Description <span className="text-rose-500 font-semibold">*</span></span>
                          <Textarea
                            className={cn("min-h-28 resize-none", msErr?.description && "border-rose-500 bg-rose-500/5 focus:border-rose-500")}
                            value={milestone.description}
                            onChange={(event) =>
                              handleMilestoneChange(milestone.id, "description", event.target.value)
                            }
                          />
                          {msErr?.description ? <p className="text-xs text-rose-600 font-medium">{msErr.description}</p> : null}
                        </label>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => setCreationStep(1)}>Back</Button>
                <Button variant="secondary" onClick={handleAddMilestone}>
                  Add Milestone
                </Button>
                <Button onClick={continueFromPlan}>
                  Review payout
                </Button>
              </div>
            </CardContent>
          </Card>

          {submitState === "created" && createdSummary ? (
            <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-800">
              <p className="font-semibold text-[var(--foreground)]">Payout draft created</p>
              <p className="mt-2 leading-6">
                <span className="font-semibold text-[var(--foreground)]">{createdSummary.title}</span> is now
                framed as a {formatUsdc(createdSummary.totalAmount)} USDC payout for {" "}
                <span className="font-semibold text-[var(--foreground)]">{createdSummary.contributorName}</span>
                across {createdSummary.milestoneCount} milestone(s).
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button href={`/payouts/${createdSummary.payoutId}`}>Open payout detail</Button>
                <Button href="/dashboard" variant="secondary">Return to dashboard</Button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right column — sidebar */}
        <div className={cn("flex flex-col gap-6", creationStep === 3 ? "" : "hidden")}>
          <Card className="hidden">
            <CardHeader>
              <CardTitle>Approval Logic</CardTitle>
            </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-[var(--text-primary)]">
                  {[{ title: "Submit work", description: "Contributors complete a milestone and submit work for review." },
                    { title: "Owner checks milestone", description: "A milestone stays locked until the owner confirms completion." },
                    { title: "Approve before release", description: "Approval is the one event that unlocks release on Arc." },
                    { title: "Release and attach proof", description: "Once released, settlement proof becomes part of the payout record." }]
                    .map((step, index) => (
                      <div key={step.title} className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
                        <div className="flex gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-400/10 text-xs font-semibold text-cyan-700">
                            {index + 1}
                          </div>
                          <div className="space-y-1.5">
                            <p className="font-semibold text-[var(--foreground)]">{step.title}</p>
                            <p className="leading-6 text-[var(--text-muted)]">{step.description}</p>
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
                  <Card className="bg-[var(--surface-muted)]">
                    <CardContent className="p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Payout title</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {payoutTitle.trim() || "Untitled payout draft"}
                      </p>
                      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Recipient</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {selectedContributor?.displayName ?? "No contributor selected"}
                      </p>
                      <p className="mt-1 text-[var(--text-muted)]">{selectedContributor?.status ?? ""}</p>
                      <p className="mt-3 font-mono text-xs text-cyan-700">
                        {shortenAddress(walletAddress || selectedContributor?.walletAddress || "")}
                      </p>
                    </CardContent>
                  </Card>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Card className="bg-[var(--surface-muted)]">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Total payout</p>
                        <p className="mt-2 font-semibold text-[var(--foreground)]">{formatUsdc(totalAmount)} USDC</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-[var(--surface-muted)]">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Total milestones</p>
                        <p className="mt-2 font-semibold text-[var(--foreground)]">{milestones.length}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Preview timeline</p>
                    {milestones.map((milestone, index) => (
                      <Card key={milestone.id} className="bg-[var(--surface-muted)]">
                        <CardContent className="p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[var(--foreground)]">
                                {index + 1}. {milestone.title.trim() || "Untitled milestone"}
                              </p>
                              <p className="mt-1 text-[var(--text-muted)]">
                                {milestone.description.trim() || "Description will appear here after the draft is refined."}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-[var(--foreground)]">
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
                  <div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={() => setCreationStep(2)}>Back to payment plan</Button><Button disabled={submitState === "creating"} onClick={() => void handleCreatePayout()}>{submitState === "creating" ? "Creating payout..." : "Create payout"}</Button></div>
                </div>
              </CardContent>
          </Card>
        </div>
      </div>
      <div>
        <Link href="/payouts"><Button variant="secondary">Back to payouts</Button></Link>
      </div>
    </section>
  );
}

export default CreatePayoutPageContent;
