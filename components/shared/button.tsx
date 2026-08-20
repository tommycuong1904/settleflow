import Link from "next/link";
import React, { type MouseEventHandler, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  title?: string;
  icon?: ReactNode;
};

const baseClasses =
  "inline-flex items-center justify-center font-normal transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:cursor-not-allowed select-none active:translate-y-0 active:scale-[0.99] rounded-full";

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-1.5 text-xs rounded-full gap-1.5",
  md: "px-5 py-2.5 text-xs sm:text-sm rounded-full gap-2",
  lg: "px-7 py-3.5 text-sm sm:text-base rounded-full gap-2.5",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-cyan-300/80 bg-cyan-400 !text-slate-950 hover:!text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:bg-cyan-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:-translate-y-0.5 disabled:border-cyan-200/20 disabled:bg-cyan-400/40 disabled:!text-slate-900/60 disabled:shadow-none disabled:transform-none",
  secondary:
    "border border-slate-700 bg-slate-800/90 text-white hover:bg-slate-700 hover:border-cyan-400/40 hover:text-cyan-200 hover:-translate-y-0.5 disabled:border-slate-800 disabled:bg-slate-900/40 disabled:text-slate-500 disabled:transform-none shadow-sm",
  ghost:
    "border border-slate-700/70 bg-transparent text-slate-200 hover:bg-white/[0.06] hover:border-slate-500 hover:text-white hover:-translate-y-0.5 disabled:border-transparent disabled:text-slate-500 disabled:transform-none",
  outline:
    "border border-cyan-400/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 hover:-translate-y-0.5 disabled:opacity-40 disabled:transform-none",
  danger:
    "border border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 hover:border-rose-500/60 hover:-translate-y-0.5 disabled:opacity-40 disabled:transform-none",
};

export function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  onClick,
  disabled = false,
  type = "button",
  className: extraClassName = "",
  title,
  icon,
}: ButtonProps) {
  const combinedClassName = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${extraClassName}`.trim();

  if (href && !disabled) {
    return (
      <Link href={href} className={combinedClassName} onClick={onClick} title={title}>
        {icon}
        {children}
      </Link>
    );
  }

  return (
    <button
      className={combinedClassName}
      onClick={onClick}
      disabled={disabled}
      type={type}
      title={title}
    >
      {icon}
      {children}
    </button>
  );
}

