import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getAdminDashboardData, getAdminCourses } from "@/modules/admin/service";

export default async function AdminAnalyticsPage() {
  const [dashboard, courses] = await Promise.all([
    getAdminDashboardData(),
    getAdminCourses(),
  ]);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Analytics"
        title="Practical platform reporting"
        description="Track moderation workload, enrollment approvals, content volume, and user posture across the platform."
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Course reviews</h2>
          <p className="text-4xl font-semibold tracking-tight text-[var(--color-brand)]">{dashboard.stats.pendingCourseReviews}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Instructor submissions currently waiting for approval.</p>
        </Card>
        <Card className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Payment reviews</h2>
          <p className="text-4xl font-semibold tracking-tight text-[var(--color-brand)]">{dashboard.stats.pendingEnrollmentReviews}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Student payment proofs waiting for admin approval.</p>
        </Card>
        <Card className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Content footprint</h2>
          <p className="text-4xl font-semibold tracking-tight text-[var(--color-brand)]">{courses.length}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Courses currently tracked across the platform.</p>
        </Card>
      </div>
    </div>
  );
}
