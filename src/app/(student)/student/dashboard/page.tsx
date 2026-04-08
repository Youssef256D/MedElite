import Link from "next/link";
import { BookOpen } from "lucide-react";

import { Card } from "@/components/ui/card";
import { CourseBrowser } from "@/components/course/course-browser";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCurrentSession } from "@/modules/auth/service";
import { getStudentYearLabel } from "@/modules/courses/constants";
import { getStudentDashboardData } from "@/modules/student/service";
import { getCourseCatalog } from "@/modules/courses/service";

export default async function StudentDashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  const [data, allCourses] = await Promise.all([
    getStudentDashboardData(session.user.id),
    getCourseCatalog({
      studentYear: session.user.role === "STUDENT" ? session.user.studentYear : null,
    }),
  ]);

  const continueLearning = data.progress[0];

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Overview"
        title={`Welcome back, ${session.user.firstName}`}
      />

      {continueLearning ? (
        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-brand)]">Continue learning</p>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-brand-soft)]">
              <BookOpen className="h-6 w-6 text-[var(--color-brand)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-[var(--color-text)]">{continueLearning.course?.title ?? "Course"}</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {continueLearning.lastLesson?.title ?? "Next available lesson"}
              </p>
            </div>
            {continueLearning.lastLesson ? (
              <Link
                href={`/learn/${continueLearning.course?.slug ?? ""}/${continueLearning.lastLesson.slug}`}
                className="shrink-0 rounded-2xl bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-strong)]"
              >
                Resume
              </Link>
            ) : null}
          </div>
          <ProgressBar value={continueLearning.progressPercent} />
          <p className="text-sm text-[var(--color-text-muted)]">{continueLearning.progressPercent}% complete</p>
        </Card>
      ) : null}

      <div>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">Available courses</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {session.user.role === "STUDENT"
            ? `Browse the courses available for ${getStudentYearLabel(session.user.studentYear)}.`
            : "Browse the currently published course catalog."}
        </p>
        <div className="mt-5">
          <CourseBrowser courses={allCourses} />
        </div>
      </div>
    </div>
  );
}
