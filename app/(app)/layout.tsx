import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/app-header";
import { Footer } from "@/components/shared/footer";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="sf-app-shell">
      <AppSidebar />
      <div className="sf-app-content">
        <AppHeader />
        <main className="sf-app-main">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
