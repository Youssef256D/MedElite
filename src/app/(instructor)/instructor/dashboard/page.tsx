import Link from "next/link";
import { Activity, BookOpen, Clock3, UploadCloud, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatDateTimeValue } from "@/lib/utils";
import { getCurrentSession } from "@/modules/auth/service";
import { getCourseAccessTypeLabel, getStudentYearLabel } from "@/modules/courses/constants";
import { getInstructorDashboardData } from "@/modules/courses/service";

export default async function InstructorDashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  const data = await getInstructorDashboardData(session.user.id);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Studio overview"
        title="Creator operations at a glance"
        description="Keep an eye on drafts, review status, enrollments, uploads, and recent course activity from one simple dashboard."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total courses" value={String(data.stats.totalCourses)} detail="Drafts and published courses you manage." icon={<BookOpen className="h-5 w-5" />} />
        <StatCard label="Approved" value={String(data.stats.publishedCourses)} detail="Courses already approved and visible to students." icon={<Activity className="h-5 w-5" />} />
        <StatCard label="Active uploads" value={String(data.stats.activeUploads)} detail="Jobs currently uploading or processing." icon={<UploadCloud className="h-5 w-5" />} />
        <StatCard label="Enrollments" value={String(data.stats.totalEnrollments)} detail="Learners across your curriculum." icon={<Users className="h-5 w-5" />} />
        <StatCard label="Pending payment reviews" value={String(data.stats.pendingEnrollmentReviews)} detail="Students waiting for admin approval to unlock paid courses." icon={<Clock3 className="h-5 w-5" />} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Recent courses</h2>
          {data.courses.length === 0 ? (
            <EmptyState title="No courses created yet" description="Create your first course draft from the courses page." />
          ) : (
            <div className="space-y-3">
              {data.courses.map((course) => (
                <div key={course.id} className="rounded-[24px] bg-[var(--color-surface)] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--color-text)]">{course.title}</p>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        {course.status} · {getStudentYearLabel(course.targetStudentYear)} · {getCourseAccessTypeLabel(course.accessType)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        {course._count.lessons} lessons · {course._count.enrollments} approved learners · {course._enrollmentSummary.pending} waiting for admin review ·{" "}
                        {course.accessType === "FREE"
                          ? "Free"
                          : course.priceCents && course.priceCents > 0
                            ? formatCurrency(course.priceCents)
                            : "Awaiting admin pricing"}
                      </p>
                    </div>
                    <Link href={`/instructor/courses/${course.id}`} className="text-sm font-semibold text-[var(--color-brand)]">
                      Manage course
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <div className="space-y-6">
          <Card className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Recent upload jobs</h2>
            <div className="space-y-3">
              {data.uploads.map((upload) => (
                <div key={upload.id} className="rounded-[24px] bg-[var(--color-surface)] p-4">
                  <p className="font-semibold text-[var(--color-text)]">{upload.fileName}</p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    {upload.course?.title ?? "Unknown course"} · {upload.lesson?.title ?? "Unknown lesson"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">{upload.status}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Waiting for admin payment review</h2>
            {data.pendingEnrollmentReviews.length === 0 ? (
              <EmptyState
                title="No pending learner payments"
                description="When students submit payment proofs for your paid courses, they will appear here until admins approve them."
              />
            ) : (
              <div className="space-y-3">
                {data.pendingEnrollmentReviews.map((enrollment) => (
                  <div key={enrollment.id} className="rounded-[24px] bg-[var(--color-surface)] p-4">
                    <p className="font-semibold text-[var(--color-text)]">
                      {enrollment.user?.firstName ?? "Student"} {enrollment.user?.lastName ?? ""}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {enrollment.course?.title ?? "Course"} · Submitted {formatDateTimeValue(enrollment.paymentSubmittedAt) ?? "recently"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
                      Waiting for admin approval
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
