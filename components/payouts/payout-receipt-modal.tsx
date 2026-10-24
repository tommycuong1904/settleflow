"use client";

import React from "react";
import { useScrollLock } from "@/lib/hooks/use-scroll-lock";
import { Button } from "@/components/shared/button";
import type { Payout } from "@/lib/models/payout";
import type { Milestone } from "@/lib/models/milestone";
import type { Contributor } from "@/lib/models/contributor";
import type { TransactionProof } from "@/lib/models/transaction-proof";
import type { PaymentAttempt } from "@/lib/models/payment-attempt";
import { formatUsdc } from "@/lib/utils/format";
import {
  X,
  Printer,
  Download,
  FileCheck,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

type PayoutReceiptModalProps = {
  isOpen: boolean;
  onClose: () => void;
  payout: Payout;
  contributor?: Contributor;
  milestones: Milestone[];
  releaseProof?: TransactionProof;
  paymentAttempts: PaymentAttempt[];
};

export function PayoutReceiptModal({
  isOpen,
  onClose,
  payout,
  contributor,
  milestones,
  releaseProof,
  paymentAttempts,
}: PayoutReceiptModalProps) {
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const isSettlementReceipt = releaseProof?.status === "confirmed";
  const completedSimulatedPayments = paymentAttempts.filter(
    (payment) => payment.method === "simulated" && payment.status === "completed" && payment.evidenceType === "none",
  );
  const hasSimulatedPayment = completedSimulatedPayments.length > 0;
  const paymentMethodLabel = isSettlementReceipt
    ? "USDC on Arc Testnet"
    : hasSimulatedPayment
      ? "Simulated payment (test)"
      : "Not selected";
  const releasedMilestones = milestones.filter((m) => m.status === "released");
  const totalAmount = Number(payout.totalAmount);
  const totalSettled = releasedMilestones.reduce(
    (sum, m) => sum + Number(m.amount),
    0,
  );
  const remainingAmount = totalAmount - totalSettled;
  const payoutStatusLabel = payout.status === "draft"
    ? "Draft"
    : payout.status === "completed"
      ? "Complete"
      : "In progress";
  const milestoneStatusLabel = (status: Milestone["status"]) => {
    if (status === "released") return "Paid";
    if (status === "pending") return "Not started";
    if (status === "submitted") return "In review";
    if (status === "approved") return "Ready to pay";
    return "Changes requested";
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const reportData = {
      payoutId: payout.id,
      title: payout.title,
      description: payout.description,
      status: payout.status,
      paymentMethod: paymentMethodLabel,
      recipient: {
        name: contributor?.name ?? "Contributor",
        walletAddress: contributor?.walletAddress ?? "",
      },
      financialSummary: {
        totalAmountUsdc: totalAmount,
        totalSettledUsdc: totalSettled,
        remainingUsdc: remainingAmount,
        currency: "USDC",
      },
      milestones: milestones.map((m, idx) => ({
        id: m.id,
        sequence: idx + 1,
        title: m.title,
        description: m.description,
        amountUsdc: Number(m.amount),
        status: m.status,
        submittedAt: m.submittedAt,
        approvedAt: m.approvedAt,
        releasedAt: m.releasedAt,
      })),
      latestProof: releaseProof
        ? {
            id: releaseProof.id,
            status: releaseProof.status,
            txHash: releaseProof.txHash,
            explorerUrl:
              releaseProof.explorerUrl ||
              (releaseProof.txHash
                ? `https://testnet.arcscan.app/tx/${releaseProof.txHash}`
                : undefined),
            confirmedAt: releaseProof.confirmedAt,
          }
        : null,
      payments: paymentAttempts.map((payment) => ({
        milestoneId: payment.milestoneId,
        method: payment.method,
        status: payment.status,
        evidenceType: payment.evidenceType,
        amountUsdc: payment.amount,
        completedAt: payment.completedAt,
      })),
      generatedAt: new Date().toISOString(),
    };

    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `settleflow_receipt_${payout.id.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl text-[var(--foreground)] print:border-none print:shadow-none print:bg-white print:text-black"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors print:hidden"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="border-b border-[var(--border-soft)] pb-6 print:border-slate-300">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-muted)] border border-[var(--border-soft)] text-[var(--foreground)] print:border-slate-800 print:text-slate-900">
                <FileCheck size={20} />
              </div>
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] font-semibold print:text-slate-700">
                  Payment summary
                </span>
                <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)] print:text-black">
                  {payout.title}
                </h2>
              </div>
            </div>

            <div className="text-right text-xs text-slate-400 font-mono print:text-slate-600">
              <p>Receipt: {payout.id.slice(0, 12)}</p>
              <p>Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-[var(--border-soft)] text-xs print:border-slate-300">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
              Contributor
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--foreground)] print:text-black">
              {contributor?.name ?? "Designated Contributor"}
            </p>
            <p className="mt-0.5 font-mono text-[var(--text-primary)] print:text-slate-700 break-all">
              {isSettlementReceipt && contributor?.walletAddress ? (
                <span>Address: {contributor.walletAddress}</span>
              ) : (
                hasSimulatedPayment ? "Payment recorded for testing" : "Payment details not recorded"
              )}
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
              Payment method
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--foreground)] print:text-black">
              {paymentMethodLabel}
            </p>
            <p className="mt-0.5 text-[var(--text-primary)] print:text-slate-700">
              Status:{" "}
              <strong className="capitalize text-[var(--foreground)] print:text-black">
                {payoutStatusLabel}
              </strong>
            </p>
          </div>
        </div>

        <div className="py-5 border-b border-[var(--border-soft)] print:border-slate-300 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] print:text-slate-800">
            Milestones
          </p>

          <div className="space-y-2.5">
            {milestones.map((m, idx) => {
              const isReleased = m.status === "released";
              const isApproved = m.status === "approved";

              return (
                <div
                  key={m.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-soft)] print:bg-slate-100 print:border-slate-200"
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-[var(--text-muted)]">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-[var(--foreground)] print:text-black">
                        {m.title}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                          isReleased
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : isApproved
                            ? "bg-[var(--surface-strong)] text-[var(--foreground)] border border-[var(--border-soft)]"
                            : "bg-[var(--surface-strong)] text-[var(--text-muted)] border border-[var(--border-soft)]"
                        }`}
                      >
                        {milestoneStatusLabel(m.status)}
                      </span>
                    </div>
                    {m.description && (
                      <p className="text-[11px] text-[var(--text-muted)] truncate max-w-md print:text-slate-600">
                        {m.description}
                      </p>
                    )}
                  </div>

                  <div className="text-left sm:text-right font-mono text-xs font-semibold text-[var(--foreground)] print:text-black shrink-0">
                    {formatUsdc(Number(m.amount))} USDC
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="py-5 border-b border-[var(--border-soft)] print:border-slate-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                Paid amount
              </p>
              <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 print:text-emerald-700 font-mono">
                {formatUsdc(totalSettled)} USDC
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {releasedMilestones.length} of {milestones.length} milestones paid
              </p>
            </div>

            <div className="sm:text-right space-y-1">
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                Total payout
              </p>
              <p className="text-2xl font-bold tracking-tight text-[var(--foreground)] print:text-black font-mono">
                {formatUsdc(totalAmount)} USDC
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Remaining: {formatUsdc(remainingAmount)} USDC
              </p>
            </div>
          </div>
        </div>

        {releaseProof?.txHash && (
          <details className="pt-4 pb-2 print:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
              <ShieldCheck size={15} />
              Technical transaction details
            </summary>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-2.5 text-xs font-mono text-[var(--text-primary)]">
              <span className="truncate">Tx: {releaseProof.txHash}</span>
              <a
                href={`https://testnet.arcscan.app/tx/${releaseProof.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1 text-[var(--foreground)] hover:underline"
              >
                Arcscan <ExternalLink size={12} />
              </a>
            </div>
          </details>
        )}

        {/* Action CTAs */}
        <div className="mt-6 pt-4 border-t border-[var(--border-soft)] flex items-center justify-end gap-3 print:hidden">
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)] [&::-webkit-details-marker]:hidden">
              More options
            </summary>
            <div className="absolute bottom-full right-0 z-10 mb-2 w-44 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-1 shadow-lg">
              <button type="button" onClick={handleDownloadJson} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[var(--foreground)] hover:bg-[var(--surface-muted)]">
                <Download size={14} /> Download JSON data
              </button>
            </div>
          </details>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handlePrint}
            icon={<Printer size={14} />}
          >
            Print / Save PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
