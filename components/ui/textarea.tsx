import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-28 w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] focus:bg-[var(--surface)]",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
