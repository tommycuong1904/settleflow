import { Suspense } from "react";
import CreatePayoutPageContent from "@/components/payouts/CreatePayoutPageContent";
import { PageHeader } from "@/components/shared/page-header";
import { WalletGate } from "@/components/dashboard/wallet-gate";

export const dynamic = "force-dynamic";

export default function CreatePayoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[var(--text-muted)]">Loading payout form...</div>}>
      <div className="sf-app-wrapper flex flex-col py-8 md:py-12 gap-8">
        {/* Header */}
        <PageHeader
          eyebrow="Payouts"
          title="Create a payout"
          description="Choose a contributor, plan the milestones, then review the agreement."
        />
        {/* Wallet Gate */}
        <WalletGate />
        <CreatePayoutPageContent />
      </div>
    </Suspense>
  );
}

