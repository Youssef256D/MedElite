import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-[var(--color-brand)] px-5 py-3 text-white shadow-[0_10px_30px_rgba(35,96,93,0.18)] hover:bg-[var(--color-brand-strong)]",
        secondary:
          "border border-[var(--color-border)] bg-white px-5 py-3 text-[var(--color-text)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]",
        ghost: "px-4 py-2 text-[var(--color-text-muted)] hover:bg-white/70 hover:text-[var(--color-text)]",
        danger: "bg-[#8d3b3b] px-5 py-3 text-white hover:bg-[#7d2f2f]",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-5",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
