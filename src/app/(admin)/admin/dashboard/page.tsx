import { AlertTriangle, Database, PlayCircle, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
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
      <Card className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Recent audit activity</h2>
        <div className="space-y-3">
          {data.recentAuditLogs.map((log) => (
            <div key={log.id} className="rounded-[24px] bg-[var(--color-surface)] p-4">
              <p className="font-semibold text-[var(--color-text)]">{log.action}</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{log.message}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">{log.createdAt.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
