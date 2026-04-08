import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeading({ eyebrow, title, description, action }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-3">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-brand)]">{eyebrow}</p> : null}
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-text)]">{title}</h2>
          {description ? <p className="max-w-2xl text-sm leading-7 text-[var(--color-text-muted)]">{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}
