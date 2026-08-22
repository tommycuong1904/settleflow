import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

import { WalletProvider } from "@/lib/context/wallet-context";
import { ToastProvider } from "@/lib/context/toast-context";
import { ThemeProvider } from "@/lib/context/theme-context";
import { AuthModal } from "@/components/shared/auth-modal";
import { ToastContainer } from "@/components/shared/toast-container";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-[var(--foreground)]">
        <ThemeProvider>
          <ToastProvider>
            <WalletProvider>
              {children}
              <AuthModal />
              <ToastContainer />
            </WalletProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
