import type { TransactionProof } from "@/lib/models/transaction-proof";
import { shortenAddress } from "@/lib/utils/format";

type TransactionProofCardProps = {
  proof?: TransactionProof;
  milestoneTitle?: string;
};

const statusStyles: Record<TransactionProof["status"], string> = {
  pending:
    "border border-amber-300/25 bg-amber-400/10 text-amber-100",
  confirmed:
    "border border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
  failed:
    "border border-rose-300/25 bg-rose-400/10 text-rose-100",
};

const statusTitles: Record<TransactionProof["status"], string> = {
  pending: "Settlement submitted",
  confirmed: "Settlement confirmed",
  failed: "Settlement failed",
};

const statusDescriptions: Record<TransactionProof["status"], string> = {
  pending:
    "The Arc release path has been created and is waiting for final settlement confirmation.",
  confirmed:
    "The Arc settlement proof is confirmed and attached to this payout release.",
  failed:
    "The release attempt returned an error and needs a retry or proof refresh before settlement can continue.",
};

export function TransactionProofCard({ proof, milestoneTitle }: TransactionProofCardProps) {
  if (!proof) {
    return (
      <div className="space-y-4 text-sm text-[var(--text-primary)]">
        <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[rgba(15,23,42,0.46)] p-4">
          <p className="font-semibold text-white">No settlement proof yet</p>
          <p className="mt-1">
            Proof appears here after the payout is released on-chain.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm text-[var(--text-primary)]">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.56)] p-4">
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Settlement status
          </p>
          <p className="text-base font-semibold text-white">{statusTitles[proof.status]}</p>
          <p>{statusDescriptions[proof.status]}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusStyles[proof.status]}`}
        >
          {proof.status}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.6)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Network
          </p>
          <p className="mt-2 font-semibold text-white">{proof.network}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.6)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Milestone proof
          </p>
          <p className="mt-2 font-semibold text-white">{milestoneTitle ?? proof.milestoneId}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.6)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Confirmed at
          </p>
          <p className="mt-2 font-semibold text-white">
            {proof.confirmedAt
              ? new Date(proof.confirmedAt).toLocaleString()
              : proof.status === "failed"
                ? "Not confirmed"
                : "Awaiting confirmation"}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.6)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Failed at
          </p>
          <p className="mt-2 font-semibold text-white">
            {proof.failedAt
              ? new Date(proof.failedAt).toLocaleString()
              : proof.status === "failed"
                ? "Failure time unavailable"
                : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.6)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Block number
          </p>
          <p className="mt-2 font-semibold text-white">{proof.blockNumber ?? "Pending / unavailable"}</p>
        </div>
      </div>

      {proof.failureReason ? (
        <div className="rounded-3xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-50">
          <p className="text-xs uppercase tracking-[0.18em] text-rose-200/80">
            Failure reason
          </p>
          <p className="mt-2 leading-6">{proof.failureReason}</p>
        </div>
      ) : null}

      <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(8,15,31,0.82)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Transaction hash
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {proof.txHash
                ? `Short view: ${shortenAddress(proof.txHash)}`
                : proof.status === "failed"
                  ? "No confirmed transaction hash is available for this failed settlement attempt."
                  : proof.status === "pending"
                    ? "Transaction hash will appear after settlement proof is confirmed."
                    : "Confirmed settlement hash unavailable."}
            </p>
          </div>
          {proof.explorerUrl ? (
            <a
              href={proof.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15 hover:text-cyan-50"
            >
              View on Arc explorer
            </a>
          ) : null}
        </div>
        <p className="mt-4 break-all rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.68)] px-4 py-3 font-mono text-xs leading-6 text-cyan-100">
          {proof.txHash || "Pending / unavailable"}
        </p>
      </div>
    </div>
  );
}
