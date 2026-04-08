import {
  database,
  maybeOne,
  type Role,
  type SubscriptionStatus,
  type Tables,
  SubscriptionStatus as SubscriptionStatusValues,
} from "@/lib/database";
import { AppError } from "@/lib/errors";
import { messages } from "@/messages";
import { isAdminRole } from "@/modules/auth/permissions";

export async function getCurrentSubscription(userId: string) {
  return maybeOne(
    database
      .from("Subscription")
      .select("*")
      .eq("userId", userId)
      .order("startsAt", { ascending: false })
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "Subscription could not be loaded.",
  );
}

export function isSubscriptionCurrentlyActive(
  status: SubscriptionStatus,
  endsAt?: Date | null,
  trialEndsAt?: Date | null,
) {
  const now = new Date();

  if (status === SubscriptionStatusValues.ACTIVE) {
    return !endsAt || endsAt > now;
  }

  if (status === SubscriptionStatusValues.TRIAL) {
    return !trialEndsAt || trialEndsAt > now;
  }

  return false;
}

export async function hasActiveSubscription(userId: string) {
  const subscription = await getCurrentSubscription(userId);

  if (!subscription) {
    return false;
  }

  return isSubscriptionCurrentlyActive(subscription.status, subscription.endsAt, subscription.trialEndsAt);
}

type LessonAccessInput = {
  viewerId?: string | null;
  viewerRole?: Role | null;
  viewerStudentYear?: Tables<"User">["studentYear"] | null;
  course: Pick<Tables<"Course">, "id" | "instructorId" | "status" | "accessType" | "targetStudentYear">;
  lesson: Pick<Tables<"Lesson">, "id" | "visibility" | "status">;
};

export async function resolveLessonAccess(input: LessonAccessInput) {
  if (input.viewerRole && isAdminRole(input.viewerRole)) {
    return { allowed: true as const, mode: "admin" as const };
  }

  if (input.viewerRole === "INSTRUCTOR" && input.viewerId === input.course.instructorId) {
    return { allowed: true as const, mode: "owner" as const };
  }

  if (
    input.viewerRole === "STUDENT" &&
    input.viewerStudentYear &&
    input.course.targetStudentYear !== input.viewerStudentYear
  ) {
    return {
      allowed: false as const,
      mode: "denied" as const,
      message: "This course is not available for your registered year.",
    };
  }

  if (input.lesson.visibility === "PREVIEW" && input.lesson.status === "PUBLISHED" && input.course.status === "PUBLISHED") {
    return { allowed: true as const, mode: "preview" as const };
  }

  if (input.course.status !== "PUBLISHED") {
    return {
      allowed: false as const,
      mode: "denied" as const,
      message: "This course is still waiting for admin approval.",
    };
  }

  if (!input.viewerId) {
    return {
      allowed: false as const,
      mode: "denied" as const,
      message:
        input.course.accessType === "FREE"
          ? "Sign in to enroll in this course."
          : "You need an approved enrollment before this lesson can be opened.",
    };
  }

  if (input.course.accessType === "FREE") {
    return { allowed: true as const, mode: "free" as const };
  }

  const enrollment = await maybeOne(
    database
      .from("Enrollment")
      .select("status, reviewNotes")
      .eq("userId", input.viewerId)
      .eq("courseId", input.course.id)
      .maybeSingle(),
    "Enrollment could not be loaded.",
  );

  if (!enrollment) {
    return {
      allowed: false as const,
      mode: "denied" as const,
      message: "You need an approved enrollment before this lesson can be opened.",
    };
  }

  if (enrollment.status === "PENDING") {
    return {
      allowed: false as const,
      mode: "denied" as const,
      message: "Your payment proof is still under admin review.",
    };
  }

  if (enrollment.status === "REJECTED") {
    return {
      allowed: false as const,
      mode: "denied" as const,
      message: enrollment.reviewNotes ?? "Your enrollment request was rejected. Please resubmit your payment proof.",
    };
  }

  if (enrollment.status === "ACTIVE" || enrollment.status === "COMPLETED") {
    return { allowed: true as const, mode: "enrolled" as const };
  }

  return {
    allowed: false as const,
    mode: "denied" as const,
    message: "You need an approved enrollment before this lesson can be opened.",
  };
}

export async function requireActiveSubscription(userId: string) {
  const allowed = await hasActiveSubscription(userId);

  if (!allowed) {
    throw new AppError(messages.subscription.required, "SUBSCRIPTION_REQUIRED", 402);
  }
}
