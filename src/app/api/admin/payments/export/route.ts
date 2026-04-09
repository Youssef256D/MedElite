import { handleRouteError } from "@/lib/http";
import { env } from "@/lib/env";
import { requireRoles } from "@/modules/auth/service";
import { recordAuditLogFromRequest } from "@/modules/audit/service";
import { getAdminEnrollments } from "@/modules/admin/service";
import {
  getCourseAccessTypeLabel,
  getEnrollmentStatusLabel,
  getPaymentMethodLabel,
  getStudentYearLabel,
} from "@/modules/courses/constants";

function escapeCsvValue(value: string | number | null | undefined) {
  if (value == null) {
    return "";
  }

  const stringValue = String(value);
  const escapedValue = stringValue.replaceAll("\"", "\"\"");
  return `"${escapedValue}"`;
}

function formatAmount(cents?: number | null) {
  if (cents == null) {
    return "";
  }

  return (cents / 100).toFixed(2);
}

function toIsoString(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

export async function GET() {
  try {
    const admin = await requireRoles(["ADMIN"]);
    const enrollments = await getAdminEnrollments({ paymentOnly: true });

    const headerRow = [
      "Enrollment ID",
      "Course ID",
      "Course Title",
      "Course Status",
      "Course Access Type",
      "Course Price EGP",
      "Student ID",
      "Student Name",
      "Student Email",
      "Student Year",
      "Payment Method",
      "Enrollment Status",
      "Payment Submitted At",
      "Reviewed At",
      "Reviewed By",
      "Review Notes",
      "Payment Proof URL",
      "Started At",
      "Completed At",
      "Created At",
      "Updated At",
    ];

    const rows = enrollments.map((enrollment) => {
      const studentName = [enrollment.user?.firstName, enrollment.user?.lastName].filter(Boolean).join(" ");
      const reviewerName = enrollment.reviewedBy
        ? [enrollment.reviewedBy.firstName, enrollment.reviewedBy.lastName].filter(Boolean).join(" ")
        : "";
      const proofUrl = enrollment.paymentScreenshotStorageKey
        ? `${env.NEXT_PUBLIC_APP_URL}/api/enrollment-requests/${enrollment.id}/proof`
        : "";

      return [
        enrollment.id,
        enrollment.courseId,
        enrollment.course?.title ?? "",
        enrollment.course?.status ?? "",
        getCourseAccessTypeLabel(enrollment.course?.accessType),
        formatAmount(enrollment.course?.priceCents),
        enrollment.userId,
        studentName,
        enrollment.user?.email ?? "",
        getStudentYearLabel(enrollment.user?.studentYear),
        getPaymentMethodLabel(enrollment.paymentMethod),
        getEnrollmentStatusLabel(enrollment.status),
        toIsoString(enrollment.paymentSubmittedAt),
        toIsoString(enrollment.reviewedAt),
        reviewerName,
        enrollment.reviewNotes ?? "",
        proofUrl,
        toIsoString(enrollment.startedAt),
        toIsoString(enrollment.completedAt),
        toIsoString(enrollment.createdAt),
        toIsoString(enrollment.updatedAt),
      ];
    });

    const csv = [headerRow, ...rows]
      .map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
      .join("\n");

    await recordAuditLogFromRequest({
      actorUserId: admin.id,
      entityType: "PaymentExport",
      entityId: admin.id,
      action: "payments.exported",
      message: "An admin exported the payment report spreadsheet.",
      metadata: {
        rowsExported: rows.length,
      },
    });

    const exportedAt = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="medelite-payment-report-${exportedAt}.csv"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
