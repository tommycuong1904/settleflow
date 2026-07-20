import Link from "next/link";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-cyan-400 text-slate-950 hover:bg-cyan-300 border border-cyan-300",
  secondary:
    "border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800",
};

export function Button({ children, href, variant = "primary" }: ButtonProps) {
  const className = `inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${variantClasses[variant]}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return <button className={className}>{children}</button>;
}
