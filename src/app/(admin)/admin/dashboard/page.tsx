import { AlertTriangle, Database, PlayCircle, Users } from "lucide-react";

import { SectionHeading } from "@/components/ui/section-heading";
import { StatCard } from "@/components/ui/stat-card";
import { getAdminDashboardData } from "@/modules/admin/service";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Operations"
        title="Platform health and control posture"
        description="Use the admin console to keep access, uploads, moderation, and content operations visible and actionable."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={String(data.stats.usersCount)} detail="Total accounts on the platform." icon={<Users className="h-5 w-5" />} />
        <StatCard label="Instructors" value={String(data.stats.instructorsCount)} detail="Doctors and educators with studio access." icon={<Database className="h-5 w-5" />} />
        <StatCard label="Course reviews" value={String(data.stats.pendingCourseReviews)} detail="Courses waiting for admin approval." icon={<PlayCircle className="h-5 w-5" />} />
        <StatCard label="Payment reviews" value={String(data.stats.pendingEnrollmentReviews)} detail="Enrollment proofs waiting for approval." icon={<AlertTriangle className="h-5 w-5" />} />
      </div>
    </div>
  );
}
