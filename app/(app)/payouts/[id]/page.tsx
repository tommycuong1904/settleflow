import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { PayoutDetailClient } from "@/components/payouts/payout-detail-client";
import { getPayoutActivity } from "@/lib/repositories/payout-activity";
import { getPayoutDetail, projectPayoutDetail } from "@/lib/repositories/payouts";
import { resolveProductContextForServerPage } from "@/lib/auth/session-server";
import { ServerAuthContextState } from "@/components/shared/server-auth-context-state";

type PayoutDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PayoutDetailPage({
  params,
  searchParams,
}: PayoutDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const contextResult = await resolveProductContextForServerPage(cookieStore, {
    workspaceId: Array.isArray(resolvedSearchParams.workspaceId)
      ? resolvedSearchParams.workspaceId[0]
      : resolvedSearchParams.workspaceId,
    ownerUserId: Array.isArray(resolvedSearchParams.ownerUserId)
      ? resolvedSearchParams.ownerUserId[0]
      : resolvedSearchParams.ownerUserId,
    reviewerUserId: Array.isArray(resolvedSearchParams.reviewerUserId)
      ? resolvedSearchParams.reviewerUserId[0]
      : resolvedSearchParams.reviewerUserId,
    contributorUserId: Array.isArray(resolvedSearchParams.contributorUserId)
      ? resolvedSearchParams.contributorUserId[0]
      : resolvedSearchParams.contributorUserId,
  });
  if (contextResult.kind === "auth-required") redirect(`/auth-required?next=${encodeURIComponent(`/payouts/${id}`)}`);
  if (contextResult.kind !== "authenticated") return <ServerAuthContextState kind={contextResult.kind} />;
  const productContext = contextResult.productContext;

  if (productContext.actor === "ops") {
    return <ServerAuthContextState kind="authenticated-forbidden" />;
  }

  const scope = productContext.actor === "contributor"
    ? { linkedUserId: productContext.activeUserId }
    : undefined;
  const detail = await getPayoutDetail(id, productContext.workspaceId, scope);

  if (!detail) {
    notFound();
  }

  const projectedDetail = projectPayoutDetail(detail, productContext.actor);
  if (productContext.actor === "reviewer") {
    return (
      <PayoutDetailClient
        payout={projectedDetail.payout as never}
        contributor={undefined}
        initialMilestones={projectedDetail.milestones as never}
        initialReleaseProof={undefined}
        initialActivity={[]}
        currentActor={productContext.actor}
      />
    );
  }

  const activity = await getPayoutActivity(id, productContext.workspaceId, scope, productContext.actor);

  return (
    <PayoutDetailClient
      payout={detail.payout}
      contributor={detail.contributor}
      initialMilestones={detail.milestones}
      initialReleaseProof={detail.releaseProof}
      initialActivity={activity as unknown as import("@/lib/models/activity-item").ActivityItem[]}
      currentActor={productContext.actor}
    />
  );
}
