"use client";

import React from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between w-full">
      <div className="space-y-2.5 max-w-3xl flex-1">
        {eyebrow && (
          <div>
            <p className="text-xs md:text-sm font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
              {eyebrow}
            </p>
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
