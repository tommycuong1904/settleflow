import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-cyan-500/30 bg-cyan-400/10 text-cyan-700",
        secondary: "border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--text-primary)]",
        destructive: "border-rose-400/30 bg-rose-400/10 text-rose-700",
        outline: "border-[var(--border-soft)] text-[var(--foreground)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
