import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-28 w-full rounded-2xl border border-[var(--border-soft)] bg-[rgba(8,15,31,0.78)] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-cyan-300/40 focus:bg-[rgba(8,15,31,0.92)]",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
