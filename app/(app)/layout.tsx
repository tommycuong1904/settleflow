import { Suspense } from "react";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/app-header";
import { Footer } from "@/components/shared/footer";
import { SiteHeader } from "@/components/shared/site-header";

export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <div className="bg-[var(--background)] min-h-screen py-10 px-4 flex justify-center">
        <div className="w-full max-w-[1180px] min-h-[700px] bg-[var(--surface)] border border-[var(--border-strong)] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.08)] flex overflow-hidden">
          <Suspense fallback={null}>
            <AppSidebar />
          </Suspense>
          <div className="flex-1 flex flex-col min-w-0 bg-[var(--background)]">
            <Suspense fallback={null}>
              <AppHeader />
            </Suspense>
            <main className="flex-1 p-6 overflow-y-auto">
              <Suspense fallback={null}>
                {children}
              </Suspense>
            </main>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

