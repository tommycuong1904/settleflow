import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-normal transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 active:translate-y-0 active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "border border-cyan-300/80 bg-cyan-400 !text-slate-950 hover:!text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:bg-cyan-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:-translate-y-0.5",
        secondary:
          "border border-slate-700 bg-slate-800/90 text-white hover:bg-slate-700 hover:border-cyan-400/40 hover:text-cyan-200 hover:-translate-y-0.5 shadow-sm",
        ghost:
          "border border-slate-700/70 bg-transparent text-slate-200 hover:bg-white/[0.06] hover:border-slate-500 hover:text-white hover:-translate-y-0.5",
        outline:
          "border border-cyan-400/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 hover:-translate-y-0.5",
        danger:
          "border border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 hover:border-rose-500/60 hover:-translate-y-0.5",
      },
      size: {
        default: "h-10 px-5 py-2.5 rounded-full",
        sm: "h-8.5 rounded-full px-3.5 text-xs",
        lg: "h-12 rounded-full px-7 text-base",
        icon: "h-10 w-10 rounded-full",
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

