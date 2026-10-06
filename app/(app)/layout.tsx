import { Suspense } from "react";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/app-header";
import { Footer } from "@/components/shared/footer";
import { WorkflowStateSync } from "@/components/shared/workflow-state-sync";
import { resolveProductContextForServerPage } from "@/lib/auth/session-server";

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

  return (
    <div className="sf-app-shell">
      <Suspense fallback={null}>
        <AppSidebar initialActor={initialActor} initialWorkspaceId={initialWorkspaceId} />
      </Suspense>
      <div className="sf-app-content">
        <Suspense fallback={null}>
          <AppHeader />
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
