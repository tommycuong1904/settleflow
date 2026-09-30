'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/shared/button'
import { ArrowRight, Check, ChevronRight, CircleCheck, CircleDot, LockKeyhole, ShieldCheck, WalletCards, MessageSquare, Table2, ArrowRightLeft } from 'lucide-react'
import { useWallet } from '@/lib/context/wallet-context'




const milestones = [
  ['Create', 'Contributor payout created'],
  ['Milestones', 'Two release checkpoints defined'],
  ['Submit', 'Work submitted for owner approval'],
  ['Approve', 'Owner verifies completion and unlocks release'],
  ['Release', 'USDC release becomes available'],
  ['Proof', 'Settlement proof stays attached'],
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
      {isConnected ? 'Open dashboard' : 'Sign in / Connect wallet'}
    </Button>
  )
}

function PayoutPreview() {
  const [active, setActive] = useState(1)
  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % 4), 2400)
    return () => window.clearInterval(timer)
  }, [])
  const states = ['SUBMIT', 'APPROVE', 'RELEASE', 'PROOF']
  return <div className="sf-preview-wrap" aria-label="Animated payout workflow preview">
    <div className="sf-orbit sf-orbit-one" /><div className="sf-orbit sf-orbit-two" />
    <div className="sf-payout-card">
      <div className="sf-card-top"><span className="sf-label">PAYOUT</span><span className="sf-live"><span /> LIVE FLOW</span></div>
      <div className="sf-amount">$2,400 <small>USDC</small></div>
      <div className="sf-card-meta"><span>Contributor payout</span><span>SettleFlow / 024</span></div>
      <div className="sf-milestone"><div className="sf-milestone-icon"><Check size={15} /></div><div><strong>Milestone 01 — Approved</strong><small>Release available</small></div><CircleCheck size={18} className="sf-check" /></div>
      <div className="sf-milestone"><div className="sf-milestone-icon muted"><CircleDot size={15} /></div><div><strong>Milestone 02 — Awaiting owner approval</strong><small>Submitted moments ago</small></div><ChevronRight size={18} className="sf-chevron" /></div>
      <div className="sf-release-bar"><LockKeyhole size={15} /> Release available after approval <span>→</span></div>
      <div className="sf-state-row">{states.map((state, index) => <div key={state} className={index <= active ? 'sf-state active' : 'sf-state'}><span>{index < active ? <Check size={10} /> : index === active ? <span className="sf-dot" /> : null}</span>{state}</div>)}</div>
    </div>
    <div className="sf-proof-chip"><ShieldCheck size={16} /><span><b>Settlement proof</b><small>Attached after release</small></span></div>
  </div>
}

function SectionKicker({ children }: { children: React.ReactNode }) { return <p className="sf-kicker">{children}</p> }
function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) { return <a className="sf-text-link" href={href}>{children} <ArrowRight size={16} /></a> }
export default function Home() {
  return (
    <main id="top">
      <section className="sf-hero sf-container">
        <div className="sf-hero-copy">
          <SectionKicker>ARC-NATIVE USDC PAYOUT WORKFLOW</SectionKicker>
          <h1>
            Milestone-based USDC payouts, <em>with approval built in.</em>
          </h1>
          <p className="sf-lede">
            SettleFlow is an Arc-native payout workflow for crypto teams. Create
            contributor payouts, manage milestones, approve completed work, and
            release USDC with settlement proof — all in one clear flow.
          </p>
          <div className="sf-cta-row">
            <AuthEntryButton variant="primary" />
            <Button href="/payouts/new" variant="ghost" size="lg">
              Create a payout <ArrowRight size={17} />
            </Button>
          </div>
          <div className="sf-hero-note">
            <span className="sf-note-check">
              <Check size={13} />
            </span>{" "}
            Approval controls release <span className="sf-note-line" />{" "}
            Settlement proof attached
          </div>
        </div>
        <PayoutPreview />
      </section>

      <section className="sf-section sf-problem">
        <div className="sf-container">
          <div className="sf-section-intro">
            <SectionKicker>THE PROBLEM</SectionKicker>
            <h2>Payout operations are scattered.</h2>
            <p>
              Crypto teams still manage contributor payouts across chats,
              spreadsheets, and manual wallet transfers.
            </p>
          </div>
          <div className="sf-fragment-grid">
            {[
              ["CHATS", "Approvals get buried in conversations.", "01", MessageSquare],
              ["SPREADSHEETS", "Payout status is hard to keep in sync.", "02", Table2],
              [
                "WALLET TRANSFERS",
                "Funds are released manually, outside the workflow.",
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
              ready to pay, and what was actually settled.
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
            <h2>Release is earned by state.</h2>
            <p>
              A payout does not become ready because someone clicked a wallet.
              It becomes ready when the milestone reaches the right approval
              state.
            </p>
          </div>
          <div className="sf-state-machine">
            {[
              "DRAFT",
              "SUBMITTED",
              "APPROVED",
              "RELEASE READY",
              "SETTLED",
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
            <SectionKicker>WHY ARC</SectionKicker>
            <h2>Built on Arc. Settled in USDC.</h2>
            <p>
              SettleFlow is not just deployed on Arc — Arc is the settlement
              layer that makes milestone-based USDC release legible inside the
              product workflow.
            </p>
          </div>
          <div className="sf-layers">
            {[
              [
                "SettleFlow",
                "Workflow layer",
                "Connects contributor work, milestone state, approval, release, and proof.",
                WalletCards,
              ],
              [
                "USDC",
                "Money layer",
                "Defines the payout asset for each approved release.",
                CircleCheck,
              ],
              [
                "Arc",
                "Settlement rail",
                "Powers the settlement path for the approved USDC release.",
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
              <SectionKicker>ARC TESTNET · FUNCTIONAL MVP</SectionKicker>
              <h2>Working on Arc Testnet.</h2>
              <p>
                SettleFlow currently demonstrates a functional end-to-end
                milestone payout flow on Arc Testnet.
              </p>
            </div>
          </div>
          <div className="sf-proof-grid">
            {[
              ["Contributor workflow", "Milestone submission and owner approval."],
              [
                "Approval-gated release",
                "USDC release happens after approval.",
              ],
              [
                "Wallet execution",
                "Browser-wallet releases are available on Arc Testnet.",
              ],
              [
                "Settlement proof",
                "Transaction hash and settlement proof are attached after release.",
              ],
              [
                "Product state",
                "Owner and contributor views keep workflow state synchronized.",
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
              Create the payout. Approve the milestone. Release the USDC. Keep the
              proof.
            </p>
          </div>
          <div className="sf-cta-row">
            <AuthEntryButton variant="primary" />
            <Button href="/payouts/new" variant="ghost" size="lg">
              Create a payout <ArrowRight size={17} />
            </Button>
          </div>
          <div className="sf-final-flow">
            <span>APPROVAL</span>
            <i />
            <span>RELEASE</span>
            <i />
            <span>PROOF</span>
          </div>
        </div>
      </section>
    </main>
  );
}
