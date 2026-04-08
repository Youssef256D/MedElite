import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
};

export function StatCard({ label, value, detail, icon }: StatCardProps) {
  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">{label}</p>
        {icon ? <div className="text-[var(--color-brand)]">{icon}</div> : null}
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-semibold tracking-tight text-[var(--color-text)]">{value}</p>
        {detail ? <p className="text-sm text-[var(--color-text-muted)]">{detail}</p> : null}
      </div>
    </Card>
  );
}
