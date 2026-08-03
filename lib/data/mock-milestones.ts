import type { Milestone } from "@/lib/models/milestone";

export const mockMilestones: Milestone[] = [
  {
    id: "milestone-4",
    payoutId: "payout-detail",
    title: "QA checklist and threat review",
    description: "Review contract logic and produce issue checklist.",
    amount: 200,
    status: "approved",
    submittedAt: "2026-07-21T11:00:00Z",
    approvedAt: "2026-07-21T13:30:00Z",
  },
  {
    id: "milestone-5",
    payoutId: "payout-detail",
    title: "Retest patched contract build",
    description: "Validate resolved issues and produce final QA note.",
    amount: 250,
    status: "pending",
  },
  {
    id: "milestone-6",
    payoutId: "payout-3",
    title: "Thread outline",
    description: "Prepare content structure for launch thread.",
    amount: 100,
    status: "released",
    submittedAt: "2026-07-18T10:00:00Z",
    approvedAt: "2026-07-18T11:00:00Z",
    releasedAt: "2026-07-18T11:10:00Z",
  },
];