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
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between w-full">
      <div className="space-y-3 max-w-3xl flex-1">
        {eyebrow && (
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
              {eyebrow}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="text-sm leading-relaxed text-[var(--text-primary)]">
              {description}
            </p>
          )}
        </div>
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-3 pt-1 md:pt-0 shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
