import { Suspense } from "react";
import CreatePayoutPageContent from "@/components/payouts/CreatePayoutPageContent";
import { WalletGate } from "@/components/dashboard/wallet-gate";
import { SectionCard } from "@/components/shared/section-card";

export const dynamic = "force-dynamic";

export default function CreatePayoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[var(--text-muted)]">Loading payout form...</div>}>
      <div className="sf-app-wrapper flex flex-col py-10 md:py-12 gap-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">Escrow Contracts</p>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl">Create New Payout</h1>
            </div>
          </div>
        </div>
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


