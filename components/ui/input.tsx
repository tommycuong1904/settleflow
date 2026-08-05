import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-[var(--border-soft)] bg-[rgba(8,15,31,0.78)] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-cyan-300/40 focus:bg-[rgba(8,15,31,0.92)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
