"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { connectBrowserWallet } from "@/lib/arc/browser-wallet";
import Head from "next/head";

export default function LandingPage() {
  const router = useRouter();

  const handleLaunch = async () => {
    try {
      // Attempt to connect wallet if not already connected
      await connectBrowserWallet();
    } catch (e) {
      console.error("Wallet connection failed", e);
      // Continue to navigation even if wallet connection fails (optional)
    }
    router.push("/app");
  };

  return (
    <>
      <Head>
        <title>Settleflow – Decentralized Settlement</title>
        <meta
          name="description"
          content="Settleflow helps crypto teams create payout agreements, review work, and keep settlement proof attached after funds move on Arc."
        />
        <meta property="og:title" content="Settleflow – Decentralized Settlement" />
        <meta
          property="og:description"
          content="Create milestone‑based payouts with on‑chain proof using Settleflow."
        />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-6">
        <section className="max-w-3xl text-center space-y-6">
          <h1 className="text-5xl font-bold text-white">Welcome to Settleflow</h1>
          <p className="text-lg text-gray-300">
            A premium platform for milestone‑based payouts, on‑chain proof, and seamless
            crypto team collaboration.
          </p>
          <Button onClick={handleLaunch} variant="primary">
            Launch App
          </Button>
        </section>
      </main>
    </>
  );
}
