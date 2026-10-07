import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-full border border-[var(--border-soft)] bg-[var(--input-background)] px-5 py-3 text-base text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--input-placeholder)] focus:border-[var(--border-strong)] focus:bg-[var(--input-focus-background)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
