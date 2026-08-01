import Link from "next/link";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: ButtonVariant;
};

const baseClasses =
  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-cyan-300/70 bg-cyan-400 text-slate-950 hover:bg-cyan-300",
  secondary:
    "border border-[var(--border-soft)] bg-[rgba(15,23,42,0.78)] text-[var(--foreground)] hover:border-cyan-300/40 hover:bg-[rgba(17,24,39,0.98)]",
  ghost:
    "border border-transparent bg-transparent text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100",
};

export function Button({ children, href, variant = "primary" }: ButtonProps) {
  const className = `${baseClasses} ${variantClasses[variant]}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return <button className={className}>{children}</button>;
}
