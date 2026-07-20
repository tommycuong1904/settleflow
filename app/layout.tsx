import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
      <body className="min-h-full bg-slate-950 text-slate-100">
        <div className="min-h-screen">
          <header className="border-b border-slate-800 bg-slate-950/95">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                SettleFlow
              </Link>
              <nav className="flex items-center gap-6 text-sm text-slate-300">
                <Link href="/dashboard" className="hover:text-cyan-300">
                  Dashboard
                </Link>
                <Link href="/payouts/new" className="hover:text-cyan-300">
                  New Payout
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto flex max-w-6xl flex-col px-6 py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
