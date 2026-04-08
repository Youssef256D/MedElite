import type { ReactNode } from "react";

import { PublicFooter } from "@/components/nav/public-footer";
import { PublicHeader } from "@/components/nav/public-header";
import { PageTransition } from "@/components/transitions/page-transition";

export const dynamic = "force-dynamic";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <PageTransition className="relative">{children}</PageTransition>
      <PublicFooter />
    </div>
  );
}
