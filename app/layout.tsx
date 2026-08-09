import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { ActorSwitcher } from "@/components/shared/actor-switcher";
import { Footer } from "@/components/shared/footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SettleFlow",
  description: "Arc-native USDC payout workflow for crypto teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-slate-100">
        <div className="min-h-screen">
          <header className="border-b border-[var(--border-soft)] bg-slate-950/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center justify-between gap-6">
                <Link href="/" className="text-lg font-semibold tracking-tight text-white">
                  <span className="text-white">Settle</span>
                  <span className="text-cyan-300">Flow</span>
                </Link>
                <nav className="hidden items-center gap-6 text-sm text-[var(--text-primary)] md:flex">
                  <Link href="/dashboard" className="transition-colors hover:text-cyan-200">
                    Dashboard
                  </Link>
                  <Link href="/payouts/new" className="transition-colors hover:text-cyan-200">
                    New Payout
                  </Link>
                </nav>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between lg:justify-end">
                <nav className="flex items-center gap-6 text-sm text-[var(--text-primary)] md:hidden">
                  <Link href="/dashboard" className="transition-colors hover:text-cyan-200">
                    Dashboard
                  </Link>
                  <Link href="/payouts/new" className="transition-colors hover:text-cyan-200">
                    New Payout
                  </Link>
                </nav>
                <Suspense fallback={<div className="h-14 min-w-[220px] rounded-2xl border border-[var(--border-soft)] bg-[rgba(8,15,31,0.68)]" />}>
                  <ActorSwitcher />
                </Suspense>
              </div>
            </div>
          </header>
          <main className="mx-auto flex max-w-6xl flex-col px-6 py-10 md:py-12">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
