import type { ReactNode } from "react";
import type { Metadata } from "next";

import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/nav/dashboard-shell";
import { createNoIndexMetadata } from "@/lib/seo";
import { isAdminRole, roleLabels } from "@/modules/auth/permissions";
import { getCurrentSession, getRoleHome } from "@/modules/auth/service";

export const metadata: Metadata = createNoIndexMetadata("Admin Console");

const navigation = [
  { href: "/admin/dashboard", label: "Dashboard" },
  {
    label: "Users",
    children: [
      { href: "/admin/users/students", label: "Students" },
      { href: "/admin/users/instructors", label: "Instructors" },
      { href: "/admin/users/admins", label: "Admins" },
    ],
  },
  {
    label: "Courses",
    children: [
      { href: "/admin/courses/all", label: "All courses" },
      { href: "/admin/courses/course-approvals", label: "Course approvals" },
      { href: "/admin/courses/payments", label: "Payments" },
      { href: "/admin/courses/payment-approvals", label: "Payment approvals" },
    ],
  },
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
