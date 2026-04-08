import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { BrandMark } from "@/components/nav/brand-mark";
import { PageTransition } from "@/components/transitions/page-transition";
import { getCurrentSession, getRoleHome } from "@/modules/auth/service";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();

  if (session) {
    redirect(getRoleHome(session.user.role));
  }

  return (
    <PageTransition>
      <div className="page-grid grid min-h-screen items-center py-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden pr-8 lg:block">
          <BrandMark />
          <div className="mt-8 max-w-xl space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-brand)]">Secure access</p>
            <h1 className="display-copy text-6xl font-semibold tracking-tight text-[var(--color-text)]">
              Calm, secure entry into premium medical learning.
            </h1>
            <p className="text-lg leading-9 text-[var(--color-text-muted)]">
              Sessions are hashed and server-enforced, device limits are monitored, and access decisions remain on the backend.
            </p>
          </div>
        </div>
        <div className="surface-panel mx-auto w-full max-w-xl p-8 md:p-10">{children}</div>
      </div>
    </PageTransition>
  );
}
