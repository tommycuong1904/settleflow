import { Button } from "@/components/shared/button";

type ReviewControlsProps = {
  submittedAt?: string;
};

export function ReviewControls({ submittedAt }: ReviewControlsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="font-semibold text-white">Awaiting reviewer approval</p>
        <p className="text-sm text-[var(--text-muted)]">
          Submitted {submittedAt ? submittedAt.slice(0, 10) : "recently"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary">Approve</Button>
        <Button variant="secondary">Reject</Button>
      </div>
    </div>
  );
}
