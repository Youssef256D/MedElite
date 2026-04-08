import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Clock3, User } from "lucide-react";

import { EnrollmentForm } from "@/components/course/enrollment-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDuration } from "@/lib/utils";
import { getCurrentSession } from "@/modules/auth/service";
import {
  getCourseAccessTypeLabel,
  getStudentYearLabel,
} from "@/modules/courses/constants";
import { getStudentCourseBySlug } from "@/modules/courses/service";
import { getManualPaymentSettings } from "@/modules/site-settings/service";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getCurrentSession();
  const [course, paymentSettings] = await Promise.all([
    getStudentCourseBySlug({
      slug,
      viewerId: session?.user.id,
      viewerRole: session?.user.role ?? null,
      studentYear: session?.user.studentYear ?? null,
    }),
    getManualPaymentSettings(),
  ]);

  if (!course) {
    notFound();
  }

  const instructorName = course.instructor
    ? `${course.instructor.firstName} ${course.instructor.lastName}`
    : "Unknown instructor";
  const firstLesson =
    course.modules?.flatMap((module) => module.lessons).find((lesson) => lesson.status === "PUBLISHED") ?? null;
  const lessonCount = course._count?.lessons ?? 0;
  const videoCount = course._stats?.videos ?? 0;
  const averageVideoDuration = course._stats?.averageVideoDurationSeconds ?? null;
  const isStudentViewer = session?.user.role === "STUDENT";
  const hasActiveEnrollment =
    course.viewerEnrollment?.status === "ACTIVE" || course.viewerEnrollment?.status === "COMPLETED";

  return (
    <div className="space-y-8">
      <Link
        href="/student/dashboard"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand">{getStudentYearLabel(course.targetStudentYear)}</Badge>
              <Badge>{getCourseAccessTypeLabel(course.accessType)}</Badge>
              {course.viewerEnrollment?.status === "PENDING" ? <Badge tone="warning">Pending review</Badge> : null}
              {course.viewerEnrollment?.status === "REJECTED" ? <Badge tone="danger">Payment rejected</Badge> : null}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text)]">{course.title}</h1>
            <p className="text-sm leading-7 text-[var(--color-text-muted)]">{course.shortDescription}</p>
          </div>

          {course.description ? (
            <Card className="space-y-3">
              <h2 className="text-xl font-semibold text-[var(--color-text)]">About this course</h2>
              <p className="text-sm leading-8 text-[var(--color-text-muted)]">{course.description}</p>
            </Card>
          ) : null}

          {course.modules && course.modules.length > 0 ? (
            <Card className="space-y-4">
              <h2 className="text-xl font-semibold text-[var(--color-text)]">Course content</h2>
              <div className="space-y-2">
                {course.modules.map((mod: { id: string; title: string; lessons?: { id: string; title: string }[] }, index: number) => (
                  <div key={mod.id} className="rounded-2xl bg-[var(--color-surface)] p-4">
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      {index + 1}. {mod.title}
                    </p>
                    {mod.lessons && mod.lessons.length > 0 ? (
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {mod.lessons.length} {mod.lessons.length === 1 ? "lesson" : "lessons"}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="lg:sticky lg:top-8 h-fit space-y-4">
          <Card className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                <User className="h-4 w-4" />
                <span>{instructorName}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                <BookOpen className="h-4 w-4" />
                <span>{lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                <BookOpen className="h-4 w-4" />
                <span>{videoCount} {videoCount === 1 ? "video" : "videos"}</span>
              </div>
              {averageVideoDuration ? (
                <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                  <Clock3 className="h-4 w-4" />
                  <span>Average video length: {formatDuration(averageVideoDuration)}</span>
                </div>
              ) : null}
              <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                <Clock3 className="h-4 w-4" />
                <span>
                  {course.accessType === "FREE"
                    ? "Free"
                    : course.priceCents && course.priceCents > 0
                      ? formatCurrency(course.priceCents, paymentSettings.currency)
                      : "Price pending admin setup"}
                </span>
              </div>
            </div>

            {hasActiveEnrollment && firstLesson ? (
              <Link href={`/learn/${course.slug}/${firstLesson.slug}`} className="block">
                <Button className="w-full" size="lg">
                  Start learning
                </Button>
              </Link>
            ) : isStudentViewer ? (
              <EnrollmentForm
                courseId={course.id}
                accessType={course.accessType}
                priceCents={course.priceCents}
                currentStatus={course.viewerEnrollment?.status ?? null}
                reviewNotes={course.viewerEnrollment?.reviewNotes ?? null}
                paymentSettings={paymentSettings}
              />
            ) : (
              <div className="rounded-2xl bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]">
                Student enrollment actions are available from a student account.
              </div>
            )}

            {course.viewerEnrollment?.status === "PENDING" ? (
              <div className="rounded-2xl bg-[#fff1de] p-4 text-sm text-[#8d5c10]">
                Your payment proof has been submitted and is waiting for admin approval.
              </div>
            ) : null}

            {course.viewerEnrollment?.status === "REJECTED" && course.viewerEnrollment.reviewNotes ? (
              <div className="rounded-2xl bg-[#fee7e7] p-4 text-sm text-[#8f2d2d]">
                {course.viewerEnrollment.reviewNotes}
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
