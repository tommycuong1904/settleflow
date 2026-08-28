import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] focus:bg-[var(--surface)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
