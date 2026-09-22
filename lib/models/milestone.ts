export type MilestoneStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "released"
  | "rejected";

export type MilestoneSubmissionSummary = {
  id: string;
  summary: string;
  artifactUrl?: string | null;
  artifactLabel?: string | null;
  notes?: string | null;
  submittedAt: string;
};
export type Milestone = {
  id: string;
  payoutId: string;
  title: string;
  description: string;
  amount: number;
  status: MilestoneStatus;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  releasedAt?: string;
  latestSubmission?: MilestoneSubmissionSummary;
};
