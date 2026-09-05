"use client";

import React from "react";
import { RoleSwitcher } from "@/components/shared/role-switcher";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  showRoleSwitcherMobile?: boolean;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  showRoleSwitcherMobile = true,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between w-full">
      <div className="space-y-2.5 max-w-3xl flex-1">
        {eyebrow && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs md:text-sm font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
              {eyebrow}
            </p>
            {showRoleSwitcherMobile && (
              <div className="md:hidden shrink-0">
                <RoleSwitcher />
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl md:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="text-xs md:text-sm leading-relaxed text-[var(--text-primary)]">
              {description}
            </p>
          )}
        </div>
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-2.5 pt-1 md:pt-0 shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
