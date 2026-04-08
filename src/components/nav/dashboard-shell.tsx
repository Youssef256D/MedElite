"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/nav/brand-mark";
import { PageTransition } from "@/components/transitions/page-transition";
import { logoutAction } from "@/modules/auth/actions";
import { cn } from "@/lib/utils";

type NavigationItem = {
  href: string;
  label: string;
};

type DashboardShellProps = {
  navigation: NavigationItem[];
  children: ReactNode;
  userName: string;
  userRole: string;
};

export function DashboardShell({
  navigation,
  children,
  userName,
  userRole,
}: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
        <aside className="flex flex-col rounded-[32px] border border-[var(--color-border)] bg-white/92 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.07)]">
          <div className="space-y-8">
            <BrandMark />
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                      isActive
                        ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                        : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="mt-auto rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-sm font-semibold text-[var(--color-text)]">{userName}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-[var(--color-text-subtle)]">{userRole}</p>
            <form action={logoutAction} className="mt-4">
              <button
                type="submit"
                className="text-sm font-semibold text-[var(--color-brand)] transition-colors duration-200 hover:text-[var(--color-brand-strong)]"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>
        <main className="flex min-w-0 flex-col gap-6 rounded-[32px] border border-[var(--color-border)] bg-white/88 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.05)] lg:p-8">
          <PageTransition className="flex min-w-0 flex-col gap-6">{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
