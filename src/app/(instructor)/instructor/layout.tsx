import type { ReactNode } from "react";
import type { Metadata } from "next";

import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/nav/dashboard-shell";
import { createNoIndexMetadata } from "@/lib/seo";
import { canAccessInstructorStudio, roleLabels } from "@/modules/auth/permissions";
import { getCurrentSession, getRoleHome } from "@/modules/auth/service";

export const metadata: Metadata = createNoIndexMetadata("Instructor Studio");

const navigation = [
  { href: "/instructor/dashboard", label: "Dashboard" },
  { href: "/instructor/courses", label: "My courses" },
  { href: "/instructor/uploads", label: "Upload center" },
  { href: "/instructor/analytics", label: "Analytics" },
  { href: "/instructor/settings", label: "Profile & settings" },
];

export default async function InstructorLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (!canAccessInstructorStudio(session.user.role)) {
    redirect(getRoleHome(session.user.role));
  }

  return (
    <DashboardShell
      navigation={navigation}
      userName={`${session.user.firstName} ${session.user.lastName}`}
      userRole={roleLabels[session.user.role]}
    >
      {children}
    </DashboardShell>
  );
}
