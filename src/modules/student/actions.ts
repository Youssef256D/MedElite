"use server";

import path from "node:path";

import { z } from "zod";

import { PaymentMethod, createId, database, maybeOne } from "@/lib/database";
import { AppError, isAppError, toErrorMessage } from "@/lib/errors";
import { storage } from "@/lib/storage";
import { slugify } from "@/lib/utils";
import { requireAuthenticatedUser } from "@/modules/auth/service";
import { recordAuditLogFromRequest } from "@/modules/audit/service";
import { revalidateEnrollmentWorkflowPaths } from "@/modules/courses/revalidation";

export type EnrollmentActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  refresh?: boolean;
};

const enrollmentSchema = z.object({
  courseId: z.string().min(1),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
});

const allowedPaymentProofTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);

function getFileExtension(file: File) {
  const extension = path.extname(file.name).toLowerCase();

  if (extension) {
    return extension;
  }

  switch (file.type) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "application/pdf":
      return ".pdf";
    default:
      return ".bin";
  }
}

async function upsertEnrollmentRecord(input: {
  enrollmentId: string;
  userId: string;
  courseId: string;
  status: "PENDING" | "ACTIVE";
  paymentMethod?: (typeof PaymentMethod)[keyof typeof PaymentMethod] | null;
  paymentScreenshotStorageKey?: string | null;
  paymentScreenshotContentType?: string | null;
  paymentSubmittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  reviewNotes?: string | null;
}) {
  const payload = {
    userId: input.userId,
    courseId: input.courseId,
    status: input.status,
    paymentMethod: input.paymentMethod ?? null,
    paymentScreenshotStorageKey: input.paymentScreenshotStorageKey ?? null,
    paymentScreenshotContentType: input.paymentScreenshotContentType ?? null,
    paymentSubmittedAt: input.paymentSubmittedAt ?? null,
    reviewedAt: input.reviewedAt ?? null,
    reviewedById: input.reviewedById ?? null,
    reviewNotes: input.reviewNotes ?? null,
    updatedAt: new Date().toISOString(),
  };

  const existingEnrollment = await maybeOne(
    database.from("Enrollment").select("id").eq("id", input.enrollmentId).maybeSingle(),
    "Enrollment request could not be loaded.",
  );

  if (existingEnrollment) {
    return maybeOne(
      database
        .from("Enrollment")
        .update(payload)
        .eq("id", input.enrollmentId)
        .select("*")
        .maybeSingle(),
      "Enrollment request could not be updated.",
    );
  }

  return maybeOne(
    database
      .from("Enrollment")
      .insert({
        id: input.enrollmentId,
        ...payload,
      })
      .select("*")
      .maybeSingle(),
    "Enrollment request could not be created.",
  );
}

export async function requestCourseEnrollmentAction(
  _: EnrollmentActionState,
  formData: FormData,
): Promise<EnrollmentActionState> {
  try {
    const student = await requireAuthenticatedUser();

    if (student.role !== "STUDENT") {
      throw new AppError("Only student accounts can enroll in courses.", "FORBIDDEN", 403);
    }

    if (!student.studentYear) {
      throw new AppError("Your registered academic year is missing. Please contact support.", "VALIDATION_ERROR", 400);
    }

    const payload = enrollmentSchema.parse({
      courseId: formData.get("courseId"),
      paymentMethod: formData.get("paymentMethod") || undefined,
    });
    const paymentProof = formData.get("paymentProof");
    const course = await maybeOne(
      database
        .from("Course")
        .select("id, slug, title, status, accessType, targetStudentYear")
        .eq("id", payload.courseId)
        .maybeSingle(),
      "Course could not be loaded.",
    );

    if (!course || course.status !== "PUBLISHED") {
      throw new AppError("This course is not available for enrollment yet.", "NOT_FOUND", 404);
    }

    if (course.targetStudentYear !== student.studentYear) {
      throw new AppError("This course is not available for your registered year.", "FORBIDDEN", 403);
    }

    const existingEnrollment = await maybeOne(
      database
        .from("Enrollment")
        .select("*")
        .eq("userId", student.id)
        .eq("courseId", course.id)
        .maybeSingle(),
      "Enrollment request could not be loaded.",
    );

    if (existingEnrollment?.status === "ACTIVE" || existingEnrollment?.status === "COMPLETED") {
      return {
        status: "success",
        message: "You are already enrolled in this course.",
        refresh: true,
      };
    }

    if (course.accessType === "FREE") {
      const enrollmentId = existingEnrollment?.id ?? createId();
      await upsertEnrollmentRecord({
        enrollmentId,
        userId: student.id,
        courseId: course.id,
        status: "ACTIVE",
        reviewedAt: new Date().toISOString(),
        reviewNotes: "Automatically approved for a free course.",
      });

      await recordAuditLogFromRequest({
        actorUserId: student.id,
        entityType: "Enrollment",
        entityId: enrollmentId,
        action: "enrollment.free.created",
        message: "A free course enrollment was activated instantly.",
      });

      revalidateEnrollmentWorkflowPaths({
        courseId: course.id,
        courseSlug: course.slug,
      });

      return {
        status: "success",
        message: "You are now enrolled in this free course.",
        refresh: true,
      };
    }

    if (!payload.paymentMethod) {
      throw new AppError("Choose the payment method you used before submitting.", "VALIDATION_ERROR", 400);
    }

    if (!(paymentProof instanceof File) || paymentProof.size === 0) {
      throw new AppError("Upload your payment screenshot before submitting.", "VALIDATION_ERROR", 400);
    }

    if (!allowedPaymentProofTypes.has(paymentProof.type)) {
      throw new AppError("Payment proof must be a PNG, JPG, WEBP, or PDF file.", "VALIDATION_ERROR", 400);
    }

    const enrollmentId = existingEnrollment?.id ?? createId();
    const storageKey = `payments/enrollments/${enrollmentId}/${slugify(course.title)}-${Date.now()}${getFileExtension(paymentProof)}`;

    await storage.putObject({
      key: storageKey,
      body: Buffer.from(await paymentProof.arrayBuffer()),
      contentType: paymentProof.type,
    });

    if (
      existingEnrollment?.paymentScreenshotStorageKey &&
      existingEnrollment.paymentScreenshotStorageKey !== storageKey
    ) {
      await storage.deleteObject(existingEnrollment.paymentScreenshotStorageKey);
    }

    await upsertEnrollmentRecord({
      enrollmentId,
      userId: student.id,
      courseId: course.id,
      status: "PENDING",
      paymentMethod: payload.paymentMethod,
      paymentScreenshotStorageKey: storageKey,
      paymentScreenshotContentType: paymentProof.type,
      paymentSubmittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedById: null,
      reviewNotes: null,
    });

    await recordAuditLogFromRequest({
      actorUserId: student.id,
      entityType: "Enrollment",
      entityId: enrollmentId,
      action: existingEnrollment ? "enrollment.payment_resubmitted" : "enrollment.payment_submitted",
      message: existingEnrollment
        ? "A paid course enrollment proof was resubmitted."
        : "A paid course enrollment proof was submitted.",
      metadata: {
        courseId: course.id,
        paymentMethod: payload.paymentMethod,
      },
    });

    revalidateEnrollmentWorkflowPaths({
      courseId: course.id,
      courseSlug: course.slug,
    });

    return {
      status: "success",
      message: "Your payment proof was submitted and is now waiting for admin review.",
      refresh: true,
    };
  } catch (error) {
    return {
      status: "error",
      message: isAppError(error) ? error.message : toErrorMessage(error),
    };
  }
}
