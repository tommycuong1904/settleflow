import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PayoutDetailClient } from "@/components/payouts/payout-detail-client";
import { getPayoutActivity } from "@/lib/repositories/payout-activity";
import { getPayoutDetail } from "@/lib/repositories/payouts";
import { resolveProductContextFromCookies } from "@/lib/runtime/product-context-server";

type PayoutDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PayoutDetailPage({
  params,
}: PayoutDetailPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const productContext = resolveProductContextFromCookies(cookieStore);

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
    />
  );
}
