"use client";

import React from "react";
import type { Payout } from "@/lib/models/payout";
import type { Milestone } from "@/lib/models/milestone";
import type { Contributor } from "@/lib/models/contributor";
import type { TransactionProof } from "@/lib/models/transaction-proof";
import { formatUsdc, shortenAddress } from "@/lib/utils/format";
import {
  X,
  Printer,
  Download,
  FileCheck,
  ShieldCheck,
  ExternalLink,
  Layers,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

type PayoutReceiptModalProps = {
  isOpen: boolean;
  onClose: () => void;
  payout: Payout;
  contributor?: Contributor;
  milestones: Milestone[];
  releaseProof?: TransactionProof;
};

export function PayoutReceiptModal({
  isOpen,
  onClose,
  payout,
  contributor,
  milestones,
  releaseProof,
}: PayoutReceiptModalProps) {
  if (!isOpen) return null;

  const releasedMilestones = milestones.filter((m) => m.status === "released");
  const totalAmount = Number(payout.totalAmount);
  const totalSettled = releasedMilestones.reduce(
    (sum, m) => sum + Number(m.amount),
    0,
  );
  const remainingAmount = totalAmount - totalSettled;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const reportData = {
      payoutId: payout.id,
      title: payout.title,
      description: payout.description,
      status: payout.status,
      network: "Arc Testnet",
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
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-cyan-500/20 bg-[#0c1322] p-6 sm:p-8 shadow-[0_0_60px_rgba(34,211,238,0.15)] text-white print:border-none print:shadow-none print:bg-white print:text-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl print:hidden" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl print:hidden" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors print:hidden"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Receipt Document Header */}
        <div className="border-b border-slate-800 pb-6 print:border-slate-300">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)] print:border-slate-800 print:text-slate-900">
                <FileCheck size={20} />
              </div>
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-semibold print:text-cyan-800">
                  Official Settlement Receipt
                </span>
                <h2 className="text-xl font-bold tracking-tight text-white print:text-black">
                  {payout.title}
                </h2>
              </div>
            </div>

            <div className="text-right text-xs text-slate-400 font-mono print:text-slate-600">
              <p>ID: {payout.id.slice(0, 12)}</p>
              <p>Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Recipient & Rail Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-slate-800 text-xs print:border-slate-300">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              Recipient Contributor
            </p>
            <p className="mt-1 text-sm font-semibold text-white print:text-black">
              {contributor?.name ?? "Designated Contributor"}
            </p>
            <p className="mt-0.5 font-mono text-slate-300 print:text-slate-700">
              {contributor?.walletAddress ? (
                <span>Address: {contributor.walletAddress}</span>
              ) : (
                "No wallet address"
              )}
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              Settlement Protocol
            </p>
            <p className="mt-1 text-sm font-semibold text-cyan-300 print:text-cyan-700">
              Arc Testnet (Circle USDC)
            </p>
            <p className="mt-0.5 text-slate-300 print:text-slate-700">
              Status:{" "}
              <strong className="capitalize text-white print:text-black">
                {payout.status.replace("_", " ")}
              </strong>
            </p>
          </div>
        </div>

        {/* Milestone Breakdown Table */}
        <div className="py-5 border-b border-slate-800 print:border-slate-300 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-300 print:text-slate-800">
            Milestone Settlement Breakdown
          </p>

          <div className="space-y-2.5">
            {milestones.map((m, idx) => {
              const isReleased = m.status === "released";
              const isApproved = m.status === "approved";

              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 print:bg-slate-100 print:border-slate-200"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-white print:text-black">
                        {m.title}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                          isReleased
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : isApproved
                            ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    {m.description && (
                      <p className="text-[11px] text-slate-400 truncate max-w-md print:text-slate-600">
                        {m.description}
                      </p>
                    )}
                  </div>

                  <div className="text-right font-mono text-xs font-semibold text-white print:text-black">
                    {formatUsdc(Number(m.amount))} USDC
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="py-5 border-b border-slate-800 print:border-slate-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Settled Amount
              </p>
              <p className="text-2xl font-bold tracking-tight text-emerald-400 print:text-emerald-700 font-mono">
                {formatUsdc(totalSettled)} USDC
              </p>
              <p className="text-[11px] text-slate-400">
                {releasedMilestones.length} of {milestones.length} milestones disbursed
              </p>
            </div>

            <div className="sm:text-right space-y-1">
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Total Agreement Value
              </p>
              <p className="text-2xl font-bold tracking-tight text-white print:text-black font-mono">
                {formatUsdc(totalAmount)} USDC
              </p>
              <p className="text-[11px] text-slate-400">
                Remaining: {formatUsdc(remainingAmount)} USDC
              </p>
            </div>
          </div>
        </div>

        {/* Latest Onchain Proof Verification */}
        {releaseProof?.txHash && (
          <div className="pt-4 pb-2 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-cyan-300 print:text-cyan-800">
              <ShieldCheck size={15} />
              <span className="font-semibold uppercase tracking-wider">
                Cryptographic Settlement Proof
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs font-mono text-slate-300 print:bg-slate-100 print:border-slate-300 print:text-black">
              <span className="truncate">Tx: {releaseProof.txHash}</span>
              <a
                href={`https://testnet.arcscan.app/tx/${releaseProof.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1 shrink-0 print:hidden"
              >
                Arcscan <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}

        {/* Action CTAs */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end gap-3 print:hidden">
          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-all shadow-sm"
          >
            <Download size={14} /> Download JSON
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 px-5 py-2 text-xs font-semibold text-slate-950 transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)]"
          >
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
