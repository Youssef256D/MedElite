import Link from "next/link";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { getCurrentSession } from "@/modules/auth/service";
import {
  courseAccessTypeOptions,
  getCourseAccessTypeLabel,
  getStudentYearLabel,
  studentYearOptions,
} from "@/modules/courses/constants";
import { saveCourseAction } from "@/modules/courses/actions";
import { getInstructorCourses } from "@/modules/courses/service";

export default async function InstructorCoursesPage() {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  const courses = await getInstructorCourses(session.user.id);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Courses"
        title="Build and manage your teaching library"
        description="Create draft courses, then open a cleaner builder with focused pop-up windows for the editing steps."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Card className="space-y-5">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Create a new course</h2>
          <form action={saveCourseAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="title" placeholder="Course title" required />
              <select name="targetStudentYear" className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)]" defaultValue="YEAR_1" required>
                {studentYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {getStudentYearLabel(year)}
                  </option>
                ))}
              </select>
            </div>
            <Input name="subtitle" placeholder="Short subtitle" />
            <Textarea name="shortDescription" placeholder="Short description for the course card" required />
            <Textarea name="description" placeholder="Full course description" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <select name="accessType" className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)]" defaultValue="PAID">
                {courseAccessTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {getCourseAccessTypeLabel(type)}
                  </option>
                ))}
              </select>
              <div className="rounded-2xl bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
                Admins approve the course and set the final price before students can see it.
              </div>
            </div>
            <Button type="submit">Create draft</Button>
          </form>
        </Card>
        <Card className="space-y-5">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Your current courses</h2>
          {courses.length === 0 ? (
            <EmptyState title="No course drafts yet" description="Start with a course shell, then open the builder to add topics, lessons, resources, and videos." />
          ) : (
            <div className="space-y-3">
              {courses.map((course) => (
                <div key={course.id} className="rounded-[24px] bg-[var(--color-surface)] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-[var(--color-text)]">{course.title}</p>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        {course.status} · {getStudentYearLabel(course.targetStudentYear)} · {getCourseAccessTypeLabel(course.accessType)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        {course._count.lessons} lessons · {course._count.enrollments} learners ·{" "}
                        {course.accessType === "FREE"
                          ? "Free"
                          : course.priceCents && course.priceCents > 0
                            ? formatCurrency(course.priceCents)
                            : "Awaiting admin pricing"}
                      </p>
                      {course.reviewNotes ? (
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
                          Admin notes: {course.reviewNotes}
                        </p>
                      ) : null}
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
      </div>
    </div>
  );
}
