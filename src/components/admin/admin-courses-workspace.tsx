import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn, formatCurrency, formatDateTimeValue } from "@/lib/utils";
import {
  approveCourseAction,
  approveEnrollmentAction,
  rejectEnrollmentAction,
  requestCourseChangesAction,
} from "@/modules/admin/actions";
import { getAdminCourses, getAdminEnrollments } from "@/modules/admin/service";
import {
  getCourseAccessTypeLabel,
  getEnrollmentStatusLabel,
  getPaymentMethodLabel,
  getStudentYearLabel,
} from "@/modules/courses/constants";

const courseTabs = [
  { href: "/admin/courses/all", label: "All courses", view: "ALL_COURSES" },
  { href: "/admin/courses/course-approvals", label: "Course approvals", view: "COURSE_APPROVALS" },
  { href: "/admin/courses/payments", label: "Payments", view: "PAYMENTS" },
  { href: "/admin/courses/payment-approvals", label: "Payment approvals", view: "PAYMENT_APPROVALS" },
] as const;

type CoursesWorkspaceView = (typeof courseTabs)[number]["view"];

const workspaceCopy: Record<
  CoursesWorkspaceView,
  { title: string; description: string; emptyTitle: string; emptyDescription: string }
> = {
  ALL_COURSES: {
    title: "All courses",
    description: "Review the full course catalog, pricing status, and enrollment activity from one cleaner workspace.",
    emptyTitle: "No courses published yet",
    emptyDescription: "Instructor submissions and approved courses will appear here once they are created.",
  },
  COURSE_APPROVALS: {
    title: "Course approvals",
    description: "Approve instructor submissions, set final pricing for paid courses, or return a course for revisions.",
    emptyTitle: "No courses waiting for review",
    emptyDescription: "New instructor submissions will appear here as soon as they are sent for approval.",
  },
  PAYMENTS: {
    title: "Payments",
    description: "Track uploaded payment proofs and review the full payment history for paid enrollments.",
    emptyTitle: "No payment records yet",
    emptyDescription: "Paid enrollment requests will appear here once students start uploading payment proofs.",
  },
  PAYMENT_APPROVALS: {
    title: "Payment approvals",
    description: "Approve or reject pending payment proofs before paid enrollments become active.",
    emptyTitle: "No payment proofs waiting",
    emptyDescription: "Paid course enrollment requests will appear here once students upload their proofs.",
  },
};

function CourseSummaryCard({
  course,
}: {
  course: Awaited<ReturnType<typeof getAdminCourses>>[number];
}) {
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
}

function CourseApprovalCard({
  course,
}: {
  course: Awaited<ReturnType<typeof getAdminCourses>>[number];
}) {
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
        <span className="text-sm font-semibold text-[var(--color-text-muted)]">Review from this panel</span>
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
}

function PaymentApprovalCard({
  request,
}: {
  request: Awaited<ReturnType<typeof getAdminEnrollments>>[number];
}) {
  return (
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
          <p className="text-sm text-[var(--color-text-muted)]">
            Approving this proof activates the student&apos;s enrollment in the course immediately.
          </p>
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
  );
}

function PaymentCard({
  enrollment,
}: {
  enrollment: Awaited<ReturnType<typeof getAdminEnrollments>>[number];
}) {
  return (
    <Card key={enrollment.id} className="space-y-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
            {enrollment.course?.title ?? "Course"}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {enrollment.user?.firstName ?? "Student"} {enrollment.user?.lastName ?? ""} · {enrollment.user?.email ?? "Unknown email"}
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {getPaymentMethodLabel(enrollment.paymentMethod)} · {getEnrollmentStatusLabel(enrollment.status)}
          </p>
        </div>
        <div className="text-sm text-[var(--color-text-muted)] xl:text-right">
          <p>Submitted {formatDateTimeValue(enrollment.paymentSubmittedAt) ?? "Not submitted yet"}</p>
          <p>Reviewed {formatDateTimeValue(enrollment.reviewedAt) ?? "Not reviewed yet"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--color-text-muted)]">
        <div className="space-y-1">
          <p>
            Final price: {enrollment.course?.priceCents ? formatCurrency(enrollment.course.priceCents) : "Free"}
          </p>
          <p>
            Reviewed by: {enrollment.reviewedBy ? `${enrollment.reviewedBy.firstName} ${enrollment.reviewedBy.lastName}` : "Awaiting review"}
          </p>
          {enrollment.reviewNotes ? <p>Note: {enrollment.reviewNotes}</p> : null}
        </div>
        {enrollment.paymentScreenshotStorageKey ? (
          <Link
            href={`/api/enrollment-requests/${enrollment.id}/proof`}
            className="text-sm font-semibold text-[var(--color-brand)]"
            target="_blank"
          >
            View proof
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

export async function AdminCoursesWorkspace({ viewFilter }: { viewFilter: CoursesWorkspaceView }) {
  const copy = workspaceCopy[viewFilter];

  const courses =
    viewFilter === "ALL_COURSES" || viewFilter === "COURSE_APPROVALS"
      ? await getAdminCourses()
      : [];
  const enrollments =
    viewFilter === "PAYMENTS"
      ? await getAdminEnrollments({ paymentOnly: true })
      : viewFilter === "PAYMENT_APPROVALS"
        ? await getAdminEnrollments({ paymentOnly: true, statuses: ["PENDING"] })
        : [];

  const pendingCourses = viewFilter === "COURSE_APPROVALS" ? courses.filter((course) => course.status === "REVIEW") : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading eyebrow="Courses" title={copy.title} description={copy.description} />
        {viewFilter === "PAYMENTS" ? (
          <form action="/api/admin/payments/export" method="get">
            <Button type="submit" variant="secondary">
              Download spreadsheet
            </Button>
          </form>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {courseTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-200",
              tab.view === viewFilter
                ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {viewFilter === "ALL_COURSES" ? (
        courses.length === 0 ? (
          <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <CourseSummaryCard key={course.id} course={course} />
            ))}
          </div>
        )
      ) : null}

      {viewFilter === "COURSE_APPROVALS" ? (
        pendingCourses.length === 0 ? (
          <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
        ) : (
          <div className="space-y-4">
            {pendingCourses.map((course) => (
              <CourseApprovalCard key={course.id} course={course} />
            ))}
          </div>
        )
      ) : null}

      {viewFilter === "PAYMENTS" ? (
        enrollments.length === 0 ? (
          <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
        ) : (
          <div className="space-y-4">
            {enrollments.map((enrollment) => (
              <PaymentCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </div>
        )
      ) : null}

      {viewFilter === "PAYMENT_APPROVALS" ? (
        enrollments.length === 0 ? (
          <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
        ) : (
          <div className="space-y-4">
            {enrollments.map((enrollment) => (
              <PaymentApprovalCard key={enrollment.id} request={enrollment} />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
