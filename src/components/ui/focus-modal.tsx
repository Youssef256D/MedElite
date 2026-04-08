"use client";

import { type ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type FocusModalProps = {
  triggerLabel: string;
  title: string;
  description?: string;
  children: ReactNode;
  triggerVariant?: "primary" | "secondary" | "ghost" | "danger";
  triggerSize?: "sm" | "md" | "lg";
};

export function FocusModal({
  triggerLabel,
  title,
  description,
  children,
  triggerVariant = "secondary",
  triggerSize = "md",
}: FocusModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <Button type="button" variant={triggerVariant} size={triggerSize} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#152321]/45 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-[32px] border border-[var(--color-border)] bg-white shadow-[0_30px_100px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-6 py-5">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">{title}</h2>
                {description ? (
                  <p className="text-sm leading-7 text-[var(--color-text-muted)]">{description}</p>
                ) : null}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            <div className="max-h-[calc(90vh-100px)] overflow-y-auto px-6 py-5">{children}</div>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            className="absolute inset-0 -z-10"
            onClick={() => setOpen(false)}
          />
        </div>
      ) : null}
    </>
  );
}
