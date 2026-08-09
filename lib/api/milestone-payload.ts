import { isNonEmptyString } from "@/lib/api/release-payload";

export function hasReviewerContext(reviewerUserId: unknown) {
  return isNonEmptyString(reviewerUserId);
}

export function hasContributorSubmissionPayload(input: {
  contributorUserId: unknown;
  summary: unknown;
}) {
  return isNonEmptyString(input.contributorUserId) && isNonEmptyString(input.summary);
}
