import { Button } from "@/components/shared/button";
import { SectionCard } from "@/components/shared/section-card";

const valueCards = [
  {
    title: "Milestone payouts",
    description: "Split contributor compensation into clear payment steps.",
  },
  {
    title: "Approval-gated release",
    description: "Release funds only when work is approved.",
  },
  {
    title: "Arc-native settlement",
    description: "Track USDC payout release on Arc with clear settlement status.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-3xl border border-slate-800 bg-slate-950/80 px-8 py-14 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="max-w-3xl space-y-6">
          <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Build on Arc · DeFi Track
          </span>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Milestone-based USDC payouts for crypto teams on Arc
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              SettleFlow helps teams create contributor payouts, review submitted
              work, and release USDC only after approval.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/dashboard">View Dashboard</Button>
            <Button href="/payouts/new" variant="secondary">
              Create Payout
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {valueCards.map((card) => (
          <SectionCard key={card.title} title={card.title}>
            <p className="text-sm leading-7 text-slate-300">{card.description}</p>
          </SectionCard>
        ))}
      </section>

      <SectionCard title="Why SettleFlow">
        <p className="max-w-3xl text-sm leading-7 text-slate-300">
          Crypto teams still manage contributor payouts through chats,
          spreadsheets, and manual wallet transfers. SettleFlow turns that
          process into a programmable payout workflow on Arc.
        </p>
      </SectionCard>
    </div>
  );
}
