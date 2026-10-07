import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-32 w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--input-background)] px-5 py-3.5 text-base text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--input-placeholder)] focus:border-[var(--border-strong)] focus:bg-[var(--input-focus-background)]",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
