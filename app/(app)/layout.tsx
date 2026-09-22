import { Suspense } from "react";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/app-header";
import { Footer } from "@/components/shared/footer";
import { getSessionFromCookieStore, resolveProductContextForServerPage, resolveSessionMemberships } from "@/lib/auth/session-server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const context = await resolveProductContextForServerPage(cookieStore);
  const initialActor = context.kind === "authenticated" ? context.productContext.actor : undefined;
  const session = await getSessionFromCookieStore(cookieStore);
  const memberships = session ? await resolveSessionMemberships(session) : null;
  const initialRoles = memberships?.memberships.map((membership) => membership.role as "owner" | "ops" | "reviewer" | "contributor");

  return (
    <div className="sf-app-shell">
      <Suspense fallback={null}>
        <AppSidebar initialActor={initialActor} initialRoles={initialRoles} />
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
