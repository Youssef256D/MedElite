"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  countRows,
  CourseAccessType,
  CourseStatus,
  createId,
  database,
  LessonStatus,
  LessonVisibility,
  maybeOne,
  many,
  StudentYear,
} from "@/lib/database";
import { AppError } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import { messages } from "@/messages";
import { canManageCourse } from "@/modules/auth/permissions";
import { requireRoles } from "@/modules/auth/service";
import { recordAuditLogFromRequest } from "@/modules/audit/service";

const courseSchema = z.object({
  courseId: z.string().optional(),
  title: z.string().min(4),
  subtitle: z.string().optional(),
  shortDescription: z.string().min(12),
  description: z.string().min(24),
  targetStudentYear: z.nativeEnum(StudentYear),
  accessType: z.nativeEnum(CourseAccessType),
});

const moduleSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(3),
  description: z.string().optional(),
});

const lessonSchema = z.object({
  lessonId: z.string().optional(),
  courseId: z.string().min(1),
  moduleId: z.string().min(1),
  title: z.string().min(3),
  summary: z.string().min(10),
  content: z.string().optional(),
  position: z.coerce.number().int().positive(),
  visibility: z.nativeEnum(LessonVisibility),
  status: z.nativeEnum(LessonStatus).default(LessonStatus.DRAFT),
});

const announcementSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(4),
  body: z.string().min(12),
  publish: z.coerce.boolean().default(false),
});

const resourceSchema = z.object({
  lessonId: z.string().optional(),
  courseId: z.string().optional(),
  title: z.string().min(3),
  description: z.string().optional(),
  externalUrl: z.string().url(),
});

async function assertCourseManagement(courseId: string) {
  const user = await requireRoles(["INSTRUCTOR", "ADMIN"]);
  const course = await maybeOne(
    database.from("Course").select("id, instructorId").eq("id", courseId).maybeSingle(),
    "Course could not be loaded.",
  );

  if (!course) {
    throw new AppError("Course not found.", "NOT_FOUND", 404);
  }

  if (!canManageCourse(user, course)) {
    throw new AppError(messages.auth.noPermission, "FORBIDDEN", 403);
  }

  return { user, course };
}

async function createUniqueCourseSlug(title: string) {
  const base = slugify(title);
  let candidate = base;
  let suffix = 1;

  while (await maybeOne(database.from("Course").select("id").eq("slug", candidate).maybeSingle())) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

export async function saveCourseAction(formData: FormData) {
  const user = await requireRoles(["INSTRUCTOR", "ADMIN"]);
  const payload = courseSchema.parse({
    courseId: formData.get("courseId") || undefined,
    title: formData.get("title"),
    subtitle: formData.get("subtitle") || undefined,
    shortDescription: formData.get("shortDescription"),
    description: formData.get("description"),
    targetStudentYear: formData.get("targetStudentYear"),
    accessType: formData.get("accessType"),
  });
  const now = new Date().toISOString();

  if (payload.courseId) {
    await assertCourseManagement(payload.courseId);
  }

  const course = payload.courseId
    ? await maybeOne(
        database
          .from("Course")
          .update({
            title: payload.title,
            subtitle: payload.subtitle ?? null,
            shortDescription: payload.shortDescription,
            description: payload.description,
            targetStudentYear: payload.targetStudentYear,
            accessType: payload.accessType,
            isPremium: payload.accessType === CourseAccessType.PAID,
            ...(payload.accessType === CourseAccessType.FREE ? { priceCents: 0 } : {}),
            updatedAt: now,
          })
          .eq("id", payload.courseId)
          .select("*")
          .maybeSingle(),
        "Course could not be updated.",
      )
    : await maybeOne(
        database
          .from("Course")
          .insert({
            id: createId(),
            categoryId: null,
            instructorId: user.id,
            slug: await createUniqueCourseSlug(payload.title),
            title: payload.title,
            subtitle: payload.subtitle ?? null,
            shortDescription: payload.shortDescription,
            description: payload.description,
            targetStudentYear: payload.targetStudentYear,
            accessType: payload.accessType,
            isPremium: payload.accessType === CourseAccessType.PAID,
            priceCents: payload.accessType === CourseAccessType.FREE ? 0 : null,
            submittedAt: null,
            updatedAt: now,
          })
          .select("*")
          .maybeSingle(),
        "Course could not be created.",
      );

  if (!course) {
    throw new AppError("Course could not be saved.", "INTERNAL_ERROR", 500);
  }

  await recordAuditLogFromRequest({
    actorUserId: user.id,
    entityType: "Course",
    entityId: course.id,
    action: payload.courseId ? "course.updated" : "course.created",
    message: payload.courseId ? "Course details were updated." : "A new course draft was created.",
  });

  revalidatePath("/instructor/courses");
  revalidatePath(`/instructor/courses/${course.id}`);
  revalidatePath("/student/dashboard");
  redirect(`/instructor/courses/${course.id}`);
}

export async function createModuleAction(formData: FormData) {
  const payload = moduleSchema.parse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });
  const { user } = await assertCourseManagement(payload.courseId);
  const position =
    (await countRows(
      database.from("Module").select("*", { count: "exact", head: true }).eq("courseId", payload.courseId),
      "Module count could not be loaded.",
    )) + 1;

  const moduleRecord = await maybeOne(
    database
      .from("Module")
      .insert({
        id: createId(),
        courseId: payload.courseId,
        title: payload.title,
        description: payload.description ?? null,
        position,
        updatedAt: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle(),
    "Module could not be created.",
  );

  if (!moduleRecord) {
    throw new AppError("Module could not be created.", "INTERNAL_ERROR", 500);
  }

  await recordAuditLogFromRequest({
    actorUserId: user.id,
    entityType: "Module",
    entityId: moduleRecord.id,
    action: "module.created",
    message: "A new module was added to a course.",
  });

  revalidatePath(`/instructor/courses/${payload.courseId}`);
}

export async function saveLessonAction(formData: FormData) {
  const payload = lessonSchema.parse({
    lessonId: formData.get("lessonId") || undefined,
    courseId: formData.get("courseId"),
    moduleId: formData.get("moduleId"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    content: formData.get("content") || undefined,
    position: formData.get("position"),
    visibility: formData.get("visibility"),
    status: formData.get("status") || LessonStatus.DRAFT,
  });

  const { user } = await assertCourseManagement(payload.courseId);
  const lesson = payload.lessonId
    ? await maybeOne(
        database
          .from("Lesson")
          .update({
            moduleId: payload.moduleId,
            title: payload.title,
            summary: payload.summary,
            content: payload.content ?? null,
            position: payload.position,
            visibility: payload.visibility,
            status: payload.status,
            updatedAt: new Date().toISOString(),
          })
          .eq("id", payload.lessonId)
          .select("*")
          .maybeSingle(),
        "Lesson could not be updated.",
      )
    : await maybeOne(
        database
          .from("Lesson")
          .insert({
            id: createId(),
            courseId: payload.courseId,
            moduleId: payload.moduleId,
            slug: `${slugify(payload.title)}-${Math.random().toString(36).slice(2, 6)}`,
            title: payload.title,
            summary: payload.summary,
            content: payload.content ?? null,
            position: payload.position,
            visibility: payload.visibility,
            status: payload.status,
            updatedAt: new Date().toISOString(),
          })
          .select("*")
          .maybeSingle(),
        "Lesson could not be created.",
      );

  if (!lesson) {
    throw new AppError("Lesson could not be saved.", "INTERNAL_ERROR", 500);
  }

  await recordAuditLogFromRequest({
    actorUserId: user.id,
    entityType: "Lesson",
    entityId: lesson.id,
    action: payload.lessonId ? "lesson.updated" : "lesson.created",
    message: payload.lessonId ? "Lesson details were updated." : "A new lesson draft was created.",
  });

  revalidatePath(`/instructor/courses/${payload.courseId}`);
  revalidatePath("/courses");
}

export async function createResourceAction(formData: FormData) {
  const payload = resourceSchema.parse({
    lessonId: formData.get("lessonId") || undefined,
    courseId: formData.get("courseId") || undefined,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    externalUrl: formData.get("externalUrl"),
  });

  if (!payload.lessonId && !payload.courseId) {
    throw new AppError("A resource must be linked to a course or lesson.", "VALIDATION_ERROR", 400);
  }

  const courseId =
    payload.courseId ??
    (
      await maybeOne(
        database.from("Lesson").select("courseId").eq("id", payload.lessonId!).maybeSingle(),
        "Lesson could not be loaded.",
      )
    )?.courseId;

  if (!courseId) {
    throw new AppError("Course not found for resource.", "NOT_FOUND", 404);
  }

  const { user } = await assertCourseManagement(courseId);
  await database.from("Resource").insert({
    id: createId(),
    lessonId: payload.lessonId ?? null,
    courseId,
    title: payload.title,
    description: payload.description ?? null,
    type: "LINK",
    externalUrl: payload.externalUrl,
    updatedAt: new Date().toISOString(),
  });

  await recordAuditLogFromRequest({
    actorUserId: user.id,
    entityType: "Resource",
    entityId: payload.lessonId ?? courseId,
    action: "resource.created",
    message: "A course resource link was created.",
  });

  revalidatePath(`/instructor/courses/${courseId}`);
}

export async function createAnnouncementAction(formData: FormData) {
  const adminUser = await requireRoles(["ADMIN"]);
  const payload = announcementSchema.parse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    body: formData.get("body"),
    publish: formData.get("publish") === "true",
  });
  await assertCourseManagement(payload.courseId);
  await database.from("CourseAnnouncement").insert({
    id: createId(),
    courseId: payload.courseId,
    instructorId: adminUser.id,
    title: payload.title,
    body: payload.body,
    status: payload.publish ? "PUBLISHED" : "DRAFT",
    publishedAt: payload.publish ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  });

  await recordAuditLogFromRequest({
    actorUserId: adminUser.id,
    entityType: "CourseAnnouncement",
    entityId: payload.courseId,
    action: "announcement.created",
    message: "A course announcement was created by an admin.",
  });

  revalidatePath("/admin/announcements");
  revalidatePath(`/instructor/courses/${payload.courseId}`);
}

export async function publishCourseAction(courseId: string) {
  const { user } = await assertCourseManagement(courseId);
  const course = await maybeOne(
    database.from("Course").select("id, accessType").eq("id", courseId).maybeSingle(),
    "Course could not be loaded.",
  );

  if (!course) {
    throw new AppError("Course not found.", "NOT_FOUND", 404);
  }

  await database
    .from("Course")
    .update({
      status: CourseStatus.REVIEW,
      submittedAt: new Date().toISOString(),
      publishedAt: null,
      approvedAt: null,
      approvedById: null,
      reviewNotes: course.accessType === CourseAccessType.FREE ? "Awaiting admin approval." : null,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", courseId);

  await recordAuditLogFromRequest({
    actorUserId: user.id,
    entityType: "Course",
    entityId: courseId,
    action: "course.submitted_for_review",
    message: "A course was submitted for admin review.",
  });

  revalidatePath(`/instructor/courses/${courseId}`);
  revalidatePath("/admin/courses");
}

export async function archiveCourseAction(courseId: string) {
  const { user } = await assertCourseManagement(courseId);
  await database
    .from("Course")
    .update({
      status: CourseStatus.ARCHIVED,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .eq("id", courseId);

  await recordAuditLogFromRequest({
    actorUserId: user.id,
    entityType: "Course",
    entityId: courseId,
    action: "course.archived",
    message: "A course was archived.",
  });

  revalidatePath(`/instructor/courses/${courseId}`);
  revalidatePath("/instructor/courses");
}

export async function duplicateCourseAction(courseId: string) {
  const { user } = await assertCourseManagement(courseId);
  const course = await maybeOne(
    database.from("Course").select("*").eq("id", courseId).maybeSingle(),
    "Course could not be loaded.",
  );

  if (!course) {
    throw new AppError("Course not found.", "NOT_FOUND", 404);
  }

  const modules = await many(
    database.from("Module").select("*").eq("courseId", courseId).order("position", { ascending: true }),
    "Modules could not be loaded.",
  );
  const lessons = modules.length
    ? await many(
        database
          .from("Lesson")
          .select("*")
          .in(
            "moduleId",
            modules.map((moduleRecord) => moduleRecord.id),
          )
          .order("position", { ascending: true }),
        "Lessons could not be loaded.",
      )
    : [];
  const resources = lessons.length
    ? await many(
        database
          .from("Resource")
          .select("*")
          .in(
            "lessonId",
            lessons.map((lesson) => lesson.id),
          ),
        "Resources could not be loaded.",
      )
    : [];
  const lessonsByModuleId = lessons.reduce(
    (accumulator, lesson) => {
      const bucket = accumulator.get(lesson.moduleId) ?? [];
      bucket.push(lesson);
      accumulator.set(lesson.moduleId, bucket);
      return accumulator;
    },
    new Map<string, typeof lessons>(),
  );
  const resourcesByLessonId = resources.reduce(
    (accumulator, resource) => {
      const bucket = accumulator.get(resource.lessonId ?? "") ?? [];
      bucket.push(resource);
      accumulator.set(resource.lessonId ?? "", bucket);
      return accumulator;
    },
    new Map<string, typeof resources>(),
  );

  const duplicated = await maybeOne(
    database
      .from("Course")
      .insert({
        id: createId(),
        categoryId: course.categoryId,
        instructorId: user.id,
        slug: await createUniqueCourseSlug(`${course.title} Copy`),
        title: `${course.title} Copy`,
        subtitle: course.subtitle,
        shortDescription: course.shortDescription,
        description: course.description,
        targetStudentYear: course.targetStudentYear,
        accessType: course.accessType,
        isPremium: course.accessType === CourseAccessType.PAID,
        priceCents: course.accessType === CourseAccessType.FREE ? 0 : null,
        status: CourseStatus.DRAFT,
        submittedAt: null,
        approvedAt: null,
        approvedById: null,
        reviewNotes: null,
        updatedAt: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle(),
    "Course duplicate could not be created.",
  );

  if (!duplicated) {
    throw new AppError("Course duplicate could not be created.", "INTERNAL_ERROR", 500);
  }

  for (const moduleRecord of modules) {
    const duplicatedModule = await maybeOne(
      database
        .from("Module")
        .insert({
          id: createId(),
          courseId: duplicated.id,
          title: moduleRecord.title,
          description: moduleRecord.description,
          position: moduleRecord.position,
          updatedAt: new Date().toISOString(),
        })
        .select("*")
        .maybeSingle(),
      "Duplicated module could not be created.",
    );

    if (!duplicatedModule) {
      throw new AppError("Duplicated module could not be created.", "INTERNAL_ERROR", 500);
    }

    for (const lesson of lessonsByModuleId.get(moduleRecord.id) ?? []) {
      const duplicatedLesson = await maybeOne(
        database
          .from("Lesson")
          .insert({
            id: createId(),
            courseId: duplicated.id,
            moduleId: duplicatedModule.id,
            slug: `${lesson.slug}-copy-${Math.random().toString(36).slice(2, 5)}`,
            title: lesson.title,
            summary: lesson.summary,
            content: lesson.content,
            position: lesson.position,
            durationSeconds: lesson.durationSeconds,
            visibility: lesson.visibility,
            status: LessonStatus.DRAFT,
            updatedAt: new Date().toISOString(),
          })
          .select("*")
          .maybeSingle(),
        "Duplicated lesson could not be created.",
      );

      if (!duplicatedLesson) {
        throw new AppError("Duplicated lesson could not be created.", "INTERNAL_ERROR", 500);
      }

      for (const resource of resourcesByLessonId.get(lesson.id) ?? []) {
        await database.from("Resource").insert({
          id: createId(),
          lessonId: duplicatedLesson.id,
          courseId: duplicated.id,
          title: resource.title,
          description: resource.description,
          type: resource.type,
          externalUrl: resource.externalUrl,
          fileName: resource.fileName,
          storageKey: resource.storageKey,
          sizeBytes: resource.sizeBytes,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  await recordAuditLogFromRequest({
    actorUserId: user.id,
    entityType: "Course",
    entityId: duplicated.id,
    action: "course.duplicated",
    message: "A course draft was duplicated.",
  });

  revalidatePath("/instructor/courses");
}
