import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/nav/dashboard-shell";
import { isAdminRole, roleLabels } from "@/modules/auth/permissions";
import { getCurrentSession, getRoleHome } from "@/modules/auth/service";

const navigation = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/instructors", label: "Instructors" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/uploads", label: "Uploads" },
  { href: "/admin/access", label: "Access control" },
  { href: "/admin/logs", label: "Audit logs" },
  { href: "/admin/suspicious", label: "Suspicious activity" },
  { href: "/admin/settings", label: "Site settings" },
  { href: "/admin/analytics", label: "Analytics" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (!isAdminRole(session.user.role)) {
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
