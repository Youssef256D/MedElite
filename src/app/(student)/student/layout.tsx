import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/nav/dashboard-shell";
import { isAdminRole, roleLabels } from "@/modules/auth/permissions";
import { getCurrentSession, getRoleHome } from "@/modules/auth/service";

const navigation = [
  { href: "/student/dashboard", label: "Dashboard" },
  { href: "/student/courses", label: "My courses" },
  { href: "/student/account", label: "Account" },
  { href: "/student/sessions", label: "Sessions & devices" },
];

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "STUDENT" && !isAdminRole(session.user.role)) {
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
