import { redirect } from "next/navigation";

import { getCurrentSession } from "@/modules/auth/service";

export default async function InstructorAnnouncementsPage() {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  if (session.user.role === "INSTRUCTOR") {
    redirect("/instructor/dashboard");
  }

  redirect("/admin/announcements");
}
