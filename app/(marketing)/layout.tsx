import { SiteHeader } from "@/components/shared/site-header";
import { Footer } from "@/components/shared/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <Footer />
    </>
  );
}
