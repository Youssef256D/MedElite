import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LayoutDashboard } from "lucide-react";

import { VideoPlayer } from "@/components/lesson/video-player";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentSession } from "@/modules/auth/service";
import { getStudentLessonPageData } from "@/modules/student/service";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
}) {
  const { courseSlug, lessonSlug } = await params;
  const session = await getCurrentSession();
  const data = await getStudentLessonPageData({
    courseSlug,
    lessonSlug,
    viewerId: session?.user.id,
    viewerRole: session?.user.role ?? null,
    viewerStudentYear: session?.user.studentYear ?? null,
  });

  if (!data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-6 py-3 lg:px-8">
          <Link
            href="/student/courses"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
          >
            <ArrowLeft className="h-4 w-4" />
            My courses
          </Link>
          <span className="text-[var(--color-border)]">|</span>
          <Link
            href="/student/dashboard"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="ml-auto">
            <p className="text-sm font-semibold text-[var(--color-text)]">{data.course.title}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:px-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Badge tone="brand">{data.course.title}</Badge>
              {data.lesson.visibility === "PREVIEW" ? <Badge>Preview</Badge> : null}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text)]">{data.lesson.title}</h1>
            {data.lesson.summary ? (
              <p className="max-w-3xl text-sm leading-7 text-[var(--color-text-muted)]">{data.lesson.summary}</p>
            ) : null}
          </div>

          <VideoPlayer
            assetId={data.lesson.currentVideoAsset?.id}
            lessonId={data.lesson.id}
            courseId={data.course.id}
            status={data.lesson.currentVideoAsset?.status}
            canPlay={data.access.allowed}
            denialMessage={data.access.allowed ? undefined : data.access.message}
            initialPositionSeconds={data.progress?.lastPositionSeconds ?? 0}
            watermark={
              session
                ? {
                    fullName: `${session.user.firstName} ${session.user.lastName}`,
                    userId: session.user.id,
                  }
                : null
            }
          />

          {data.lesson.content ? (
            <Card className="space-y-3">
              <h2 className="text-xl font-semibold text-[var(--color-text)]">Lesson notes</h2>
              <p className="text-sm leading-8 text-[var(--color-text-muted)]">{data.lesson.content}</p>
            </Card>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            {data.previousLesson ? (
              <Link
                href={`/learn/${data.course.slug}/${data.previousLesson.slug}`}
                className="rounded-xl bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-brand)] transition hover:bg-[var(--color-brand-soft)]"
              >
                Previous lesson
              </Link>
            ) : <span />}
            {data.nextLesson ? (
              <Link
                href={`/learn/${data.course.slug}/${data.nextLesson.slug}`}
                className="rounded-xl bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-strong)]"
              >
                Next lesson
              </Link>
            ) : null}
          </div>
        </div>

        <Card className="h-fit space-y-4 xl:sticky xl:top-20">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Course lessons</h2>
          <div className="space-y-2">
            {data.lessons.map((lesson, index) => (
              <Link
                key={lesson.id}
                href={`/learn/${data.course.slug}/${lesson.slug}`}
                className={`block rounded-2xl p-3 transition ${lesson.id === data.lesson.id ? "bg-[var(--color-brand-soft)]" : "bg-[var(--color-surface)] hover:bg-[var(--color-brand-soft)]/50"}`}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-semibold text-[var(--color-text-muted)]">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${lesson.id === data.lesson.id ? "text-[var(--color-brand)]" : "text-[var(--color-text)]"}`}>
                      {lesson.title}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
