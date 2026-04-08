import Link from "next/link";

import { BrandMark } from "@/components/nav/brand-mark";

export function PublicFooter() {
  return (
    <footer className="border-t border-white/60 bg-[rgba(248,245,239,0.6)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div className="space-y-4">
          <BrandMark />
          <p className="max-w-xl text-sm leading-7 text-[var(--color-text-muted)]">
            Quality medical education for students and instructors.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-muted)]">
          <Link href="/about">About</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
