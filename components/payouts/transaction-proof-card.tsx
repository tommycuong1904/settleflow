import type { TransactionProof } from "@/lib/models/transaction-proof";
import { shortenAddress } from "@/lib/utils/format";

type TransactionProofCardProps = {
  proof?: TransactionProof;
};

export function TransactionProofCard({ proof }: TransactionProofCardProps) {
  if (!proof) {
    return (
      <div className="space-y-3 text-sm text-[var(--text-primary)]">
        <p className="font-semibold text-white">Settlement proof pending</p>
        <p>No onchain payout proof is available until a milestone is released.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm text-[var(--text-primary)]">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.6)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Transaction status
          </p>
          <p className="mt-2 font-semibold capitalize text-white">{proof.status}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.6)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Network
          </p>
          <p className="mt-2 font-semibold text-white">{proof.network}</p>
        </div>
      </div>
      <div className="rounded-3xl border border-[var(--border-soft)] bg-[rgba(8,15,31,0.82)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Tx hash</p>
          <a
            href={proof.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-sm font-semibold text-cyan-200 hover:text-cyan-100"
          >
            View on Arc explorer
          </a>
        </div>
        <p className="mt-3 break-all font-mono text-xs leading-6 text-cyan-100">
          {proof.txHash}
        </p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Short view: {shortenAddress(proof.txHash)}
        </p>
      </div>
    </div>
  );
}
