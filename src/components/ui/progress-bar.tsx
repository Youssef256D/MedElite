import { cn } from "@/lib/utils";

type ProgressBarProps = {
  value: number;
  className?: string;
};

export function ProgressBar({ value, className }: ProgressBarProps) {
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-strong)]", className)}>
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-brand)_0%,var(--color-brand-strong)_100%)] transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
