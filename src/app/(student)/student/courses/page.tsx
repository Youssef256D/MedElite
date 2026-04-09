import Link from "next/link";
import { BookOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeading } from "@/components/ui/section-heading";
import { getEnrollmentStatusLabel } from "@/modules/courses/constants";
import { getCurrentSession } from "@/modules/auth/service";
import { getStudentDashboardData } from "@/modules/student/service";

export default async function StudentCoursesPage() {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  const data = await getStudentDashboardData(session.user.id);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="My courses"
        title="Enrolled courses"
        description="All courses you have enrolled in or requested access to."
      />
      {data.enrollments.length === 0 ? (
        <EmptyState title="No courses yet" description="Once you enrol in a course, it will show up here." />
      ) : (
        <div className="space-y-4">
          {data.enrollments.map((enrollment) => {
            const instructorName = enrollment.course?.instructor
              ? `${enrollment.course.instructor.firstName} ${enrollment.course.instructor.lastName}`
              : "Unknown instructor";
            const canOpenCourse = enrollment.status === "ACTIVE" || enrollment.status === "COMPLETED";
            const destination = canOpenCourse
              ? enrollment.lastLesson
                ? `/learn/${enrollment.course?.slug ?? ""}/${enrollment.lastLesson.slug}`
                : enrollment.course
                  ? `/student/course/${enrollment.course.slug}`
                  : "#"
              : enrollment.course
                ? `/student/course/${enrollment.course.slug}`
                : "#";
            const card = (
              <Card className="group flex items-center gap-5 transition-all duration-200 hover:shadow-lg hover:scale-[1.01]">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-brand-soft)] transition-colors group-hover:bg-[var(--color-brand)] group-hover:text-white">
                  <BookOpen className="h-6 w-6 text-[var(--color-brand)] group-hover:text-white" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-[var(--color-text)] group-hover:text-[var(--color-brand)] transition-colors">
                    {enrollment.course?.title ?? "Course"}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                    {instructorName}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={canOpenCourse ? "success" : enrollment.status === "REJECTED" ? "danger" : "warning"}>
                      {getEnrollmentStatusLabel(enrollment.status)}
                    </Badge>
                    {enrollment.reviewNotes ? <Badge>{enrollment.reviewNotes}</Badge> : null}
                  </div>
                </div>

                <div className="w-32 shrink-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-muted)]">Progress</span>
                    <span className="font-semibold text-[var(--color-brand)]">{enrollment.progressPercent}%</span>
                  </div>
                  <ProgressBar className="mt-2" value={enrollment.progressPercent} />
                </div>
              </Card>
            );

            return (
              destination !== "#" ? (
                <Link
                  key={enrollment.id}
                  href={destination}
                  className="block"
                >
                  {card}
                </Link>
              ) : (
                <div key={enrollment.id} className="block">
                  {card}
                </div>
              )
            );
          })}
        </div>
      )}
    </div>
  );
}
