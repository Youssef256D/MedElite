import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatCurrency, formatDateTimeValue } from "@/lib/utils";
import {
  approveCourseAction,
  approveEnrollmentAction,
  rejectEnrollmentAction,
  requestCourseChangesAction,
} from "@/modules/admin/actions";
import { getAdminCourses, getAdminEnrollmentRequests } from "@/modules/admin/service";
import {
  getCourseAccessTypeLabel,
  getPaymentMethodLabel,
  getStudentYearLabel,
} from "@/modules/courses/constants";

export default async function AdminCoursesPage() {
  const [courses, enrollmentRequests] = await Promise.all([
    getAdminCourses(),
    getAdminEnrollmentRequests(),
  ]);
  const pendingCourses = courses.filter((course) => course.status === "REVIEW");

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Courses"
        title="Course moderation, pricing, and payment approvals"
        description="Approve new courses, set prices for paid offerings, and review payment proofs before enrollment becomes active."
      />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Pending course approvals</h2>
        {pendingCourses.length === 0 ? (
          <EmptyState title="No courses waiting for review" description="New instructor submissions will appear here as soon as they are sent for approval." />
        ) : (
          <div className="space-y-4">
            {pendingCourses.map((course) => {
              const instructor = course.instructor as
                | { firstName?: string; lastName?: string }
                | null
                | undefined;

              return (
                <Card key={course.id} className="space-y-4">
                  <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">{course.title}</h3>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        {instructor?.firstName ?? "Unknown"} {instructor?.lastName ?? "Instructor"} · {getStudentYearLabel(course.targetStudentYear)} ·{" "}
                        {getCourseAccessTypeLabel(course.accessType)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        {course._count.lessons} lessons · {course._count.enrollments} active learners
                      </p>
                      {course.reviewNotes ? (
                        <p className="mt-2 text-sm text-[var(--color-text-muted)]">Latest note: {course.reviewNotes}</p>
                      ) : null}
                    </div>
                    <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                      Review from this panel
                    </span>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <form action={approveCourseAction} className="space-y-4 rounded-[24px] bg-[var(--color-surface)] p-4">
                      <input type="hidden" name="courseId" value={course.id} />
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text)]">Approve and publish</p>
                        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                          {course.accessType === "FREE"
                            ? "Free courses will publish at 0 EGP."
                            : "Set the final course price before students can enroll."}
                        </p>
                      </div>
                      <label className="block text-sm font-semibold text-[var(--color-text)]">
                        Price (EGP)
                        <input
                          name="priceAmount"
                          type="number"
                          min={0}
                          step="0.01"
                          defaultValue={course.accessType === "FREE" ? 0 : course.priceCents ? course.priceCents / 100 : undefined}
                          className="mt-2 h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)]"
                          required={course.accessType === "PAID"}
                        />
                      </label>
                      <label className="block text-sm font-semibold text-[var(--color-text)]">
                        Approval note
                        <textarea
                          name="reviewNotes"
                          defaultValue={course.reviewNotes ?? ""}
                          className="mt-2 min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)]"
                          placeholder="Optional note for the instructor"
                        />
                      </label>
                      <Button type="submit">Approve course</Button>
                    </form>

                    <form action={requestCourseChangesAction} className="space-y-4 rounded-[24px] bg-[var(--color-surface)] p-4">
                      <input type="hidden" name="courseId" value={course.id} />
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text)]">Send back for edits</p>
                        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                          This returns the course to draft so the instructor can revise and resubmit it.
                        </p>
                      </div>
                      <label className="block text-sm font-semibold text-[var(--color-text)]">
                        Revision note
                        <textarea
                          name="reviewNotes"
                          className="mt-2 min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)]"
                          placeholder="Tell the instructor what needs to change"
                          required
                        />
                      </label>
                      <Button type="submit" variant="secondary">Request changes</Button>
                    </form>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Pending payment approvals</h2>
        {enrollmentRequests.length === 0 ? (
          <EmptyState title="No payment proofs waiting" description="Paid course enrollment requests will appear here once students upload their proofs." />
        ) : (
          <div className="space-y-4">
            {enrollmentRequests.map((request) => (
              <Card key={request.id} className="space-y-4">
                <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                      {request.course?.title ?? "Course"}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {request.user?.firstName ?? "Student"} {request.user?.lastName ?? ""} · {request.user?.email ?? "Unknown email"}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {getPaymentMethodLabel(request.paymentMethod)} · Submitted {formatDateTimeValue(request.paymentSubmittedAt) ?? "Recently"}
                    </p>
                    {request.course?.priceCents != null ? (
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        Final course price: {request.course.priceCents > 0 ? formatCurrency(request.course.priceCents) : "Free"}
                      </p>
                    ) : null}
                  </div>
                  {request.paymentScreenshotStorageKey ? (
                    <Link
                      href={`/api/enrollment-requests/${request.id}/proof`}
                      className="text-sm font-semibold text-[var(--color-brand)]"
                      target="_blank"
                    >
                      View payment proof
                    </Link>
                  ) : null}
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <form action={approveEnrollmentAction} className="space-y-4 rounded-[24px] bg-[var(--color-surface)] p-4">
                    <input type="hidden" name="enrollmentId" value={request.id} />
                    <label className="block text-sm font-semibold text-[var(--color-text)]">
                      Approval note
                      <textarea
                        name="reviewNotes"
                        defaultValue={request.reviewNotes ?? ""}
                        className="mt-2 min-h-24 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)]"
                        placeholder="Optional note for the student"
                      />
                    </label>
                    <Button type="submit">Approve enrollment</Button>
                  </form>

                  <form action={rejectEnrollmentAction} className="space-y-4 rounded-[24px] bg-[var(--color-surface)] p-4">
                    <input type="hidden" name="enrollmentId" value={request.id} />
                    <label className="block text-sm font-semibold text-[var(--color-text)]">
                      Rejection note
                      <textarea
                        name="reviewNotes"
                        className="mt-2 min-h-24 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)]"
                        placeholder="Explain what the student should fix before resubmitting"
                        required
                      />
                    </label>
                    <Button type="submit" variant="secondary">Reject request</Button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">All courses</h2>
        <div className="space-y-4">
          {courses.map((course) => {
            const instructor = course.instructor as
              | { firstName?: string; lastName?: string }
              | null
              | undefined;

            return (
              <Card key={course.id} className="space-y-2">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">{course.title}</h3>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {instructor?.firstName ?? "Unknown"} {instructor?.lastName ?? "Instructor"} · {getStudentYearLabel(course.targetStudentYear)} ·{" "}
                      {getCourseAccessTypeLabel(course.accessType)}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {course.status} · {course._count.lessons} lessons · {course._count.enrollments} enrollments
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
