import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const toneMap = {
  neutral: "bg-[var(--color-surface-strong)] text-[var(--color-text-muted)]",
  brand: "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]",
  success: "bg-[#e6f4ef] text-[#24634e]",
  warning: "bg-[#fff1de] text-[#8d5c10]",
  danger: "bg-[#fee7e7] text-[#8f2d2d]",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof toneMap;
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        toneMap[tone],
        className,
      )}
      {...props}
    />
  );
}
