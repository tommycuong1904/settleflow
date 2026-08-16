// app/app/page.tsx
"use client";

import Head from "next/head";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MainApp() {
  return (
    <>
      <Head>
        <title>Settleflow – Dashboard</title>
        <meta name="description" content="Dashboard of Settleflow dApp where contributors manage payouts and reviewers approve milestones." />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-start bg-gradient-to-b from-slate-900 to-slate-800 p-8 text-white">
        <section className="w-full max-w-4xl">
          <h1 className="mb-6 text-5xl font-extrabold text-center">Settleflow Dashboard</h1>
          <p className="mb-8 text-center text-lg">Manage payouts, review milestones, and attach settlement proofs all in one place.</p>

          {/* Placeholder sections for future functionality */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="rounded-lg bg-slate-700 p-6 shadow-lg">
              <h2 className="mb-3 text-2xl font-semibold">Create Payout</h2>
              <p className="mb-4 text-sm">Initiate a new payout for contributors. (Coming soon)</p>
              <Button disabled className="bg-cyan-600 hover:bg-cyan-700">Create</Button>
            </section>

            <section className="rounded-lg bg-slate-700 p-6 shadow-lg">
              <h2 className="mb-3 text-2xl font-semibold">Review Milestones</h2>
              <p className="mb-4 text-sm">Approve submitted milestones and attach proofs. (Coming soon)</p>
              <Button disabled className="bg-cyan-600 hover:bg-cyan-700">Review</Button>
            </section>
          </div>

          <div className="mt-12 text-center">
            <Link href="/" passHref>
              <Button className="bg-cyan-600 hover:bg-cyan-700">← Back to Landing</Button>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
