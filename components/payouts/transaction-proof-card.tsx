import type { TransactionProof } from "@/lib/models/transaction-proof";

type TransactionProofCardProps = {
  proof?: TransactionProof;
};

export function TransactionProofCard({ proof }: TransactionProofCardProps) {
  if (!proof) {
    return (
      <div className="space-y-3 text-sm text-slate-300">
        <p className="font-semibold text-white">Settlement proof pending</p>
        <p>No onchain payout proof is available until a milestone is released.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm text-slate-300">
      <div>
        <p className="text-slate-400">Transaction status</p>
        <p className="mt-1 font-semibold text-white capitalize">{proof.status}</p>
      </div>
      <div>
        <p className="text-slate-400">Network</p>
        <p className="mt-1 font-semibold text-white">{proof.network}</p>
      </div>
      <div>
        <p className="text-slate-400">Tx hash</p>
        <p className="mt-1 break-all font-mono text-xs text-cyan-200">
          {proof.txHash}
        </p>
      </div>
      <a
        href={proof.explorerUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
      >
        View on Arc explorer
      </a>
    </div>
  );
}
