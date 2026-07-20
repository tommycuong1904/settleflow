export type MilestoneStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "released"
  | "rejected";

export type Milestone = {
  id: string;
  payoutId: string;
  title: string;
  description: string;
  amount: number;
  status: MilestoneStatus;
  submittedAt?: string;
  approvedAt?: string;
  releasedAt?: string;
};
