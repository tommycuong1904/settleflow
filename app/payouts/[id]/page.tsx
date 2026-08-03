import { notFound } from "next/navigation";

import { PayoutDetailClient } from "@/components/payouts/payout-detail-client";
import { mockContributors } from "@/lib/data/mock-contributors";
import { mockMilestones } from "@/lib/data/mock-milestones";
import { mockPayouts } from "@/lib/data/mock-payouts";
import { mockTransactionProofs } from "@/lib/data/mock-transaction-proofs";

type PayoutDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PayoutDetailPage({
  params,
}: PayoutDetailPageProps) {
  const { id } = await params;
  const payout = mockPayouts.find((item) => item.id === id);

  if (!payout) {
    notFound();
  }

  const milestones = mockMilestones.filter(
    (milestone) => milestone.payoutId === payout.id,
  );
  const contributor = mockContributors.find(
    (item) => item.id === payout.contributorId,
  );
  const releaseProof = mockTransactionProofs.find((proof) =>
    milestones.some((milestone) => milestone.id === proof.milestoneId),
  );

  return (
    <PayoutDetailClient
      payout={payout}
      contributor={contributor}
      initialMilestones={milestones}
      initialReleaseProof={releaseProof}
    />
  );
}
