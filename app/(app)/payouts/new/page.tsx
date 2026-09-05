import { Suspense } from "react";
import CreatePayoutPageContent from "@/components/payouts/CreatePayoutPageContent";
import { PageHeader } from "@/components/shared/page-header";
import { WalletGate } from "@/components/dashboard/wallet-gate";
import { SectionCard } from "@/components/shared/section-card";

export const dynamic = "force-dynamic";

export default function CreatePayoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[var(--text-muted)]">Loading payout form...</div>}>
      <div className="sf-app-wrapper flex flex-col py-8 md:py-12 gap-8">
        {/* Header */}
        <PageHeader
          eyebrow="Escrow Contracts"
          title="Create New Payout"
          description="Define milestone allocations, assign recipient wallet addresses on Arc Testnet, and setup approval rules."
        />
        {/* Wallet Gate */}
        <WalletGate />
        {/* Form Section */}
        <SectionCard title="">
          <CreatePayoutPageContent />
        </SectionCard>
      </div>
    </Suspense>
  );
}


