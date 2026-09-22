import { Suspense } from "react";
import CreatePayoutPageContent from "@/components/payouts/CreatePayoutPageContent";
import { PageHeader } from "@/components/shared/page-header";
import { WalletGate } from "@/components/dashboard/wallet-gate";

export const dynamic = "force-dynamic";

export default function CreatePayoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[var(--text-muted)]">Loading payout form...</div>}>
      <div className="sf-container flex flex-col py-10 md:py-12">
        {/* Header */}
        <PageHeader
          eyebrow="Payouts"
          title="Create a payout"
          description="Choose a contributor, plan the milestones, then review the agreement."
        />
        <div className="mt-8"><WalletGate /></div>
        <div className="mt-8"><CreatePayoutPageContent /></div>
      </div>
    </Suspense>
  );
}
