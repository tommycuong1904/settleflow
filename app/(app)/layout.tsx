import { Suspense } from "react";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/app-header";
import { Footer } from "@/components/shared/footer";

export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="sf-app-shell">
      <Suspense fallback={null}>
        <AppSidebar />
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

