import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCurrentSession } from "@/modules/auth/service";
import { getInstructorDashboardData } from "@/modules/courses/service";

export default async function InstructorAnalyticsPage() {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }

  const data = await getInstructorDashboardData(session.user.id);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Analytics"
        title="Enrollment and content performance"
        description="This MVP focuses on actionable snapshots: enrollments, upload throughput, and recent course traction."
      />
      {data.courses.length === 0 ? (
        <EmptyState title="Not enough activity yet" description="Analytics will populate once learners enroll and lessons begin receiving watch activity." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {data.courses.map((course) => (
            <Card key={course.id} className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">{course.title}</h2>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    {course.status} · {course._count.lessons} lessons
                  </p>
                </div>
                <p className="text-sm font-semibold text-[var(--color-brand)]">{course._count.enrollments} learners</p>
              </div>
              <ProgressBar value={Math.min(100, course._count.enrollments * 10)} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
