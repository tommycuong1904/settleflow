import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/shared/button";
import { PageHeader } from "@/components/shared/page-header";
import { getDashboardData } from "@/lib/repositories/dashboard";
import { resolveProductContextForServerPage } from "@/lib/auth/session-server";
import { ServerAuthContextState } from "@/components/shared/server-auth-context-state";
import { WalletGate } from "@/components/dashboard/wallet-gate";
import { formatUsdc } from "@/lib/utils/format";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  let payouts: Awaited<ReturnType<typeof getDashboardData>>["payouts"] = [];
  let milestones: Awaited<ReturnType<typeof getDashboardData>>["milestones"] = [];
  let contributors: Awaited<ReturnType<typeof getDashboardData>>["contributors"] = [];
  let transactionProofs: Awaited<ReturnType<typeof getDashboardData>>["transactionProofs"] = [];

  const contextResult = await resolveProductContextForServerPage(cookieStore);
  if (contextResult.kind === "auth-required") {
    redirect("/auth-required?next=/dashboard");
  }
  if (contextResult.kind === "auth-context-required") {
    return <ServerAuthContextState kind={contextResult.kind} />;
  }
  if (contextResult.kind === "authenticated") {
    const productContext = contextResult.productContext;
    if (productContext.actor === "reviewer" || productContext.actor === "ops") throw new Error("FORBIDDEN_DASHBOARD_SUMMARY");
    const dashboardData = await getDashboardData({
      workspaceId: productContext.workspaceId,
      role: productContext.actor,
      userId: productContext.activeUserId,
    });
    payouts = dashboardData.payouts;
    milestones = dashboardData.milestones;
    contributors = dashboardData.contributors;
    transactionProofs = dashboardData.transactionProofs;
  }
  const isOwner = contextResult.kind === "authenticated" && contextResult.productContext.actor === "owner";

  const activePayouts = payouts.filter((payout) =>
    ["active", "partially_released"].includes(payout.status),
  );
  const pendingApprovals = milestones.filter(
    (milestone) => milestone.status === "submitted",
  );
  const releasedMilestones = milestones.filter(
    (milestone) => milestone.status === "released",
  );
  const totalScheduled = payouts.reduce(
    (sum, payout) => sum + payout.totalAmount,
    0,
  );
  const releaseReadyMilestones = milestones.filter(
    (milestone) => milestone.status === "approved",
  );
  const releasedValue = releasedMilestones.reduce(
    (sum, milestone) => sum + milestone.amount,
    0,
  );
  const outstandingExposure = Math.max(totalScheduled - releasedValue, 0);
  const failedSettlementProof = transactionProofs.find((proof) => proof.status === "failed");
  const pendingSettlementProofs = transactionProofs.filter((proof) => proof.status === "pending");
  const failedSettlementMilestone = failedSettlementProof
    ? milestones.find((milestone) => milestone.id === failedSettlementProof.milestoneId)
    : undefined;
  const inFlightSettlementValue = pendingSettlementProofs.reduce((sum, proof) => {
    const milestone = milestones.find((item) => item.id === proof.milestoneId);
    return sum + (milestone?.amount ?? 0);
  }, 0);
  const payoutFor = (payoutId: string) => payouts.find((payout) => payout.id === payoutId);
  const contributorNameFor = (payoutId: string) => {
    const payout = payoutFor(payoutId);
    return contributors.find((contributor) => contributor.id === payout?.contributorId)?.name ?? "Contributor";
  };
  const workQueue = [
    ...pendingSettlementProofs.map((proof) => {
      const milestone = milestones.find((item) => item.id === proof.milestoneId);
      return {
        id: `pending-${proof.id}`,
        href: milestone ? `/payouts/${milestone.payoutId}` : "/payouts",
        title: isOwner ? "Verify a payment already sent" : "Payment is being verified",
        description: `${milestone?.title ?? "A milestone"} for ${contributorNameFor(milestone?.payoutId ?? "")} ${isOwner ? "needs payment confirmation. Do not send it again." : "has been sent and is awaiting confirmation."}`,
        action: isOwner ? "Verify payment" : "View payout",
      };
    }),
    ...(failedSettlementProof ? [{
      id: `failed-${failedSettlementProof.id}`,
      href: failedSettlementMilestone ? `/payouts/${failedSettlementMilestone.payoutId}` : "/payouts",
      title: isOwner ? "Review a payment issue" : "Payment needs owner attention",
      description: `${failedSettlementMilestone?.title ?? "A milestone"} needs your decision before another payment attempt.`,
      action: isOwner ? "Review issue" : "View payout",
    }] : []),
    ...pendingApprovals.map((milestone) => ({
      id: `review-${milestone.id}`,
      href: `/payouts/${milestone.payoutId}`,
      title: isOwner ? `Review work from ${contributorNameFor(milestone.payoutId)}` : "Waiting for owner review",
      description: isOwner ? `${milestone.title} · ${formatUsdc(milestone.amount)} USDC` : `${milestone.title} has been submitted.`,
      action: isOwner ? "Review work" : "View payout",
    })),
    ...(isOwner ? releaseReadyMilestones.map((milestone) => ({
      id: `pay-${milestone.id}`,
      href: `/payouts/${milestone.payoutId}`,
      title: `Pay ${formatUsdc(milestone.amount)} USDC to ${contributorNameFor(milestone.payoutId)}`,
      description: `${milestone.title} is approved and ready for payment.`,
      action: "Review & pay",
    })) : []),
  ].slice(0, 5);
  const nextTask = workQueue[0];
  const confirmedProofs = transactionProofs.filter((proof) => proof.status === "confirmed").slice(0, 3);

  return (
    <div className="sf-app-wrapper flex flex-col gap-8 py-8 md:py-12">
      <PageHeader
        eyebrow="Workspace"
        title="Today’s work"
        description="Complete the next payout task, then move on."
      >
        {nextTask ? (
          <Button href={nextTask.href} variant="primary" size="sm">
            {nextTask.action}
          </Button>
        ) : null}
        <Button href="/payouts/new" variant={nextTask ? "secondary" : "primary"} size="sm">
          <Plus size={15} className="mr-1.5" /> New Payout
        </Button>
      </PageHeader>

      {/* Inline Web3 wallet connection gate */}
      <WalletGate />

      <section className="sf-shell rounded-2xl p-6 md:p-7">
        {nextTask ? (
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Up next</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">{nextTask.title}</h2><p className="mt-2 text-sm text-[var(--text-muted)]">{nextTask.description}</p></div><Button href={nextTask.href}>{nextTask.action}</Button></div>
        ) : (
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">All caught up</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">No payout task needs you right now.</h2><p className="mt-2 text-sm text-[var(--text-muted)]">Create a payout or return when a contributor submits work.</p></div>
        )}
      </section>

      <section className="sf-shell rounded-2xl p-6 md:p-7"><div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold text-[var(--foreground)]">Your work queue</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Work is ordered so the next safe action is always clear.</p></div><Button href="/payouts" variant="ghost" size="sm">View all payouts</Button></div><div className="mt-5 divide-y divide-[var(--border-soft)]">{workQueue.length > 0 ? workQueue.map((task) => <div key={task.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-[var(--foreground)]">{task.title}</p><p className="mt-1 text-sm text-[var(--text-muted)]">{task.description}</p></div><Button href={task.href} variant="secondary" size="sm">{task.action}</Button></div>) : <p className="py-4 text-sm text-[var(--text-muted)]">New review, payment, and verification tasks will appear here.</p>}</div></section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]"><div className="sf-shell rounded-2xl p-6 md:p-7"><h2 className="text-lg font-semibold text-[var(--foreground)]">Recent payments</h2><div className="mt-4 divide-y divide-[var(--border-soft)]">{confirmedProofs.length > 0 ? confirmedProofs.map((proof) => { const milestone = milestones.find((item) => item.id === proof.milestoneId); return <a key={proof.id} href={milestone ? `/payouts/${milestone.payoutId}` : "/payouts"} className="block py-3 first:pt-0 hover:opacity-70"><p className="font-medium text-[var(--foreground)]">{milestone?.title ?? "Payment confirmed"}</p><p className="mt-1 text-sm text-[var(--text-muted)]">{formatUsdc(milestone?.amount ?? 0)} USDC · Confirmed</p></a>; }) : <p className="py-3 text-sm text-[var(--text-muted)]">Confirmed payments will appear here.</p>}</div></div><details className="sf-shell rounded-2xl p-6 md:p-7"><summary className="cursor-pointer text-lg font-semibold text-[var(--foreground)]">Workspace snapshot</summary><div className="mt-4 space-y-3 text-sm text-[var(--text-muted)]"><p>{activePayouts.length} active payouts</p><p>{formatUsdc(inFlightSettlementValue)} USDC awaiting payment confirmation</p><p>{formatUsdc(outstandingExposure)} USDC remains across active payouts</p><p>{formatUsdc(releasedValue)} USDC confirmed paid</p></div></details></section>
    </div>


  );
}
