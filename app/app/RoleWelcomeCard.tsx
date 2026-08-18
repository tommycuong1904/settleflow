import { Button } from "@/components/ui/button";
import Link from "next/link";

type Role = "owner" | "reviewer" | "contributor";

/**
 * Render a hero card that adapts to the given user role.
 * Adjust the `role` prop source in the page that uses this component
 * (e.g., pull from session, JWT, or a query param).
 */
export default function RoleWelcomeCard({ role }: { role: Role }) {
  const config = {
    owner: {
      title: "👑 Owner Dashboard",
      description:
        "Full overview of every payout, quick access to create new agreements and manage team settings.",
      primary: { href: "/payouts/new", label: "Launch Demo" },
      secondary: { href: "/dashboard", label: "View Dashboard" },
    },
    reviewer: {
      title: "🔍 Reviewer Queue",
      description:
        "Pending milestones are waiting for your approval. Resolve blockers and keep payouts flowing.",
      primary: { href: "/dashboard", label: "Open Review Queue" },
    },
    contributor: {
      title: "🚀 My Contributions",
      description:
        "See the payouts you’re involved in, submit work for the next milestone and track proof on‑chain.",
      primary: { href: "/payouts/new", label: "Create New Payout" },
      secondary: { href: "/dashboard", label: "My Dashboard" },
    },
  }[role];

  return (
    <section className="sf-shell overflow-hidden rounded-[2rem] px-6 py-8 md:px-8 md:py-10">
      <div className="max-w-3xl space-y-5 text-center mx-auto">
        <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
          {config.title}
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {config.title}
        </h1>
        <p className="max-w-2xl text-base leading-8 text-[var(--text-primary)] sm:text-lg mx-auto">
          {config.description}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild>
            <Link href={config.primary.href}>{config.primary.label}</Link>
          </Button>
          {config.secondary && (
            <Button asChild variant="secondary">
              <Link href={config.secondary.href}>{config.secondary.label}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
