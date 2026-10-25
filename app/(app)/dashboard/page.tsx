import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/shared/button";
import { PageHeader } from "@/components/shared/page-header";
import { getDashboardData } from "@/lib/repositories/dashboard";
import { resolveProductContextForServerPage } from "@/lib/auth/session-server";
import { ServerAuthContextState } from "@/components/shared/server-auth-context-state";
import { formatUsdc } from "@/lib/utils/format";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  let payouts: Awaited<ReturnType<typeof getDashboardData>>["payouts"] = [];
  let milestones: Awaited<ReturnType<typeof getDashboardData>>["milestones"] = [];
  let contributors: Awaited<ReturnType<typeof getDashboardData>>["contributors"] = [];
  let transactionProofs: Awaited<ReturnType<typeof getDashboardData>>["transactionProofs"] = [];
  let paymentAttempts: Awaited<ReturnType<typeof getDashboardData>>["paymentAttempts"] = [];

  const contextResult = await resolveProductContextForServerPage(cookieStore);
  if (contextResult.kind === "auth-required") {
    redirect("/auth-required?next=/dashboard");
  }
  if (contextResult.kind === "auth-context-required") {
    return <ServerAuthContextState kind={contextResult.kind} />;
  }
  if (contextResult.kind === "authenticated") {
    const productContext = contextResult.productContext;
    if (productContext.actor === "reviewer" || productContext.actor === "ops") {
      return (
        <div className="sf-app-wrapper flex flex-col gap-8 py-8 md:py-12">
          <PageHeader
            eyebrow="Workspace"
            title="Workspace activity"
            description="Your role does not use the payout dashboard. Review the workspace activity for the updates available to you."
          />
          <section className="sf-shell rounded-2xl p-6 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Workspace access</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">Review updates for this workspace</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">Use Activity to see submitted work, decisions, and payment updates that are visible to your role.</p>
            <Button href="/activity" className="mt-5 w-full justify-center sm:w-auto">View activity</Button>
          </section>
        </div>
      );
    }
    const dashboardData = await getDashboardData({
      workspaceId: productContext.workspaceId,
      role: productContext.actor,
      userId: productContext.activeUserId,
    });
    payouts = dashboardData.payouts;
    milestones = dashboardData.milestones;
    contributors = dashboardData.contributors;
    transactionProofs = dashboardData.transactionProofs;
    paymentAttempts = dashboardData.paymentAttempts;
  }
  const isOwner = contextResult.kind === "authenticated" && contextResult.productContext.actor === "owner";
  const activeWorkspaceId = contextResult.kind === "authenticated"
    ? contextResult.productContext.workspaceId
    : "";
  const hasContributors = contributors.length > 0;
  const hasPayouts = payouts.length > 0;
  const isOwnerSetup = isOwner && (!hasContributors || !hasPayouts);

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
  const contributorWorkMilestones = isOwner
    ? []
    : milestones.filter((milestone) => milestone.status === "pending" || milestone.status === "rejected");
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
    ...contributorWorkMilestones.map((milestone) => ({
      id: `submit-${milestone.id}`,
      href: `/payouts/${milestone.payoutId}?workspaceId=${encodeURIComponent(activeWorkspaceId)}`,
      title: milestone.status === "rejected" ? `Update ${milestone.title}` : `Submit ${milestone.title}`,
      description: milestone.status === "rejected"
        ? "The workspace owner requested changes. Update the work, then submit it again."
        : `${milestone.description} When it is ready, submit it for the workspace owner to review.`,
      action: milestone.status === "rejected" ? "Update work" : "Submit work",
    })),
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
  const remainingTasks = workQueue.slice(1);
  const recentPayments = [
    ...paymentAttempts
      .filter((payment) => payment.status === "completed")
      .map((payment) => ({
        id: `payment-${payment.id}`,
        payoutId: payment.payoutId,
        milestone: milestones.find((milestone) => milestone.id === payment.milestoneId),
        amount: payment.amount,
        completedAt: payment.completedAt,
        label: payment.method === "simulated" ? "Recorded for testing" : "Payment completed",
      })),
    ...transactionProofs
      .filter((proof) => proof.status === "confirmed")
      .map((proof) => ({
        id: `proof-${proof.id}`,
        payoutId: milestones.find((milestone) => milestone.id === proof.milestoneId)?.payoutId,
        milestone: milestones.find((milestone) => milestone.id === proof.milestoneId),
        amount: milestones.find((milestone) => milestone.id === proof.milestoneId)?.amount ?? 0,
        completedAt: proof.confirmedAt,
        label: "Payment confirmed",
      })),
  ]
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .slice(0, 3);

  return (
    <div className="sf-app-wrapper flex flex-col gap-8 py-8 md:py-12">
      <PageHeader
        eyebrow="Workspace"
        title="Today’s work"
        description="Complete the next payout task, then move on."
      >
        {isOwner && hasContributors && !nextTask && !isOwnerSetup ? (
          <Button href="/payouts/new" variant="primary" size="sm" className="w-full justify-center md:w-auto">
            <Plus size={15} className="mr-1.5" /> New Payout
          </Button>
        ) : null}
      </PageHeader>

      <section className="sf-shell rounded-2xl p-6 md:p-7 shadow-[0_2px_6px_rgba(15,23,42,0.08)]">
        {nextTask ? (
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Up next</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">{nextTask.title}</h2><p className="mt-2 text-sm text-[var(--text-muted)]">{nextTask.description}</p></div><Button href={nextTask.href} className="w-full justify-center sm:w-auto">{nextTask.action}</Button></div>
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{isOwnerSetup ? (!hasContributors ? "Step 1 of 2" : "Step 2 of 2") : hasPayouts ? "All caught up" : "Get started"}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              {!hasContributors
                ? isOwner ? "Add the first person you will pay." : "Your workspace is getting ready."
                : !hasPayouts ? isOwner ? "Create your first payout." : "No payout task needs you right now."
                  : "No payout task needs you right now."}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {!hasContributors
                ? isOwner
                  ? "Add a contributor with their name and email. Payment details can be added later."
                  : "Your workspace owner will add contributors and create the first payout."
                : !hasPayouts
                  ? isOwner
                    ? "Set the work, milestones, and amount. You can choose a payment method later."
                    : "The workspace owner will create the first payout."
                  : "Create a payout or return when a contributor submits work."}
            </p>
            {isOwner && !hasContributors ? (
              <Button href="/contributors" className="mt-5 w-full justify-center sm:w-auto">
                <Plus size={15} className="mr-1.5" /> Add your first contributor
              </Button>
            ) : isOwner && !hasPayouts ? (
              <Button href="/payouts/new" className="mt-5 w-full justify-center sm:w-auto">
                <Plus size={15} className="mr-1.5" /> Create your first payout
              </Button>
            ) : null}
          </div>
        )}
      </section>

      {!isOwnerSetup && hasPayouts ? (
        <>
      <section className="sf-shell rounded-2xl p-6 md:p-7 shadow-[0_2px_6px_rgba(15,23,42,0.08)]"><div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold text-[var(--foreground)]">Your work queue</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Work is ordered so the next safe action is always clear.</p></div>{hasPayouts ? <Button href="/payouts" variant="ghost" size="sm">View all payouts</Button> : null}</div><div className="mt-5 divide-y divide-[var(--border-soft)]">{remainingTasks.length > 0 ? remainingTasks.map((task) => <div key={task.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-[var(--foreground)]">{task.title}</p><p className="mt-1 text-sm text-[var(--text-muted)]">{task.description}</p></div><Button href={task.href} variant="secondary" size="sm" className="w-full justify-center sm:w-auto">{task.action}</Button></div>) : <p className="py-4 text-sm text-[var(--text-muted)]">{nextTask ? "Complete the current task above, then your next task will appear here." : !hasContributors ? isOwner ? "After you add a contributor, create a payout to define the work and payment milestones." : "Tasks will appear after your workspace owner sets up the first payout." : !hasPayouts ? isOwner ? "After you create a payout, submitted work, approvals, and payment tasks will appear here." : "Tasks will appear after the workspace owner creates the first payout." : "New review, payment, and verification tasks will appear here."}</p>}</div></section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]"><div className="sf-shell rounded-2xl p-6 md:p-7 shadow-[0_2px_6px_rgba(15,23,42,0.08)]"><h2 className="text-lg font-semibold text-[var(--foreground)]">Recent payments</h2><div className="mt-4 divide-y divide-[var(--border-soft)]">{recentPayments.length > 0 ? recentPayments.map((payment) => <a key={payment.id} href={payment.milestone ? `/payouts/${payment.milestone.payoutId}` : "/payouts"} className="block py-3 first:pt-0 hover:opacity-70"><p className="font-medium text-[var(--foreground)]">{payment.milestone?.title ?? "Payment completed"}</p><p className="mt-1 text-sm text-[var(--text-muted)]">{formatUsdc(payment.amount)} USDC · {payment.label}</p></a>) : <p className="py-3 text-sm text-[var(--text-muted)]">Completed payments will appear here.</p>}</div></div><details className="sf-shell rounded-2xl p-6 md:p-7 shadow-[0_2px_6px_rgba(15,23,42,0.08)]"><summary className="cursor-pointer text-lg font-semibold text-[var(--foreground)]">Workspace snapshot</summary><div className="mt-4 space-y-3 text-sm text-[var(--text-muted)]"><p>{activePayouts.length} active payouts</p><p>{formatUsdc(inFlightSettlementValue)} USDC payment in progress</p><p>{formatUsdc(outstandingExposure)} USDC left to pay across active payouts</p><p>{formatUsdc(releasedValue)} USDC paid</p></div></details></section>
        </>
      ) : null}
    </div>


  );
}
