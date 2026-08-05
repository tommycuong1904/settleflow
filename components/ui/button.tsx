import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60",
  {
    variants: {
      variant: {
        default:
          "border border-cyan-300/70 bg-cyan-400 text-slate-950 hover:bg-cyan-300",
        secondary:
          "border border-[var(--border-soft)] bg-[rgba(15,23,42,0.78)] text-[var(--foreground)] hover:border-cyan-300/40 hover:bg-[rgba(17,24,39,0.98)]",
        ghost: "text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100",
        outline:
          "border border-[var(--border-soft)] bg-transparent text-[var(--foreground)] hover:border-cyan-300/40 hover:bg-[rgba(15,23,42,0.42)]",
      },
      size: {
        default: "h-10 px-4 py-2.5",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-xl px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
