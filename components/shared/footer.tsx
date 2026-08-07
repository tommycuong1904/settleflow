import Link from "next/link";
import type { ReactNode } from "react";

const productLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Create Payout", href: "/payouts/new" },
  { label: "Workflow", href: "/#workflow" },
];

const resourceLinks = [
  { label: "Documentation", href: "#" },
  { label: "GitHub", href: "#" },
];

const techLabels = [
  { label: "Built on Arc", accent: true },
  { label: "USDC", accent: false },
  { label: "App Kit Send", accent: false },
];

function FooterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-soft)] bg-[var(--surface-muted)]">
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        {/* Top grid */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="text-lg font-semibold tracking-tight text-white">
              <span className="text-white">Settle</span>
              <span className="text-cyan-300">Flow</span>
            </Link>
            <p className="max-w-xs text-sm leading-6 text-[var(--text-primary)]">
              Milestone-based USDC payout workflow for crypto teams. Approval-gated
              releases with settlement proof on Arc.
            </p>
          </div>

          {/* Product */}
          <FooterSection title="Product">
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--text-primary)] transition-colors hover:text-cyan-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterSection>

          {/* Resources */}
          <FooterSection title="Resources">
            <ul className="space-y-2">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--text-primary)] transition-colors hover:text-cyan-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterSection>

          {/* Technology */}
          <FooterSection title="Technology">
            <ul className="space-y-2">
              {techLabels.map((tech) => (
                <li key={tech.label} className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      tech.accent
                        ? "border border-cyan-300/30 bg-cyan-400/10 text-cyan-200"
                        : "border border-[var(--border-soft)] bg-[rgba(15,23,42,0.6)] text-[var(--text-primary)]"
                    }`}
                  >
                    {tech.label}
                  </span>
                </li>
              ))}
            </ul>
          </FooterSection>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-[var(--border-soft)] pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-[var(--text-muted)]">
            &copy; {new Date().getFullYear()} SettleFlow. All rights reserved.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Milestone payouts on Arc · USDC settlement
          </p>
        </div>
      </div>
    </footer>
  );
}
