"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createId, database, execute, maybeOne, StudentYear, UserStatus, type Json } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { requireRoles, revokeAllSessionsForUser } from "@/modules/auth/service";
import { hashPassword } from "@/modules/auth/password";
import { recordAuditLogFromRequest } from "@/modules/audit/service";
import { resolveSuspiciousEvent } from "@/modules/suspicious/service";

const manageableRoleValues = ["STUDENT", "INSTRUCTOR", "ADMIN"] as const;

const optionalStringField = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const optionalStudentYearField = z.preprocess((value) => {
  if (value === "" || value == null) {
    return undefined;
  }

  return value;
}, z.nativeEnum(StudentYear).optional());

const userModerationSchema = z.object({
  userId: z.string().min(1),
  status: z.nativeEnum(UserStatus),
  reason: z.string().optional(),
});

const managedUserSchema = z
  .object({
    firstName: z.string().trim().min(2),
    lastName: z.string().trim().min(2),
    email: z.string().trim().email(),
    password: z.string().min(8),
    role: z.enum(manageableRoleValues),
    studentYear: optionalStudentYearField,
    instructorTitle: optionalStringField,
    instructorSpecialty: optionalStringField,
  })
  .superRefine((value, context) => {
    if (value.role === "STUDENT" && !value.studentYear) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["studentYear"],
        message: "Student accounts need an assigned year.",
      });
    }
  });

const userAccountSchema = z
  .object({
    userId: z.string().min(1),
    role: z.enum(manageableRoleValues),
    studentYear: optionalStudentYearField,
  })
  .superRefine((value, context) => {
    if (value.role === "STUDENT" && !value.studentYear) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["studentYear"],
        message: "Student accounts need an assigned year.",
      });
    }
  });

const siteSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(2),
});

const nonNegativeNumberField = z.preprocess((value) => {
  if (value === "" || value == null) {
    return undefined;
  }

  return Number(value);
}, z.number().nonnegative().optional());

const courseReviewSchema = z.object({
  courseId: z.string().min(1),
  priceAmount: nonNegativeNumberField,
  reviewNotes: z.string().optional(),
});

const enrollmentReviewSchema = z.object({
  enrollmentId: z.string().min(1),
  reviewNotes: z.string().optional(),
});

function revalidateAdminCoursePaths() {
  revalidatePath("/admin/courses");
  revalidatePath("/admin/courses/all");
  revalidatePath("/admin/courses/course-approvals");
  revalidatePath("/admin/courses/payments");
  revalidatePath("/admin/courses/payment-approvals");
}

async function ensureStarterSubscriptionForStudent(userId: string, now: Date) {
  const existingSubscription = await maybeOne(
    database.from("Subscription").select("id").eq("userId", userId).maybeSingle(),
    "Subscription status could not be loaded.",
  );

  if (existingSubscription) {
    return;
  }

  const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await maybeOne(
    database
      .from("Subscription")
      .insert({
        id: createId(),
        userId,
        planCode: "trial",
        planName: "7-Day Trial",
        status: "TRIAL",
        startsAt: now.toISOString(),
        trialEndsAt: trialEndsAt.toISOString(),
        priceCents: 0,
        currency: "USD",
        updatedAt: now.toISOString(),
      })
      .select("id")
      .maybeSingle(),
    "Student subscription could not be created.",
  );
}

async function upsertInstructorProfileForUser(input: {
  actorId: string;
  userId: string;
  title?: string;
  specialty?: string;
}) {
  const existingProfile = await maybeOne(
    database.from("InstructorProfile").select("*").eq("userId", input.userId).maybeSingle(),
    "Instructor profile could not be loaded.",
  );
  const nowIso = new Date().toISOString();
  const title = input.title ?? existingProfile?.title ?? "Instructor";
  const specialty = input.specialty ?? existingProfile?.specialty ?? "Medical Education";

  if (existingProfile) {
    await maybeOne(
      database
        .from("InstructorProfile")
        .update({
          title,
          specialty,
          isApproved: true,
          approvedAt: existingProfile.approvedAt ?? nowIso,
          approvedById: existingProfile.approvedById ?? input.actorId,
          updatedAt: nowIso,
        })
        .eq("userId", input.userId)
        .select("*")
        .maybeSingle(),
      "Instructor profile could not be updated.",
    );
    return;
  }

  await maybeOne(
    database
      .from("InstructorProfile")
      .insert({
        id: createId(),
        userId: input.userId,
        title,
        specialty,
        isApproved: true,
        approvedAt: nowIso,
        approvedById: input.actorId,
        updatedAt: nowIso,
      })
      .select("*")
      .maybeSingle(),
    "Instructor profile could not be created.",
  );
}

export async function createManagedUserAction(formData: FormData) {
  const actor = await requireRoles(["ADMIN"]);
  const payload = managedUserSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    studentYear: formData.get("studentYear"),
    instructorTitle: formData.get("instructorTitle"),
    instructorSpecialty: formData.get("instructorSpecialty"),
  });
  const normalizedEmail = payload.email.toLowerCase();
  const existingUser = await maybeOne(
    database.from("User").select("id").eq("email", normalizedEmail).maybeSingle(),
    "User availability could not be checked.",
  );

  if (existingUser) {
    throw new AppError("An account with this email already exists.", "CONFLICT", 409);
  }

  const now = new Date();
  const userId = createId();
  const passwordHash = await hashPassword(payload.password);

  await Promise.all([
    maybeOne(
      database
        .from("User")
        .insert({
          id: userId,
          email: normalizedEmail,
          passwordHash,
          firstName: payload.firstName,
          lastName: payload.lastName,
          role: payload.role,
          studentYear: payload.role === "STUDENT" ? payload.studentYear ?? null : null,
          updatedAt: now.toISOString(),
        })
        .select("*")
        .maybeSingle(),
      "User account could not be created.",
    ),
    maybeOne(
      database
        .from("Profile")
        .insert({
          id: createId(),
          userId,
          fullName: `${payload.firstName} ${payload.lastName}`,
          updatedAt: now.toISOString(),
        })
        .select("id")
        .maybeSingle(),
      "User profile could not be created.",
    ),
  ]);

  if (payload.role === "STUDENT") {
    await ensureStarterSubscriptionForStudent(userId, now);
  }

  if (payload.role === "INSTRUCTOR") {
    await upsertInstructorProfileForUser({
      actorId: actor.id,
      userId,
      title: payload.instructorTitle,
      specialty: payload.instructorSpecialty,
    });
  }

  await recordAuditLogFromRequest({
    actorUserId: actor.id,
    entityType: "User",
    entityId: userId,
    action: "user.created_by_admin",
    message: "An admin created a new user account.",
    metadata: {
      role: payload.role,
      studentYear: payload.role === "STUDENT" ? payload.studentYear : null,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/students");
  revalidatePath("/admin/users/instructors");
  revalidatePath("/admin/users/admins");
  revalidatePath("/admin/dashboard");
}

export async function updateUserAccountAction(formData: FormData) {
  const actor = await requireRoles(["ADMIN"]);
  const payload = userAccountSchema.parse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    studentYear: formData.get("studentYear"),
  });
  const user = await maybeOne(
    database.from("User").select("id, role, studentYear").eq("id", payload.userId).maybeSingle(),
    "User could not be loaded.",
  );

  if (!user) {
    throw new AppError("User not found.", "NOT_FOUND", 404);
  }

  if (actor.id === payload.userId && payload.role !== "ADMIN") {
    throw new AppError("Admins cannot remove their own admin access.", "VALIDATION_ERROR", 400);
  }

  await execute(
    database
      .from("User")
      .update({
        role: payload.role,
        studentYear: payload.role === "STUDENT" ? payload.studentYear ?? null : null,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", payload.userId),
    "User account could not be updated.",
  );

  if (payload.role === "STUDENT") {
    await ensureStarterSubscriptionForStudent(payload.userId, new Date());
  }

  if (payload.role === "INSTRUCTOR") {
    await upsertInstructorProfileForUser({
      actorId: actor.id,
      userId: payload.userId,
    });
  }

  await recordAuditLogFromRequest({
    actorUserId: actor.id,
    entityType: "User",
    entityId: payload.userId,
    action: "user.account.updated",
    message: "An admin updated a user account role or year assignment.",
    metadata: {
      previousRole: user.role,
      nextRole: payload.role,
      previousStudentYear: user.studentYear,
      nextStudentYear: payload.role === "STUDENT" ? payload.studentYear ?? null : null,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/students");
  revalidatePath("/admin/users/instructors");
  revalidatePath("/admin/users/admins");
  revalidatePath("/admin/dashboard");
  revalidatePath("/student/dashboard");
}

export async function updateUserStatusAction(formData: FormData) {
  const actor = await requireRoles(["ADMIN"]);
  const payload = userModerationSchema.parse({
    userId: formData.get("userId"),
    status: formData.get("status"),
    reason: formData.get("reason") || undefined,
  });

  await database
    .from("User")
    .update({
      status: payload.status,
      suspensionReason: payload.reason ?? null,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", payload.userId);

  if (payload.status === UserStatus.BANNED || payload.status === UserStatus.SUSPENDED) {
    await database.from("Ban").insert({
      id: createId(),
      targetType: "USER",
      userId: payload.userId,
      reason: payload.reason ?? `User marked as ${payload.status.toLowerCase()}.`,
      createdById: actor.id,
    });
    await revokeAllSessionsForUser(payload.userId, actor.id, `User set to ${payload.status}.`);
  }

  await recordAuditLogFromRequest({
    actorUserId: actor.id,
    entityType: "User",
    entityId: payload.userId,
    action: "user.status.updated",
    message: `User status changed to ${payload.status}.`,
    metadata: {
      reason: payload.reason,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/students");
  revalidatePath("/admin/users/instructors");
  revalidatePath("/admin/users/admins");
  revalidatePath("/admin/access");
}

export async function revokeUserSessionsAction(userId: string) {
  const actor = await requireRoles(["ADMIN"]);
  await revokeAllSessionsForUser(userId, actor.id, "Sessions revoked by admin.");
  revalidatePath("/admin/access");
}

export async function approveInstructorAction(userId: string) {
  const actor = await requireRoles(["ADMIN"]);
  const user = await maybeOne(
    database.from("User").select("*").eq("id", userId).maybeSingle(),
    "Instructor could not be loaded.",
  );
  const instructorProfile = await maybeOne(
    database.from("InstructorProfile").select("*").eq("userId", userId).maybeSingle(),
    "Instructor profile could not be loaded.",
  );

  if (!user) {
    throw new AppError("Instructor not found.", "NOT_FOUND", 404);
  }

  await database
    .from("User")
    .update({
      role: "INSTRUCTOR",
      updatedAt: new Date().toISOString(),
    })
    .eq("id", userId);

  if (instructorProfile) {
    await database
      .from("InstructorProfile")
      .update({
        isApproved: true,
        approvedAt: new Date().toISOString(),
        approvedById: actor.id,
        updatedAt: new Date().toISOString(),
      })
      .eq("userId", userId);
  }

  await recordAuditLogFromRequest({
    actorUserId: actor.id,
    entityType: "User",
    entityId: userId,
    action: "instructor.approved",
    message: "Instructor access was approved.",
  });

  revalidatePath("/admin/users/instructors");
}

export async function resolveSuspiciousEventAction(eventId: string) {
  const actor = await requireRoles(["ADMIN"]);
  await resolveSuspiciousEvent(eventId, actor.id);
  revalidatePath("/admin/suspicious");
}

export async function approveCourseAction(formData: FormData) {
  const actor = await requireRoles(["ADMIN"]);
  const payload = courseReviewSchema.parse({
    courseId: formData.get("courseId"),
    priceAmount: formData.get("priceAmount"),
    reviewNotes: formData.get("reviewNotes") || undefined,
  });
  const course = await maybeOne(
    database.from("Course").select("id, title, slug, accessType").eq("id", payload.courseId).maybeSingle(),
    "Course could not be loaded.",
  );

  if (!course) {
    throw new AppError("Course not found.", "NOT_FOUND", 404);
  }

  const approvedPriceCents = course.accessType === "FREE" ? 0 : Math.round((payload.priceAmount ?? 0) * 100);

  if (course.accessType === "PAID" && approvedPriceCents <= 0) {
    throw new AppError("Paid courses need a price before approval.", "VALIDATION_ERROR", 400);
  }

  await database
    .from("Course")
    .update({
      status: "PUBLISHED",
      priceCents: approvedPriceCents,
      approvedAt: new Date().toISOString(),
      approvedById: actor.id,
      publishedAt: new Date().toISOString(),
      reviewNotes: payload.reviewNotes ?? null,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", payload.courseId);

  await recordAuditLogFromRequest({
    actorUserId: actor.id,
    entityType: "Course",
    entityId: payload.courseId,
    action: "course.approved",
    message: "A course was approved and published.",
    metadata: {
      priceCents: approvedPriceCents,
      accessType: course.accessType,
    },
  });

  revalidateAdminCoursePaths();
  revalidatePath("/admin/dashboard");
  revalidatePath("/student/dashboard");
  revalidatePath(`/student/course/${course.slug}`);
  revalidatePath("/instructor/courses");
  revalidatePath(`/instructor/courses/${course.id}`);
}

export async function requestCourseChangesAction(formData: FormData) {
  const actor = await requireRoles(["ADMIN"]);
  const payload = courseReviewSchema.parse({
    courseId: formData.get("courseId"),
    priceAmount: formData.get("priceAmount"),
    reviewNotes: formData.get("reviewNotes") || undefined,
  });
  const course = await maybeOne(
    database.from("Course").select("id, slug").eq("id", payload.courseId).maybeSingle(),
    "Course could not be loaded.",
  );

  if (!course) {
    throw new AppError("Course not found.", "NOT_FOUND", 404);
  }

  await database
    .from("Course")
    .update({
      status: "DRAFT",
      publishedAt: null,
      approvedAt: null,
      approvedById: null,
      reviewNotes: payload.reviewNotes ?? "Changes requested by admin.",
      updatedAt: new Date().toISOString(),
    })
    .eq("id", payload.courseId);

  await recordAuditLogFromRequest({
    actorUserId: actor.id,
    entityType: "Course",
    entityId: payload.courseId,
    action: "course.changes_requested",
    message: "Course approval was sent back for revisions.",
  });

  revalidateAdminCoursePaths();
  revalidatePath("/admin/dashboard");
  revalidatePath(`/student/course/${course.slug}`);
  revalidatePath("/instructor/courses");
  revalidatePath(`/instructor/courses/${course.id}`);
}

export async function approveEnrollmentAction(formData: FormData) {
  const actor = await requireRoles(["ADMIN"]);
  const payload = enrollmentReviewSchema.parse({
    enrollmentId: formData.get("enrollmentId"),
    reviewNotes: formData.get("reviewNotes") || undefined,
  });
  const enrollment = await maybeOne(
    database
      .from("Enrollment")
      .select("*")
      .eq("id", payload.enrollmentId)
      .maybeSingle(),
    "Enrollment request could not be loaded.",
  );

  if (!enrollment) {
    throw new AppError("Enrollment request not found.", "NOT_FOUND", 404);
  }

  const course = await maybeOne(
    database.from("Course").select("id, slug, title, accessType").eq("id", enrollment.courseId).maybeSingle(),
    "Course could not be loaded.",
  );

  if (!course) {
    throw new AppError("Course not found.", "NOT_FOUND", 404);
  }

  if (
    course.accessType === "PAID" &&
    (!enrollment.paymentMethod || !enrollment.paymentScreenshotStorageKey)
  ) {
    throw new AppError("This enrollment does not have complete payment proof yet.", "VALIDATION_ERROR", 400);
  }

  await database
    .from("Enrollment")
    .update({
      status: "ACTIVE",
      reviewedAt: new Date().toISOString(),
      reviewedById: actor.id,
      reviewNotes: payload.reviewNotes ?? null,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", payload.enrollmentId);

  await recordAuditLogFromRequest({
    actorUserId: actor.id,
    entityType: "Enrollment",
    entityId: payload.enrollmentId,
    action: "enrollment.approved",
    message: "A course enrollment request was approved.",
  });

  revalidateAdminCoursePaths();
  revalidatePath("/admin/dashboard");
  revalidatePath("/student/courses");
  revalidatePath(`/student/course/${course.slug}`);
  revalidatePath("/student/dashboard");
}

export async function rejectEnrollmentAction(formData: FormData) {
  const actor = await requireRoles(["ADMIN"]);
  const payload = enrollmentReviewSchema.parse({
    enrollmentId: formData.get("enrollmentId"),
    reviewNotes: formData.get("reviewNotes") || undefined,
  });
  const enrollment = await maybeOne(
    database
      .from("Enrollment")
      .select("*")
      .eq("id", payload.enrollmentId)
      .maybeSingle(),
    "Enrollment request could not be loaded.",
  );

  if (!enrollment) {
    throw new AppError("Enrollment request not found.", "NOT_FOUND", 404);
  }

  const course = await maybeOne(
    database.from("Course").select("id, slug").eq("id", enrollment.courseId).maybeSingle(),
    "Course could not be loaded.",
  );

  await database
    .from("Enrollment")
    .update({
      status: "REJECTED",
      reviewedAt: new Date().toISOString(),
      reviewedById: actor.id,
      reviewNotes: payload.reviewNotes ?? "Payment proof was rejected. Please upload a clearer proof and try again.",
      updatedAt: new Date().toISOString(),
    })
    .eq("id", payload.enrollmentId);

  await recordAuditLogFromRequest({
    actorUserId: actor.id,
    entityType: "Enrollment",
    entityId: payload.enrollmentId,
    action: "enrollment.rejected",
    message: "A course enrollment request was rejected.",
  });

  revalidateAdminCoursePaths();
  revalidatePath("/admin/dashboard");
  revalidatePath("/student/courses");
  if (course) {
    revalidatePath(`/student/course/${course.slug}`);
  }
  revalidatePath("/student/dashboard");
}

export async function saveSiteSettingAction(formData: FormData) {
  const actor = await requireRoles(["ADMIN"]);
  const payload = siteSettingSchema.parse({
    key: formData.get("key"),
    value: formData.get("value"),
  });

  let parsedValue: Json;

  try {
    parsedValue = JSON.parse(payload.value) as Json;
  } catch {
    throw new AppError("The setting value could not be parsed. Please review the fields and try again.", "VALIDATION_ERROR", 400);
  }

  await database
    .from("SiteSetting")
    .update({
      value: parsedValue,
      updatedById: actor.id,
      updatedAt: new Date().toISOString(),
    })
    .eq("key", payload.key);

  await recordAuditLogFromRequest({
    actorUserId: actor.id,
    entityType: "SiteSetting",
    entityId: payload.key,
    action: "site-setting.updated",
    message: "A site setting was updated.",
  });

  revalidatePath("/admin/settings");
}
