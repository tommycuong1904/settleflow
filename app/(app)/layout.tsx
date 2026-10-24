import { Suspense } from "react";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/app-header";
import { Footer } from "@/components/shared/footer";
import { WorkflowStateSync } from "@/components/shared/workflow-state-sync";
import { resolveProductContextForServerPage } from "@/lib/auth/session-server";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const context = await resolveProductContextForServerPage(cookieStore);
  const initialActor = context.kind === "authenticated" ? context.productContext.actor : undefined;
  const initialWorkspaceId = context.kind === "authenticated" ? context.productContext.workspaceId : undefined;
  const workspace = initialWorkspaceId
    ? await db.workspace.findUnique({ where: { id: initialWorkspaceId }, select: { name: true } })
    : null;

  return (
    <div className="sf-app-shell">
      <Suspense fallback={null}>
        <AppSidebar
          initialActor={initialActor}
          initialWorkspaceId={initialWorkspaceId}
          initialWorkspaceName={workspace?.name}
        />
      </Suspense>
      <div className="sf-app-content">
        <Suspense fallback={null}>
          <AppHeader hasWorkspace={Boolean(initialWorkspaceId)} />
        </Suspense>
        <WorkflowStateSync />
        <main className="sf-app-main">
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}
