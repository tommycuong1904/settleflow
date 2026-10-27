export function getPostSignInDestination(
  requestedDestination: string | null | undefined,
  needsPaymentAccountSetup: boolean,
) {
  const destination = requestedDestination?.startsWith("/") && !requestedDestination.startsWith("//")
    ? requestedDestination
    : "/dashboard";
  const isInvitationAcceptance = destination === "/accept-invite" || destination.startsWith("/accept-invite?");

  if (!needsPaymentAccountSetup || isInvitationAcceptance) return destination;
  return `/settings?onboarding=1&next=${encodeURIComponent(destination)}`;
}
