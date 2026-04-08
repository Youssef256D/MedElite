import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type EmptyStateProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ eyebrow, title, description, action }: EmptyStateProps) {
  return (
    <Card className="flex min-h-56 flex-col items-start justify-center gap-4 border-dashed bg-[var(--color-surface)]">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-brand)]">{eyebrow}</p> : null}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-[var(--color-text)]">{title}</h3>
        <p className="max-w-xl text-sm leading-7 text-[var(--color-text-muted)]">{description}</p>
      </div>
      {action}
    </Card>
  );
}
