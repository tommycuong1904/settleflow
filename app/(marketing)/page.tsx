'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/shared/button'
import { ArrowRight, Check, ChevronRight, CircleCheck, CircleDot, LockKeyhole, ShieldCheck, WalletCards, MessageSquare, Table2, ArrowRightLeft } from 'lucide-react'
import { useWallet } from '@/lib/context/wallet-context'




const milestones = [
  ['Create', 'Payment plan created'],
  ['Milestones', 'Work checkpoints defined'],
  ['Submit', 'Work submitted for owner approval'],
  ['Approve', 'Owner verifies completion and unlocks payment'],
  ['Pay', 'Payment becomes available'],
  ['Record', 'Payment record stays attached'],
]

function AuthEntryButton({ variant = 'ghost' }: { variant?: 'primary' | 'ghost' }) {
  const { isConnected, openAuthModal } = useWallet()
  const router = useRouter()

  return (
    <Button
      variant={variant}
      size="lg"
      onClick={() => isConnected ? router.push('/dashboard') : openAuthModal()}
    >
      {isConnected ? 'Open dashboard' : 'Continue with Google'}
    </Button>
  )
}

function PayoutPreview() {
  const [active, setActive] = useState(1)
  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % 4), 2400)
    return () => window.clearInterval(timer)
  }, [])
  const states = ['SUBMIT', 'APPROVE', 'PAY', 'RECORD']
  return <div className="sf-preview-wrap" aria-label="Animated payout workflow preview">
    <div className="sf-orbit sf-orbit-one" /><div className="sf-orbit sf-orbit-two" />
    <div className="sf-payout-card">
      <div className="sf-card-top"><span className="sf-label">EXAMPLE PAYOUT</span><span className="sf-live"><span /> OWNER VIEW</span></div>
      <div className="sf-amount">$2,400 <small>USDC</small></div>
      <div className="sf-card-meta"><span>Contributor payout</span><span>SettleFlow / 024</span></div>
      <div className="sf-milestone"><div className="sf-milestone-icon"><Check size={15} /></div><div><strong>Milestone 01 — Approved</strong><small>Ready for payment</small></div><CircleCheck size={18} className="sf-check" /></div>
      <div className="sf-milestone"><div className="sf-milestone-icon muted"><CircleDot size={15} /></div><div><strong>Milestone 02 — Awaiting owner approval</strong><small>Submitted moments ago</small></div><ChevronRight size={18} className="sf-chevron" /></div>
      <div className="sf-release-bar"><LockKeyhole size={15} /> Payment available after approval <span>→</span></div>
      <div className="sf-state-row">{states.map((state, index) => <div key={state} className={index <= active ? 'sf-state active' : 'sf-state'}><span>{index < active ? <Check size={10} /> : index === active ? <span className="sf-dot" /> : null}</span>{state}</div>)}</div>
    </div>
    <div className="sf-proof-chip"><ShieldCheck size={16} /><span><b>Payment record</b><small>Attached after payment</small></span></div>
  </div>
}

function SectionKicker({ children }: { children: React.ReactNode }) { return <p className="sf-kicker">{children}</p> }
export default function Home() {
  return (
    <main id="top">
      <section className="sf-hero sf-container">
        <div className="sf-hero-copy">
          <SectionKicker>PAYMENT WORKFLOW FOR TEAMS</SectionKicker>
          <h1>
            Pay contributors after work is <em>approved.</em>
          </h1>
          <p className="sf-lede">
            Keep work, approvals, payments, and records in one shared workflow.
            Everyone sees what needs attention, who decides, and what happens next.
          </p>
          <div className="sf-cta-row">
            <AuthEntryButton variant="primary" />
            <Button href="#workflow" variant="ghost" size="lg">
              See how it works <ArrowRight size={17} />
            </Button>
          </div>
          <div className="sf-hero-note">
            <span className="sf-note-check">
              <Check size={13} />
            </span>
            Start with Google — no browser wallet or recovery phrase needed
          </div>
        </div>
        <PayoutPreview />
      </section>

      <section className="sf-role-section sf-container" aria-labelledby="role-summary-title">
        <div className="sf-role-intro">
          <SectionKicker>ONE WORKFLOW, CLEAR RESPONSIBILITIES</SectionKicker>
          <h2 id="role-summary-title">Everyone sees the next safe action.</h2>
        </div>
        <div className="sf-role-grid">
          <article className="sf-role-card">
            <span className="sf-role-label">FOR OWNERS</span>
            <h3>Approve work before you pay.</h3>
            <p>Create payouts, review submitted work, and confirm a payment only when the milestone is ready.</p>
          </article>
          <article className="sf-role-card">
            <span className="sf-role-label">FOR CONTRIBUTORS</span>
            <h3>Submit work and follow payment.</h3>
            <p>Join with Google, send deliverables for review, and see exactly where payment stands.</p>
          </article>
        </div>
      </section>

      <section className="sf-section sf-problem">
        <div className="sf-container">
          <div className="sf-section-intro">
            <SectionKicker>THE PROBLEM</SectionKicker>
            <h2>Payout operations are scattered.</h2>
            <p>
              Teams still manage contractor payments across chats,
              spreadsheets, and manual transfers.
            </p>
          </div>
          <div className="sf-fragment-grid">
            {[
              ["CHATS", "Approvals get buried in conversations.", "01", MessageSquare],
              ["SPREADSHEETS", "Payout status is hard to keep in sync.", "02", Table2],
              [
                "MANUAL PAYMENTS",
                "Payments happen outside the approval workflow.",
                "03",
                ArrowRightLeft,
              ],
            ].map(([title, text, num, Icon]) => {
              const IconComp = Icon as React.ComponentType<{ size?: number; className?: string }>;
              return (
                <div className="sf-fragment relative overflow-hidden flex flex-col justify-between group" key={title as string}>
                  {/* Large background artistic watermark number */}
                  <span className="pointer-events-none absolute right-4 bottom-2 font-mono text-6xl font-extralight tracking-tighter text-[var(--foreground)] opacity-[0.06] select-none font-mono-numbers group-hover:opacity-[0.12] transition-opacity">
                    {num as string}
                  </span>

                  <div>
                    <div className="flex items-center justify-between mb-5">
                      {/* Editorial slash badge for the number */}
                      <span className="font-mono text-[11px] font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">
                        /{num as string}
                      </span>
                      <div className="p-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-soft)] text-[var(--foreground)] shadow-sm">
                        <IconComp size={18} />
                      </div>
                    </div>
                    <h3 className="font-semibold text-base text-[var(--foreground)] mb-2 tracking-tight">{title as string}</h3>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">{text as string}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="sf-problem-result">
            <div className="sf-transition">
              <span>FRAGMENTED</span>
              <i />
              <strong>STRUCTURED</strong>
              <ArrowRight size={18} />
            </div>
            <p className="sf-result">
              The result: teams lose a clear view of what was approved, what is
              ready to pay, and what was paid.
            </p>
          </div>
        </div>
      </section>

      <section id="workflow" className="sf-section sf-workflow">
        <div className="sf-container">
          <div className="sf-section-intro sf-centered sf-workflow-intro">
            <SectionKicker>THE WORKFLOW</SectionKicker>
            <h2>From payout setup to payment confirmation.</h2>
            <p>Each payout moves through clear, visible stages, so everyone knows what happens next.</p>
          </div>
          <div className="sf-timeline">
            {milestones.map(([title, text], index) => (
              <div
                className={
                  index === 3 ? "sf-timeline-item active" : "sf-timeline-item"
                }
                key={title}
              >
                <div className="sf-timeline-marker">
                  {index < 3 ? (
                    <Check size={14} />
                  ) : index === 3 ? (
                    <CircleDot size={14} />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="sf-timeline-content">
                  <span>0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sf-section sf-state-section">
        <div className="sf-container sf-state-layout">
          <div className="sf-section-intro">
            <SectionKicker>VISIBLE STATE</SectionKicker>
            <h2>Payment readiness follows approval.</h2>
            <p>
              A payment becomes ready only when the milestone reaches the right
              approval state. The next action is clear for everyone involved.
            </p>
          </div>
          <div className="sf-state-machine">
            {[
              "DRAFT",
              "SUBMITTED",
              "APPROVED",
              "PAYMENT READY",
              "PAID",
            ].map((state, index) => (
              <div
                className={
                  index >= 2 ? "sf-machine-state active" : "sf-machine-state"
                }
                key={state}
              >
                <span>{index < 2 ? index + 1 : <Check size={14} />}</span>
                <strong>{state}</strong>
                {index < 4 && <i />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="why-arc" className="sf-section sf-why-arc">
        <div className="sf-container">
          <div className="sf-section-intro sf-centered">
            <SectionKicker>HOW PAYMENTS WORK</SectionKicker>
            <h2 className="sf-settlement-title">Simple to use. Verified when it matters.</h2>
            <p>
              Owners confirm payment after approved work. SettleFlow keeps the record,
              while Arc and USDC handle settlement in the background.
            </p>
          </div>
          <div className="sf-layers">
            {[
              [
                "SettleFlow",
                "Workflow layer",
                "Connects contributor work, milestone state, approval, payment, and records.",
                WalletCards,
              ],
              [
                "USDC",
                "Money layer",
                "Defines the payment asset for Arc Testnet settlement.",
                CircleCheck,
              ],
              [
                "Arc",
                "Settlement rail",
                "Provides the settlement rail for approved USDC payments.",
                ShieldCheck,
              ],
            ].map(([title, label, text, Icon]) => (
              <div className="sf-layer" key={title as string}>
                <Icon size={22} />
                <small>{label as string}</small>
                <h3>{title as string}</h3>
                <p>{text as string}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="sf-section sf-proof">
        <div className="sf-container">
          <div className="sf-proof-head">
            <div className="sf-section-intro">
              <SectionKicker>PAYMENT, SIMPLIFIED</SectionKicker>
              <h2 className="sf-proof-title">Pay with Google. Keep proof when it matters.</h2>
              <p>
                Owners set up a secure payment account when they need to pay. Contributors can
                join, submit work, and follow payment status without a browser wallet.
              </p>
            </div>
          </div>
          <div className="sf-proof-grid">
            {[
              ["Google sign-in", "Start with a familiar account instead of a browser wallet."],
              [
                "Owner approval",
                "A payment becomes available only after approved work.",
              ],
              [
                "Payment account",
                "Set it up once when you are ready to make a payment.",
              ],
              [
                "Arc Testnet record",
                "Confirmed payment details stay attached to the milestone.",
              ],
              [
                "Role-aware workspace",
                "Owners and contributors see only their next safe action.",
              ],
            ].map(([title, text]) => (
              <div key={title}>
                <Check size={17} />
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sf-final">
        <div className="sf-container sf-final-inner">
          <div className="sf-section-intro sf-centered">
            <SectionKicker>THE CLEAR PATH</SectionKicker>
            <h2>Make every payout decision clear.</h2>
            <p>
              Create the payment plan. Approve the milestone. Pay. Keep the
              record.
            </p>
          </div>
          <div className="sf-cta-row">
            <AuthEntryButton variant="primary" />
            <Button href="#workflow" variant="ghost" size="lg">
              See how it works <ArrowRight size={17} />
            </Button>
          </div>
          <div className="sf-final-flow">
            <span>APPROVAL</span>
            <i />
            <span>PAY</span>
            <i />
            <span>RECORD</span>
          </div>
        </div>
      </section>
    </main>
  );
}
