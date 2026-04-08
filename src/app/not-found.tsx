import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="page-grid flex min-h-screen items-center justify-center py-20">
      <Card className="max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-brand)]">Not found</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--color-text)]">This page does not exist.</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--color-text-muted)]">
          The link may be outdated, restricted, or removed. Return to the catalog or go back to the homepage.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/">
            <Button>Back home</Button>
          </Link>
          <Link href="/courses">
            <Button variant="secondary">Browse courses</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
