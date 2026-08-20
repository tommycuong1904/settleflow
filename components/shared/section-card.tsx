import type { ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  children: ReactNode;
};

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <section className="sf-shell rounded-xl p-6 md:p-7">
      {title ? (
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-white">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}
