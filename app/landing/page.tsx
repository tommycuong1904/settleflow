'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, ChevronRight, CircleCheck, CircleDot, FileCheck2, LockKeyhole, ShieldCheck, WalletCards } from 'lucide-react'
import { useWallet } from '@/lib/context/wallet-context'

function AuthEntryButton({ className = '' }: { className?: string }) {
  const { isConnected, openAuthModal } = useWallet()
  const router = useRouter()
  return <button type="button" onClick={() => isConnected ? router.push('/dashboard') : openAuthModal()} className={className}>{isConnected ? 'Open dashboard' : 'Sign in / Connect wallet'}</button>
}


const milestones = [
  ['Create', 'Contributor payout created'],
  ['Milestones', 'Two release checkpoints defined'],
  ['Submit', 'Work submitted for review'],
  ['Review', 'Reviewer checks completion'],
  ['Approve', 'Approval unlocks release'],
  ['Release', 'USDC release becomes available'],
  ['Proof', 'Settlement proof stays attached'],
]

function PayoutPreview() {
  const [active, setActive] = useState(2)
  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % 5), 2400)
    return () => window.clearInterval(timer)
  }, [])
  const states = ['SUBMIT', 'REVIEW', 'APPROVE', 'RELEASE', 'PROOF']
  return <div className="sf-preview-wrap" aria-label="Animated payout workflow preview">
    <div className="sf-orbit sf-orbit-one" /><div className="sf-orbit sf-orbit-two" />
    <div className="sf-payout-card">
      <div className="sf-card-top"><span className="sf-label">PAYOUT</span><span className="sf-live"><span /> LIVE FLOW</span></div>
      <div className="sf-amount">$2,400 <small>USDC</small></div>
      <div className="sf-card-meta"><span>Contributor payout</span><span>SettleFlow / 024</span></div>
      <div className="sf-milestone"><div className="sf-milestone-icon"><Check size={15} /></div><div><strong>Milestone 01 — Approved</strong><small>Release available</small></div><CircleCheck size={18} className="sf-check" /></div>
      <div className="sf-milestone"><div className="sf-milestone-icon muted"><CircleDot size={15} /></div><div><strong>Milestone 02 — Ready for review</strong><small>Submitted moments ago</small></div><ChevronRight size={18} className="sf-chevron" /></div>
      <div className="sf-release-bar"><LockKeyhole size={15} /> Release available after approval <span>→</span></div>
      <div className="sf-state-row">{states.map((state, index) => <div key={state} className={index <= active ? 'sf-state active' : 'sf-state'}><span>{index < active ? <Check size={10} /> : index === active ? <span className="sf-dot" /> : null}</span>{state}</div>)}</div>
    </div>
    <div className="sf-proof-chip"><ShieldCheck size={16} /><span><b>Settlement proof</b><small>Attached after release</small></span></div>
  </div>
}

function SectionKicker({ children }: { children: React.ReactNode }) { return <p className="sf-kicker">{children}</p> }
function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link className="sf-text-link" href={href}>{children} <ArrowRight size={16} /></Link> }

export default function Page() {
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
            <Link href="/payouts/new" className="sf-button">
              Create a payout <ArrowRight size={17} />
            </Link>
            <AuthEntryButton className="sf-button sf-button-ghost" />
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

      <section className="sf-thesis">
        <div className="sf-container sf-thesis-inner">
          <div>
            <SectionKicker>THE CORE IDEA</SectionKicker>
            <h2>Approval should control the release.</h2>
            <p>
              SettleFlow turns milestone completion into an explicit payout
              decision — before funds move.
            </p>
          </div>
          <div className="sf-vertical-flow">
            {[
              "WORK SUBMITTED",
              "REVIEW",
              "APPROVAL",
              "USDC RELEASE",
              "SETTLEMENT PROOF",
            ].map((item, i) => (
              <div key={item} className="sf-flow-step">
                <span>{String(i + 1).padStart(2, "0")}</span>
                <strong>{item}</strong>
                {i < 4 && <i />}
              </div>
            ))}
          </div>
        </div>
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
              ["CHATS", "Approvals get buried in conversations.", "01"],
              ["SPREADSHEETS", "Payout status is hard to keep in sync.", "02"],
              [
                "WALLET TRANSFERS",
                "Funds are released manually, outside the workflow.",
                "03",
              ],
            ].map(([title, text, num]) => (
              <div className="sf-fragment" key={title}>
                <span>{num}</span>
                <div className="sf-faux-window">
                  <div />
                  <div />
                  <div />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
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
      </section>

      <section id="product" className="sf-section sf-product">
        <div className="sf-container">
          <div className="sf-section-intro">
            <SectionKicker>THE PRODUCT</SectionKicker>
            <h2>From payout request to settlement proof.</h2>
            <p>
              SettleFlow turns contributor compensation into one clear
              milestone-based approval-to-settlement workflow on Arc.
            </p>
          </div>
          <div className="sf-product-grid">
            {milestones.map(([title, text], index) => (
              <div className="sf-product-step" key={title}>
                <div className="sf-step-number">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="sf-section sf-workflow">
        <div className="sf-container">
          <div className="sf-section-intro sf-centered">
            <SectionKicker>THE WORKFLOW</SectionKicker>
            <h2>
              Create → Milestones → Submit → Review → Approve → Release → Proof
            </h2>
            <p>
              Every payout moves through a visible state, so the next action is
              clear.
            </p>
          </div>
          <div className="sf-timeline">
            {milestones.map(([title, text], index) => (
              <div
                className={
                  index === 4 ? "sf-timeline-item active" : "sf-timeline-item"
                }
                key={title}
              >
                <div className="sf-timeline-marker">
                  {index < 4 ? (
                    <Check size={14} />
                  ) : index === 4 ? (
                    <CircleDot size={14} />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="sf-timeline-content">
                  <span>0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  {index === 4 && (
                    <div className="sf-approval-card">
                      <div className="sf-card-top">
                        <span className="sf-label">APPROVE</span>
                        <span className="sf-status">READY FOR APPROVAL</span>
                      </div>
                      <strong>Milestone 02</strong>
                      <p>Design system implementation</p>
                      <small>Submitted by Contributor</small>
                      <div className="sf-approval-buttons">
                        <button>Reject</button>
                        <button>
                          Approve <Check size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sf-gated">
        <div className="sf-container sf-gated-inner">
          <div>
            <SectionKicker>THE DIFFERENTIATOR</SectionKicker>
            <h2>
              Release becomes a gated product action, not an ad hoc wallet
              transfer.
            </h2>
          </div>
          <div className="sf-principles">
            {[
              "Milestone state determines payout readiness.",
              "Approval controls release.",
              "USDC settlement is explicit.",
              "Settlement proof stays attached to the payout.",
            ].map((text) => (
              <div key={text}>
                <Check size={16} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sf-section sf-showcase">
        <div className="sf-container">
          <div className="sf-section-intro">
            <SectionKicker>PRODUCT VIEW</SectionKicker>
            <h2>One payout. Every milestone. One clear state.</h2>
            <p>
              Track milestone progress, review submissions, approve releases,
              and keep settlement proof attached to the payout.
            </p>
          </div>
          <div className="sf-dashboard">
            <aside>
              <a className="sf-wordmark">
                <span>Settle</span>Flow
              </a>
              <small>WORKSPACE</small>
              <a className="current">Payouts</a>
              <a>Contributors</a>
              <a>Activity</a>
              <div className="sf-aside-bottom">
                <span>Arc Testnet</span>
                <span className="sf-live">
                  <span /> Connected
                </span>
              </div>
            </aside>
            <div className="sf-dashboard-main">
              <div className="sf-dash-head">
                <div>
                  <small>PAYOUT / 024</small>
                  <h3>Product design sprint</h3>
                </div>
                <span className="sf-approved-pill">
                  <Check size={13} /> 1 of 2 approved
                </span>
              </div>
              <div className="sf-dash-summary">
                <div>
                  <small>TOTAL PAYOUT</small>
                  <strong>
                    $2,400 <i>USDC</i>
                  </strong>
                </div>
                <div>
                  <small>CONTRIBUTOR</small>
                  <strong>Contributor wallet</strong>
                </div>
                <div>
                  <small>RELEASE STATE</small>
                  <strong className="cyan">Awaiting approval</strong>
                </div>
              </div>
              <div className="sf-dash-milestones">
                <div className="sf-dash-row">
                  <span className="sf-row-icon done">
                    <Check size={15} />
                  </span>
                  <div>
                    <small>MILESTONE 01</small>
                    <strong>Research & direction</strong>
                  </div>
                  <b>Approved</b>
                  <span>$1,200 USDC</span>
                </div>
                <div className="sf-dash-row">
                  <span className="sf-row-icon review">
                    <CircleDot size={15} />
                  </span>
                  <div>
                    <small>MILESTONE 02</small>
                    <strong>Design system implementation</strong>
                  </div>
                  <b className="review-text">Ready for review</b>
                  <span>$1,200 USDC</span>
                </div>
              </div>
              <div className="sf-dash-proof">
                <FileCheck2 size={18} />
                <div>
                  <strong>Settlement proof</strong>
                  <small>
                    Attached once an approved release settles on Arc.
                  </small>
                </div>
                <span>—</span>
              </div>
            </div>
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
              "UNDER REVIEW",
              "APPROVED",
              "RELEASE READY",
              "SETTLED",
            ].map((state, index) => (
              <div
                className={
                  index >= 3 ? "sf-machine-state active" : "sf-machine-state"
                }
                key={state}
              >
                <span>{index < 3 ? index + 1 : <Check size={14} />}</span>
                <strong>{state}</strong>
                {index < 5 && <i />}
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

      <section className="sf-section sf-use-cases">
        <div className="sf-container">
          <div className="sf-section-intro">
            <SectionKicker>USE CASES</SectionKicker>
            <h2>Built for teams that pay contributors.</h2>
          </div>
          <div className="sf-use-grid">
            {[
              [
                "DAOs & protocols",
                "Manage contributor compensation without fragmented payout operations.",
              ],
              [
                "Crypto teams",
                "Turn recurring contributor payments into a repeatable workflow.",
              ],
              [
                "Project owners",
                "Keep milestone approval and payment decisions in one place.",
              ],
              ["Contributors", "See what was submitted, approved, and paid."],
            ].map(([title, text]) => (
              <div key={title}>
                <span>↗</span>
                <h3>{title}</h3>
                <p>{text}</p>
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
            <div className="sf-proof-badge">
              <span />
              <strong>FUNCTIONAL MVP</strong>
              <small>ARC TESTNET</small>
            </div>
          </div>
          <div className="sf-proof-grid">
            {[
              ["Contributor workflow", "Milestone submission and review flow."],
              [
                "Approval-gated release",
                "USDC release happens after approval.",
              ],
              [
                "Wallet execution",
                "Real browser-wallet release flow tested on Arc Testnet.",
              ],
              [
                "Settlement proof",
                "Transaction hash and settlement proof are attached after release.",
              ],
              [
                "Product state",
                "Owner, reviewer, and contributor views keep workflow state synchronized.",
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
          <SectionKicker>THE CLEAR PATH</SectionKicker>
          <h2>Make every payout decision clear.</h2>
          <p>
            Create the payout. Approve the milestone. Release the USDC. Keep the
            proof.
          </p>
          <div className="sf-cta-row">
            <Link href="/payouts/new" className="sf-button">
              Create a payout <ArrowRight size={17} />
            </Link>
            <AuthEntryButton className="sf-button sf-button-ghost" />
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
