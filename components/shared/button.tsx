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
  "inline-flex items-center justify-center font-medium transition-[background-color,border-color,color,transform,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-strong)] disabled:cursor-not-allowed select-none active:translate-y-0 active:scale-[0.98] rounded-full";

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-4 py-2 text-xs rounded-full gap-1.5",
  md: "min-h-11 px-5 py-2.5 text-sm rounded-full gap-2",
  lg: "min-h-12 px-7 py-3 text-base rounded-full gap-2.5",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-black !bg-black !text-white font-semibold hover:!bg-neutral-800 hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] disabled:opacity-40",
  secondary:
    "border border-[var(--button-secondary-border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] hover:border-[var(--foreground)] disabled:opacity-40",
  ghost:
    "border border-transparent bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:opacity-40",
  outline:
    "border border-[var(--button-secondary-border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] hover:border-[var(--foreground)] disabled:opacity-40",
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
