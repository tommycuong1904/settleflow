import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PayoutDetailClient } from "@/components/payouts/payout-detail-client";
import { getPayoutActivity } from "@/lib/repositories/payout-activity";
import { getPayoutDetail } from "@/lib/repositories/payouts";
import { resolveProductContextFromCookies } from "@/lib/runtime/product-context-server";

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
  const productContext = resolveProductContextFromCookies(cookieStore, {
    actor: Array.isArray(resolvedSearchParams.actor)
      ? resolvedSearchParams.actor[0]
      : resolvedSearchParams.actor,
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

  const detail = await getPayoutDetail(id, productContext.workspaceId);

  if (!detail) {
    notFound();
  }

  const activity = await getPayoutActivity(id);

  return (
    <PayoutDetailClient
      payout={detail.payout}
      contributor={detail.contributor}
      initialMilestones={detail.milestones}
      initialReleaseProof={detail.releaseProof}
      initialActivity={activity}
      currentActor={productContext.actor}
    />
  );
}
