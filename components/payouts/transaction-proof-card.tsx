import type { TransactionProof } from "@/lib/models/transaction-proof";
import { shortenAddress } from "@/lib/utils/format";

type TransactionProofCardProps = {
  proof?: TransactionProof;
  milestoneTitle?: string;
  paymentAccount?: boolean;
};

const statusStyles: Record<TransactionProof["status"], string> = {
  pending:
    "border border-amber-400/30 bg-amber-400/10 text-amber-800 dark:text-amber-200",
  confirmed:
    "border border-emerald-300/25 bg-emerald-400/10 text-emerald-800 dark:text-emerald-100",
  failed:
    "border border-rose-300/25 bg-rose-400/10 text-rose-800 dark:text-rose-100",
};

const statusTitles: Record<Exclude<TransactionProof["status"], "pending">, string> = {
  confirmed: "Payment confirmed",
  failed: "Payment needs attention",
};

const statusDescriptions: Record<Exclude<TransactionProof["status"], "pending">, string> = {
  confirmed:
    "This payment has been confirmed and recorded for this milestone.",
  failed:
    "Review the payment issue before starting another attempt.",
};

function formatFailureReason(reason: string) {
  if (reason.startsWith("BROWSER_WALLET_PRE_BROADCAST:")) {
    return "No payment was sent. Check that your wallet is connected to Arc Testnet, then you can safely try again.";
  }

  return "This payment attempt was not completed. Review the next steps before starting another attempt.";
}

export function TransactionProofCard({ proof, milestoneTitle, paymentAccount = false }: TransactionProofCardProps) {
  if (!proof) {
    return (
      <div className="space-y-4 text-sm text-[var(--text-primary)]">
        <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface)]/46 p-4">
          <p className="font-semibold text-[var(--foreground)]">No payment details yet</p>
          <p className="mt-1">
            Payment details appear after a wallet payment is submitted.
          </p>
        </div>
      </div>
    );
  }

  const pendingWithTransaction = proof.status === "pending" && Boolean(proof.txHash);
  const statusTitle = proof.status === "pending"
    ? pendingWithTransaction ? "Payment sent — verification needed" : "Payment needs review"
    : statusTitles[proof.status];
  const statusDescription = proof.status === "pending"
    ? pendingWithTransaction
      ? paymentAccount
        ? "SettleFlow is verifying this payment. Do not retry while confirmation is in progress."
        : "Your wallet returned a transaction hash, but SettleFlow has not confirmed that transaction against this payout yet. Do not sign or retry again."
      : paymentAccount
        ? "SettleFlow is checking this payment. Do not retry while confirmation is in progress."
        : "SettleFlow has not received a transaction hash yet. Check your wallet activity before deciding whether a payment was sent."
    : statusDescriptions[proof.status];

  return (
    <div className="space-y-4 text-sm text-[var(--text-primary)]">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/56 p-4">
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Payment status
          </p>
          <p className="text-base font-semibold text-[var(--foreground)]">{statusTitle}</p>
          <p>{statusDescription}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusStyles[proof.status]}`}
        >
          {proof.status === "pending"
            ? "Pending confirmation"
            : proof.status === "confirmed"
              ? "Paid"
              : "Needs attention"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/60 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Milestone
          </p>
          <p className="mt-2 font-semibold text-[var(--foreground)]">{milestoneTitle ?? proof.milestoneId}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]/60 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {proof.status === "failed" ? "Last updated" : "Confirmed at"}
          </p>
          <p className="mt-2 font-semibold text-[var(--foreground)]">
            {proof.confirmedAt
              ? new Date(proof.confirmedAt).toLocaleString()
              : proof.failedAt
                ? new Date(proof.failedAt).toLocaleString()
              : proof.status === "failed"
                ? "Not available"
                : "Awaiting confirmation"}
          </p>
        </div>
      </div>

      {proof.failureReason ? (
        <div className="rounded-3xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-800 dark:text-rose-50">
          <p className="text-xs uppercase tracking-[0.18em] text-rose-800/80 dark:text-rose-200/80">
            What happened
          </p>
          <p className="mt-2 leading-6">{formatFailureReason(proof.failureReason)}</p>
          <details className="mt-3 border-t border-rose-300/20 pt-3 text-xs">
            <summary className="cursor-pointer font-medium">Show technical details</summary>
            <p className="mt-2 break-all font-mono">{proof.failureReason}</p>
          </details>
        </div>
      ) : null}

      <details className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
        <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)]">Technical details</summary>
        <div className="mt-4 space-y-4 text-sm text-[var(--text-muted)]">
          <p>Network: <span className="font-medium text-[var(--foreground)]">{proof.network}</span></p>
          <p>Block number: <span className="font-medium text-[var(--foreground)]">{proof.blockNumber ?? "Pending / unavailable"}</span></p>
          <div>
            <p className="text-xs uppercase tracking-[0.18em]">Transaction hash</p>
            <p className="mt-1 text-xs">
              {proof.txHash
                ? `Short view: ${shortenAddress(proof.txHash)}`
                : "No transaction hash is available yet."}
            </p>
            <p className="mt-3 break-all rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 font-mono text-xs leading-6 text-[var(--text-primary)]">
              {proof.txHash || "Pending / unavailable"}
            </p>
          </div>
          {proof.explorerUrl ? (
            <a
              href={proof.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-sm font-semibold text-[var(--foreground)] underline underline-offset-4"
            >
              View transaction
            </a>
          ) : null}
        </div>
      </details>
    </div>
  );
}
