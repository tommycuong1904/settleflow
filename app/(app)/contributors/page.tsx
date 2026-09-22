import { cookies } from "next/headers";
import { PageHeader } from "@/components/shared/page-header";
import { WalletGate } from "@/components/dashboard/wallet-gate";
import { ContributorListClient } from "@/components/contributors/contributor-list-client";
import { listContributors } from "@/lib/repositories/contributors";
import {
  getSessionFromCookieStore,
  resolveProductContextForServerPage,
  resolveSessionMemberships,
} from "@/lib/auth/session-server";
import { ServerAuthContextState } from "@/components/shared/server-auth-context-state";
import { redirect } from "next/navigation";

type ContributorsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContributorsPage({ searchParams }: ContributorsPageProps) {
  const cookieStore = await cookies();
  const session = await getSessionFromCookieStore(cookieStore);
  if (!session) redirect("/auth-required?next=/contributors");
  const membershipResult = await resolveSessionMemberships(session);
  if (!membershipResult) return <ServerAuthContextState kind="auth-context-required" />;

  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedWorkspaceId = Array.isArray(resolvedSearchParams.workspaceId)
    ? resolvedSearchParams.workspaceId[0]
    : resolvedSearchParams.workspaceId;
  const ownerMemberships = membershipResult.memberships.filter((membership) => membership.role === "owner");
  const ownerWorkspaceId = ownerMemberships.find((membership) => membership.workspaceId === requestedWorkspaceId)?.workspaceId
    ?? ownerMemberships[0]?.workspaceId;
  if (!ownerWorkspaceId) return <ServerAuthContextState kind="authenticated-forbidden" />;
  if (requestedWorkspaceId !== ownerWorkspaceId) {
    redirect(`/contributors?workspaceId=${encodeURIComponent(ownerWorkspaceId)}`);
  }

  const contextResult = await resolveProductContextForServerPage(cookieStore, { workspaceId: ownerWorkspaceId });
  if (contextResult.kind === "auth-required") redirect("/auth-required?next=/contributors");
  if (contextResult.kind !== "authenticated") return <ServerAuthContextState kind={contextResult.kind} />;
  const productContext = contextResult.productContext;
  const workspaceId = productContext.workspaceId;

  const contributors = await listContributors({
    workspaceId,
  });

  return (
    <div className="sf-app-wrapper flex flex-col py-8 md:py-12 gap-8">
      <PageHeader
        eyebrow="People"
        title="Contributors"
        description="Manage the people who receive milestone payouts from this workspace."
      />

      <WalletGate />

      <div className="flex-1">
        <ContributorListClient
          initialContributors={contributors}
          workspaceId={workspaceId}
          currentActor={productContext.actor}
          activeUserId={productContext.activeUserId}
        />
      </div>
    </div>
  );
}
