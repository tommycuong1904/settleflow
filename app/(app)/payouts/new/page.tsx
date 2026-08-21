import { Suspense } from "react";
import CreatePayoutPageContent from "@/components/payouts/CreatePayoutPageContent";

export const dynamic = "force-dynamic";

export default function CreatePayoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading payout form...</div>}>
      <CreatePayoutPageContent />
    </Suspense>
  );
}


