import { Button } from "@/components/shared/button";
import { SectionCard } from "@/components/shared/section-card";

const workflowCards = [
  {
    step: "01",
    title: "Define milestones",
    description:
      "Break contributor compensation into clear work checkpoints before any funds move.",
  },
  {
    step: "02",
    title: "Review submissions",
    description:
      "Keep each payout locked until submitted work is reviewed and approved.",
  },
  {
    step: "03",
    title: "Release with proof",
    description:
      "Release USDC on Arc and attach settlement proof to the payout record.",
  },
];

const flowSteps = [
  {
    title: "Create payout",
    description:
      "Set the contributor, total amount, and milestone structure for the agreement.",
  },
  {
    title: "Submit work",
    description:
      "Contributors deliver milestone output and push it into review.",
  },
  {
    title: "Approve release",
    description:
      "Reviewers check completion and unlock the next payout release step.",
  },
  {
    title: "Record proof",
    description:
      "Settlement proof stays attached to the payout flow once USDC moves on Arc.",
  },
];

const proofSignals = [
  "Milestones created before release",
  "Approval gates every payout step",
  "Settlement proof visible in payout detail",
];

export default function Home() {
  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <section className="sf-shell overflow-hidden rounded-[2rem] px-6 py-8 md:px-8 md:py-10">
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-center">
          <div className="max-w-3xl space-y-6">
            <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
              Build on Arc · Demo-ready payout workflow
            </span>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Create milestone-based USDC payouts with approval-gated release on Arc.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--text-primary)] sm:text-lg">
                SettleFlow helps crypto teams define payout agreements, review submitted
                work, and release USDC only after milestone approval — with settlement
                proof attached to the payout record.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button href="/payouts/new">Launch Demo</Button>
              <Button href="/dashboard" variant="secondary">
                View Dashboard
              </Button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.10),rgba(2,6,23,0.10))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
            <div className="rounded-[1.75rem] border border-[var(--border-soft)] bg-[rgba(8,15,31,0.92)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Demo workflow
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    Community Campaign Design
                  </h2>
                </div>
                <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                  300 USDC
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Milestones
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">3</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Review queue
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">1</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.72)] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Proof status
                  </p>
                  <p className="mt-2 text-lg font-semibold text-cyan-100">Ready on release</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {flowSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex gap-3 rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.58)] p-4"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-xs font-semibold text-cyan-100">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {workflowCards.map((card) => (
          <SectionCard key={card.title} title={card.title}>
            <div className="space-y-3">
              <span className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold tracking-[0.18em] text-cyan-100">
                {card.step}
              </span>
              <p className="text-sm leading-7 text-[var(--text-primary)]">
                {card.description}
              </p>
            </div>
          </SectionCard>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Why SettleFlow">
          <div className="space-y-5 text-sm leading-7 text-[var(--text-primary)]">
            <p>
              Crypto teams still manage contributor payouts across chats, spreadsheets,
              wallet notes, and manual transfers. That creates unclear release rules,
              approval risk, and poor visibility once funds move.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.58)] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Problem
                </p>
                <p className="mt-2 font-semibold text-white">Manual payout coordination</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.58)] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Workflow
                </p>
                <p className="mt-2 font-semibold text-white">Milestone review before release</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(15,23,42,0.58)] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Outcome
                </p>
                <p className="mt-2 font-semibold text-white">Clear settlement visibility on Arc</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Proof signals">
          <div className="space-y-3">
            {proofSignals.map((signal) => (
              <div
                key={signal}
                className="flex items-start gap-3 rounded-2xl border border-[var(--border-soft)] bg-[rgba(8,15,31,0.74)] px-4 py-3 text-sm text-[var(--text-primary)]"
              >
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-300" />
                <p className="leading-6">{signal}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-400/8 p-4 text-sm leading-6 text-[var(--text-primary)]">
            SettleFlow is designed so reviewers can understand the payout flow, the
            release gate, and the Arc settlement proof in a single demo path.
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
