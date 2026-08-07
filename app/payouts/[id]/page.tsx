import { notFound } from "next/navigation";

import { PayoutDetailClient } from "@/components/payouts/payout-detail-client";
import { getPayoutDetail } from "@/lib/repositories/payouts";

type PayoutDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PayoutDetailPage({
  params,
}: PayoutDetailPageProps) {
  const { id } = await params;
  const detail = await getPayoutDetail(id);

  if (!detail) {
    notFound();
  }

  return (
    <PayoutDetailClient
      payout={detail.payout}
      contributor={detail.contributor}
      initialMilestones={detail.milestones}
      initialReleaseProof={detail.releaseProof}
    />
  );
}
