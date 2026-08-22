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
  "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-strong)] disabled:cursor-not-allowed select-none active:scale-[0.98] rounded-full";

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3.5 py-1.5 text-xs rounded-full gap-1.5",
  md: "px-4.5 py-2 text-xs sm:text-sm rounded-full gap-2",
  lg: "px-6 py-2.5 text-sm sm:text-base rounded-full gap-2.5",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-[var(--foreground)] text-[var(--background)] font-semibold hover:opacity-90 shadow-sm disabled:opacity-40",
  secondary:
    "border border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[var(--surface-strong)] hover:border-[var(--border-strong)] shadow-sm disabled:opacity-40",
  ghost:
    "border border-transparent bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:opacity-40",
  outline:
    "border border-[var(--border-strong)] bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-muted)] disabled:opacity-40",
  danger:
    "border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 hover:border-rose-500/50 disabled:opacity-40",
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

