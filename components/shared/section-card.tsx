import type { ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  children: ReactNode;
};

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      {title ? (
        <h2 className="mb-4 text-lg font-semibold text-slate-100">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}
