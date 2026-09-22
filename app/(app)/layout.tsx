import { Suspense } from "react";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/app-header";
import { Footer } from "@/components/shared/footer";
import { resolveProductContextForServerPage } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await resolveProductContextForServerPage(await cookies());
  const initialActor = context.kind === "authenticated" ? context.productContext.actor : undefined;

  return (
    <div className="sf-app-shell">
      <Suspense fallback={null}>
        <AppSidebar initialActor={initialActor} />
      </Suspense>
      <div className="sf-app-content">
        <Suspense fallback={null}>
          <AppHeader />
        </Suspense>
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
