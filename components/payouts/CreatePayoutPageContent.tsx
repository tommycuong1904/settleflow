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
import { createRequestTimeout } from "@/lib/client/request-timeout";
import { formatUsdc } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { AlertCircle, ArrowLeft } from "lucide-react";

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
  walletAddress?: string;
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

function createBlankMilestone(id = "milestone-draft-1"): MilestoneDraft {
  return {
    id,
    title: "",
    description: "",
    amount: "",
    state: "Planned milestone",
  };
}

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
  const { openAuthModal } = useWallet();
  const [contributors, setContributors] = useState<ContributorOption[]>([]);
  const [contributorsLoaded, setContributorsLoaded] = useState(false);
  const [contributorLoadRequest, setContributorLoadRequest] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payoutTitle, setPayoutTitle] = useState("");
  const [contributorId, setContributorId] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([createBlankMilestone()]);
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
          setLoadError(null);
          setContributorsLoaded(true);
          const target = queryContributorId ? nextContributors.find((item) => item.id === queryContributorId) : undefined;
          if (target) {
            setContributorId(target.id);
            setWalletAddress(target.walletAddress ?? "");
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Unable to load contributors", error);
          setLoadError("We couldn’t load contributors. Try again to continue creating this payout.");
          setContributorsLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, [contributorLoadRequest, productContext.workspaceId, queryContributorId]);

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
      setWalletAddress(contributor.walletAddress ?? "");
      if (errors.walletAddress) setErrors((prev) => ({ ...prev, walletAddress: undefined }));
    }
  }

  function handleMilestoneChange(
    milestoneId: string,
    field: keyof Omit<MilestoneDraft, "id">,
    value: string,
  ) {
    const nextValue = field === "amount" ? sanitizeAmountInput(value) : value;
    const nextMilestones = milestones.map((milestone) => (milestone.id === milestoneId ? { ...milestone, [field]: nextValue } : milestone));
    const nextTotal = nextMilestones.reduce((sum, milestone) => sum + (Number(milestone.amount) || 0), 0);
    const milestonesComplete = nextMilestones.length > 0 && nextMilestones.every((milestone) => milestone.title.trim() && milestone.description.trim() && Number(milestone.amount) > 0);
    setMilestones(nextMilestones);
    setErrors((prev) => ({
      ...prev,
      milestones: milestonesComplete ? undefined : prev.milestones,
      totalAmount: nextTotal > 0 ? undefined : prev.totalAmount,
    }));
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
    if (walletAddress.trim() && !isLikelyWalletAddress(walletAddress)) {
      nextErrors.walletAddress = "For Wallet payment, enter a valid wallet address that starts with 0x.";
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
          const field = firstErrorEl.querySelector<HTMLElement>('input, textarea, button');
          field?.focus({ preventScroll: true });
        }
      }, 50);
    }
    return !hasErrors;
  }

  function continueFromContributor() {
    const nextErrors: FormErrors = {};
    if (!payoutTitle.trim()) nextErrors.title = "Payout title is required.";
    if (!contributorId) nextErrors.contributorId = "Contributor selection is required.";
    if (walletAddress.trim() && !isLikelyWalletAddress(walletAddress)) nextErrors.walletAddress = "For Wallet payment, enter a valid wallet address that starts with 0x.";
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
    if (!validateForm()) {
      setSubmitState("idle");
      return;
    }
    setSubmitState("creating");
    setErrors({});
    const requestTimeout = createRequestTimeout();
    try {
      const response = await fetch("/api/v1/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: requestTimeout.signal,
        body: JSON.stringify({
          title: payoutTitle.trim(),
          contributorId,
          targetWalletAddress: walletAddress.trim() || undefined,
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
      if (error instanceof Error && error.message === "AUTH_REQUIRED") {
        openAuthModal();
        setSubmitState("idle");
        return;
      }
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
      requestTimeout.clear();
    }
  }

  const hasFormErrors = Boolean(
    errors.title || errors.contributorId || errors.walletAddress || errors.totalAmount || errors.milestones,
  );

  return (
    <section className="flex flex-col gap-6" aria-label="Create Payout Page Content">
      <ol className="grid grid-cols-3 gap-2" aria-label="Create payout progress">{[{ label: "Choose contributor", mobileLabel: "Contributor" }, { label: "Plan milestones", mobileLabel: "Plan" }, { label: "Review & create", mobileLabel: "Review" }].map(({ label, mobileLabel }, index) => { const step = index + 1; const complete = creationStep > step; const current = creationStep === step; return <li key={label} className="relative flex flex-col items-center text-center">{index < 2 ? <span aria-hidden className={`absolute left-1/2 top-3.5 h-px w-[calc(100%+0.5rem)] ${complete ? "bg-emerald-600" : "bg-[var(--border-soft)]"}`} /> : null}<span className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${complete ? "bg-emerald-600 text-white" : current ? "bg-black text-white" : "bg-[var(--surface-strong)] text-[var(--text-muted)]"}`}>{complete ? "✓" : step}</span><p className={`mt-1 text-xs ${current ? "font-medium text-[var(--foreground)]" : "text-[var(--text-muted)]"}`}><span className="sm:hidden">{mobileLabel}</span><span className="hidden sm:inline">{label}</span></p></li>; })}</ol>
      <div className="grid w-full gap-6">
        <div className="space-y-6">
          {loadError ? (
            <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
              <p>{loadError}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setContributorsLoaded(false);
                  setLoadError(null);
                  setContributorLoadRequest((current) => current + 1);
                }}
                className="shrink-0 self-start sm:self-auto"
              >
                Try again
              </Button>
            </div>
          ) : null}
          {errors.submit ? <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-700">{errors.submit}</p> : null}

          {/* Summary Error Alert */}
          {hasFormErrors ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 flex items-start gap-3 shadow-xs animate-in fade-in" role="alert">
              <AlertCircle size={20} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="font-semibold text-rose-800">Complete the highlighted fields to continue.</p>
            </div>
          ) : null}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="col-span-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-4 sm:col-span-1">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Total payout</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">{formatUsdc(totalAmount)} USDC</p>
              </div>
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Milestones</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">{milestones.length}</p>
              </div>
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Payment rule</p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-[var(--foreground)]">Pay after approval</p>
              </div>
            </div>
          </div>

          <Card className={cn("sf-shell", creationStep === 1 ? "" : "hidden")}>
            <CardHeader>
              <CardTitle>Payout details</CardTitle>
              <CardDescription>Start with the agreement details. Payment method details can wait until work is approved.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="text-sm text-[var(--text-primary)]" data-error={Boolean(errors.title)}>
                  <span className="mb-2.5 block">Payout title <span className="text-rose-500 font-semibold">*</span></span>
                  <Input
                    aria-label="Payout title"
                    value={payoutTitle}
                    onChange={(event) => {
                      setPayoutTitle(event.target.value);
                      if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                    }}
                    placeholder="e.g. Q4 campaign design"
                    className={cn(errors.title && "border-rose-500 bg-rose-500/5 focus:border-rose-500")}
                  />
                  {errors.title ? <p className="mt-2 text-xs text-rose-600 font-medium">{errors.title}</p> : null}
                </label>
                {contributorsLoaded && contributors.length === 0 && !loadError ? (
                  <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] p-4">
                    <p className="font-medium text-[var(--foreground)]">Add a contributor before creating a payout.</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">Start with their name and email. Payment details can be added later.</p>
                    <Button href={`/contributors?workspaceId=${encodeURIComponent(productContext.workspaceId)}&returnTo=${encodeURIComponent(`/payouts/new?workspaceId=${encodeURIComponent(productContext.workspaceId)}`)}`} variant="secondary" size="sm" className="mt-4 w-full justify-center sm:w-auto">
                      Add contributor
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col gap-2.5 text-sm text-[var(--text-primary)]" data-error={Boolean(errors.contributorId)}>
                    <span>Contributor <span className="text-rose-500 font-semibold">*</span></span>
                    <Select value={contributorId} onValueChange={handleContributorChange}>
                      <SelectTrigger className={cn(errors.contributorId && "border-rose-500 bg-rose-500/5")}>
                        <SelectValue placeholder={contributorsLoaded ? "Select a contributor" : "Loading contributors…"} />
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
                )}
                <details className="md:col-span-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
                  <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)]">Add wallet payment details (advanced)</summary>
                  <label className="mt-4 flex flex-col gap-2.5 text-sm text-[var(--text-primary)]" data-error={Boolean(errors.walletAddress)}>
                    <span>Recipient wallet address <span className="text-[var(--text-muted)]">(only needed for Wallet payment)</span></span>
                    <Input
                      aria-label="Wallet address"
                      value={walletAddress}
                      placeholder="Add only when using Wallet payment"
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
                </details>
              </div>
              <div className="mt-6 flex justify-end"><Button onClick={continueFromContributor} disabled={!contributorsLoaded || contributors.length === 0} className="w-full justify-center sm:w-auto">Continue to milestones</Button></div>
            </CardContent>
          </Card>

          <Card className={cn("sf-shell", creationStep === 2 ? "" : "hidden")}>
            <CardHeader>
              <CardTitle>Milestone Structure</CardTitle>
              <CardDescription>Split the work into reviewable milestones. Each milestone can be paid after approval.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Review step</p>
                    <p className="mt-2 font-semibold text-[var(--foreground)]">Submit → review → approve</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Payment rule</p>
                    <p className="mt-2 font-semibold text-[var(--foreground)]">Only approved milestones are ready to pay</p>
                  </div>
                </div>
              </div>

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
                          <label className="flex flex-col gap-2.5 text-sm text-[var(--text-primary)]" data-error={Boolean(msErr?.title)}>
                            <span>Milestone title <span className="text-rose-500 font-semibold">*</span></span>
                            <Input
                              aria-label={`Milestone ${index + 1} title`}
                              value={milestone.title}
                              placeholder="e.g. Design concepts"
                              onChange={(event) =>
                                handleMilestoneChange(milestone.id, "title", event.target.value)
                              }
                              className={cn(msErr?.title && "border-rose-500 bg-rose-500/5 focus:border-rose-500")}
                            />
                            {msErr?.title ? <p className="text-xs text-rose-600 font-medium">{msErr.title}</p> : null}
                          </label>
                          <label className="flex flex-col gap-2.5 text-sm text-[var(--text-primary)]" data-error={Boolean(msErr?.amount)}>
                            <span>Amount (USDC) <span className="text-rose-500 font-semibold">*</span></span>
                            <Input
                              aria-label={`Milestone ${index + 1} amount in USDC`}
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              value={milestone.amount}
                              placeholder="0.00"
                              onChange={(event) =>
                                handleMilestoneChange(milestone.id, "amount", event.target.value)
                              }
                              className={cn(msErr?.amount && "border-rose-500 bg-rose-500/5 focus:border-rose-500")}
                            />
                            {msErr?.amount ? <p className="text-xs text-rose-600 font-medium">{msErr.amount}</p> : null}
                          </label>
                        </div>
                        <label className="mt-4 flex flex-col gap-2.5 text-sm text-[var(--text-primary)]" data-error={Boolean(msErr?.description)}>
                          <span>Description <span className="text-rose-500 font-semibold">*</span></span>
                          <Textarea
                            aria-label={`Milestone ${index + 1} description`}
                            className={cn("min-h-28 resize-none", msErr?.description && "border-rose-500 bg-rose-500/5 focus:border-rose-500")}
                            value={milestone.description}
                            placeholder="Describe the work and what is ready for review."
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
              <div className="mt-5 border-t border-[var(--border-soft)] pt-4 sm:border-0 sm:pt-0">
                <div className="mb-4 flex items-baseline justify-between gap-3 sm:hidden">
                  <p className="text-sm font-medium text-[var(--foreground)]">{formatUsdc(totalAmount)} USDC total</p>
                  <p className="text-xs text-[var(--text-muted)]">{milestones.length} milestone{milestones.length === 1 ? "" : "s"}</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => setCreationStep(1)} className="w-full justify-center sm:w-auto">Back</Button>
                  <Button variant="secondary" onClick={handleAddMilestone} className="w-full justify-center sm:w-auto">
                    Add another milestone
                  </Button>
                  <Button onClick={continueFromPlan} className="w-full justify-center sm:w-auto">
                  Review payout
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {submitState === "created" && createdSummary ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-800">
              <p className="font-semibold text-[var(--foreground)]">Payout draft created</p>
              <p className="mt-2 leading-6">
                <span className="font-semibold text-[var(--foreground)]">{createdSummary.title}</span> is now
                created as a {formatUsdc(createdSummary.totalAmount)} USDC payout for {" "}
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

        <div className={cn("flex flex-col gap-6", creationStep === 3 ? "" : "hidden")}>
          <Card className="sf-shell">
            <CardHeader>
              <CardTitle>Review payout</CardTitle>
                <CardDescription>Check the contributor, work, milestones, and amount before creating the draft.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 text-sm text-[var(--text-primary)]">
                  <div className="grid gap-5 border-y border-[var(--border-soft)] py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Payout title</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{payoutTitle.trim() || "Untitled payout draft"}</p>
                      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Contributor</p>
                      <p className="mt-2 font-semibold text-[var(--foreground)]">{selectedContributor?.displayName ?? "No contributor selected"}</p>
                      {selectedContributor?.status ? <p className="mt-1 text-xs text-[var(--text-muted)]">{selectedContributor.status}</p> : null}
                    </div>
                    <div className="grid grid-cols-2 gap-5 sm:text-right">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Total payout</p>
                        <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{formatUsdc(totalAmount)} USDC</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Milestones</p>
                        <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{milestones.length}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Milestones</p>
                    <div className="mt-3 divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
                      {milestones.map((milestone, index) => (
                        <div key={milestone.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--foreground)]">{index + 1}. {milestone.title.trim() || "Untitled milestone"}</p>
                            <p className="mt-1 leading-6 text-[var(--text-muted)]">{milestone.description.trim() || "Description will appear here after the draft is refined."}</p>
                          </div>
                          <div className="flex shrink-0 items-center justify-between gap-3 sm:block sm:text-right">
                            <p className="font-semibold text-[var(--foreground)]">{Number(milestone.amount) > 0 ? `${formatUsdc(Number(milestone.amount))} USDC` : "0 USDC"}</p>
                            <div className="sm:mt-2"><Badge variant="secondary">{milestone.state}</Badge></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="border-l-2 border-[var(--border-strong)] pl-4 leading-6 text-[var(--text-muted)]">After you create the payout, the contributor can submit work. You can review it, approve it, and choose a payment method when it is ready.</p>
                  <div className="flex flex-col gap-3 border-t border-[var(--border-soft)] pt-5 sm:flex-row sm:flex-wrap sm:border-0 sm:pt-0">
                    <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => setCreationStep(2)} className="w-full justify-center sm:w-auto">Back to milestones</Button>
                    <Button disabled={submitState === "creating"} onClick={() => void handleCreatePayout()} className="w-full justify-center sm:w-auto">{submitState === "creating" ? "Creating payout..." : "Create payout"}</Button>
                  </div>
                </div>
              </CardContent>
          </Card>
        </div>
      </div>
      <div>
        <Link href="/payouts" className="block sm:inline-block"><Button variant="secondary" icon={<ArrowLeft size={16} />} className="w-full justify-center sm:w-auto">Back to payouts</Button></Link>
      </div>
    </section>
  );
}

export default CreatePayoutPageContent;
