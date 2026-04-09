import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { FocusModal } from "@/components/ui/focus-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { getCurrentSession } from "@/modules/auth/service";
import {
  courseAccessTypeOptions,
  getCourseAccessTypeLabel,
  getStudentYearLabel,
  studentYearOptions,
} from "@/modules/courses/constants";
import {
  archiveCourseAction,
  createModuleAction,
  createResourceAction,
  duplicateCourseAction,
  publishCourseAction,
  saveCourseAction,
  saveLessonAction,
} from "@/modules/courses/actions";
import { getInstructorCourseBuilder } from "@/modules/courses/service";

export default async function InstructorCourseBuilderPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }

  const { courseId } = await params;
  const course = await getInstructorCourseBuilder(courseId, session.user.id);

  if (!course) {
    notFound();
  }

  const lessonOptions = (course.modules ?? []).flatMap((module: NonNullable<typeof course.modules>[number]) =>
    module.lessons.map((lesson: (typeof module.lessons)[number]) => ({
      id: lesson.id,
      title: lesson.title,
      courseTitle: course.title,
      courseId: course.id,
    })),
  );

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Course builder"
        title={course.title}
        description="Use one focused window at a time to update the course, add topics, add lessons, and upload videos without extra clutter."
      />

      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-brand)]">
            {course.status}
          </span>
          <span className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            {getStudentYearLabel(course.targetStudentYear)}
          </span>
          <span className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            {getCourseAccessTypeLabel(course.accessType)}
          </span>
        </div>
        <p className="text-sm leading-7 text-[var(--color-text-muted)]">
          {course.accessType === "FREE"
            ? "This course will become free for students once an admin approves it."
            : course.priceCents && course.priceCents > 0
              ? `Current approved price: ${formatCurrency(course.priceCents)}`
              : "Admins will set the final course price before students can see it."}
        </p>
        {course.reviewNotes ? (
          <p className="rounded-2xl bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
            Admin notes: {course.reviewNotes}
          </p>
        ) : null}
      </Card>

      <div className="flex flex-wrap gap-3">
        <FocusModal
          triggerLabel="Edit course details"
          title="Course details"
          description="Keep the main page clean and edit the course metadata in one focused step."
        >
          <form action={saveCourseAction} className="space-y-4">
            <input type="hidden" name="courseId" value={course.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="title" defaultValue={course.title} required />
              <select
                name="targetStudentYear"
                defaultValue={course.targetStudentYear}
                className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)]"
              >
                {studentYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {getStudentYearLabel(year)}
                  </option>
                ))}
              </select>
            </div>
            <Input name="subtitle" defaultValue={course.subtitle ?? ""} />
            <Textarea name="shortDescription" defaultValue={course.shortDescription} required />
            <Textarea name="description" defaultValue={course.description} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <select
                name="accessType"
                defaultValue={course.accessType}
                className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)]"
              >
                {courseAccessTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {getCourseAccessTypeLabel(type)}
                  </option>
                ))}
              </select>
              <div className="rounded-2xl bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
                Pricing is controlled only by admins.
              </div>
            </div>
            <Button type="submit">Save course</Button>
          </form>
        </FocusModal>

        <FocusModal
          triggerLabel="Add topic"
          title="Add a topic"
          description="Topics help organize the curriculum before you start adding lessons."
        >
          <form action={createModuleAction} className="space-y-4">
            <input type="hidden" name="courseId" value={course.id} />
            <Input name="title" placeholder="Topic title" required />
            <Textarea name="description" placeholder="Optional description for this topic" />
            <Button type="submit">Create topic</Button>
          </form>
        </FocusModal>

        <FocusModal
          triggerLabel="Add lesson"
          title="Add a lesson"
          description="Create the lesson shell here, or use the upload center to create it automatically while uploading the video."
        >
          {course.modules && course.modules.length > 0 ? (
            <form action={saveLessonAction} className="space-y-4">
              <input type="hidden" name="courseId" value={course.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  name="moduleId"
                  className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)]"
                >
                  {(course.modules ?? []).map((module: NonNullable<typeof course.modules>[number]) => (
                    <option key={module.id} value={module.id}>
                      {module.title}
                    </option>
                  ))}
                </select>
                <Input
                  name="position"
                  type="number"
                  min={1}
                  defaultValue={(course._count.lessons ?? 0) + 1}
                  required
                />
              </div>
              <Input name="title" placeholder="Lesson title" required />
              <Textarea name="summary" placeholder="Short summary for the lesson" required />
              <Textarea name="content" placeholder="Optional lesson notes" />
              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  name="visibility"
                  className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)]"
                  defaultValue="PREMIUM"
                >
                  <option value="PREVIEW">Preview</option>
                  <option value="PREMIUM">Full lesson</option>
                </select>
                <select
                  name="status"
                  className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)]"
                  defaultValue="PUBLISHED"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <Button type="submit">Save lesson</Button>
            </form>
          ) : (
            <p className="text-sm leading-7 text-[var(--color-text-muted)]">
              Create at least one topic first, then come back here to add lessons inside it.
            </p>
          )}
        </FocusModal>

        <FocusModal
          triggerLabel="Add resource"
          title="Add a resource"
          description="Attach a helpful link to the whole course or to one specific lesson."
        >
          <form action={createResourceAction} className="space-y-4">
            <input type="hidden" name="courseId" value={course.id} />
            <select
              name="lessonId"
              className="h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)]"
            >
              <option value="">Course-level resource</option>
              {lessonOptions.map((lesson: (typeof lessonOptions)[number]) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title}
                </option>
              ))}
            </select>
            <Input name="title" placeholder="Resource title" required />
            <Input name="externalUrl" placeholder="https://..." type="url" required />
            <Textarea name="description" placeholder="Optional description" />
            <Button type="submit">Save resource</Button>
          </form>
        </FocusModal>

        <Link href={`/instructor/uploads?courseId=${course.id}`}>
          <Button type="button" variant="secondary">
            Open upload center
          </Button>
        </Link>

        <form action={publishCourseAction.bind(null, course.id)}>
          <Button type="submit">Submit for admin review</Button>
        </form>

        <form action={duplicateCourseAction.bind(null, course.id)}>
          <Button type="submit" variant="secondary">
            Duplicate
          </Button>
        </form>

        <form action={archiveCourseAction.bind(null, course.id)}>
          <Button type="submit" variant="ghost">
            Archive
          </Button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Curriculum outline</h2>
            <p className="text-sm leading-7 text-[var(--color-text-muted)]">
              Keep the overview clean here, then use the focused windows above whenever you need to change something.
            </p>
          </div>
          {(course.modules ?? []).length > 0 ? (
            <div className="space-y-4">
              {(course.modules ?? []).map((module: NonNullable<typeof course.modules>[number], moduleIndex: number) => (
                <div key={module.id} className="rounded-[28px] bg-[var(--color-surface)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
                        Topic {moduleIndex + 1}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-[var(--color-text)]">{module.title}</h3>
                      {module.description ? (
                        <p className="mt-2 text-sm leading-7 text-[var(--color-text-muted)]">{module.description}</p>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
                      {module.lessons.length} lessons
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {module.lessons.length > 0 ? (
                      module.lessons.map((lesson: (typeof module.lessons)[number]) => (
                        <div key={lesson.id} className="rounded-[22px] bg-white p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-[var(--color-text)]">{lesson.title}</p>
                              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{lesson.summary}</p>
                            </div>
                            <div className="text-right text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
                              <p>{lesson.status}</p>
                              <p className="mt-1">{lesson.visibility === "PREVIEW" ? "Preview" : "Full lesson"}</p>
                            </div>
                          </div>
                          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
                            Video {lesson.currentVideoAsset?.status ?? "missing"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm leading-7 text-[var(--color-text-muted)]">
                        No lessons inside this topic yet.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No topics yet"
              description="Start by adding the first topic, then create lessons or jump straight into the upload center."
            />
          )}
        </Card>

        <Card className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Enrollment pipeline</h2>
          <div className="space-y-3 text-sm leading-7 text-[var(--color-text-muted)]">
            <p>
              Topics: {(course.modules ?? []).length}
            </p>
            <p>
              Lessons: {course._count.lessons}
            </p>
            <p>
              Approved learners: {course._count.enrollments}
            </p>
            <p>
              Waiting for admin payment review: {course._enrollmentSummary.pending}
            </p>
            <p>
              Rejected payment requests: {course._enrollmentSummary.rejected}
            </p>
            <p>
              Total enrollment requests: {course._enrollmentSummary.total}
            </p>
            <p>
              Students see the course price and payment instructions on the course page, upload their proof, and then admins activate access after review.
            </p>
            <p>
              Uploading a new video from the upload center will create the next numbered lesson title automatically.
            </p>
            <p>
              When the course is ready, send it for admin review so the final approval and pricing can be completed.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
