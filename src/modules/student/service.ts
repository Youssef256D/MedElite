import {
  countRows,
  createId,
  database,
  groupBy,
  indexById,
  many,
  maybeOne,
  type Tables,
} from "@/lib/database";
import { isAdminRole } from "@/modules/auth/permissions";
import { getUserDevices, getUserSessions } from "@/modules/auth/service";
import { resolveLessonAccess } from "@/modules/subscriptions/service";

type UserWithRelations = Tables<"User"> & {
  profile: Tables<"Profile"> | null;
  instructorProfile: Tables<"InstructorProfile"> | null;
};

async function getUsersWithRelations(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return [] as UserWithRelations[];
  }

  const [users, profiles, instructorProfiles] = await Promise.all([
    many(database.from("User").select("*").in("id", uniqueIds), "Users could not be loaded."),
    many(database.from("Profile").select("*").in("userId", uniqueIds), "Profiles could not be loaded."),
    many(
      database.from("InstructorProfile").select("*").in("userId", uniqueIds),
      "Instructor profiles could not be loaded.",
    ),
  ]);

  const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
  const instructorProfileByUserId = new Map(
    instructorProfiles.map((instructorProfile) => [instructorProfile.userId, instructorProfile]),
  );

  return users.map((user) => ({
    ...user,
    profile: profileByUserId.get(user.id) ?? null,
    instructorProfile: instructorProfileByUserId.get(user.id) ?? null,
  }));
}

async function getCoursesForStudent(courseIds: string[]) {
  const uniqueIds = Array.from(new Set(courseIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return [] as (Tables<"Course"> & {
      category: Tables<"Category"> | null;
      instructor: UserWithRelations | null;
    })[];
  }

  const courses = await many(database.from("Course").select("*").in("id", uniqueIds), "Courses could not be loaded.");
  const categoryIds = Array.from(new Set(courses.map((course) => course.categoryId).filter(Boolean))) as string[];
  const categories =
    categoryIds.length > 0
      ? await many(
          database.from("Category").select("*").in("id", categoryIds),
          "Categories could not be loaded.",
        )
      : [];
  const instructors = await getUsersWithRelations(
    Array.from(new Set(courses.map((course) => course.instructorId))),
  );

  const categoryMap = indexById(categories);
  const instructorMap = indexById(instructors);

  return courses.map((course) => ({
    ...course,
    category: course.categoryId ? categoryMap.get(course.categoryId) ?? null : null,
    instructor: instructorMap.get(course.instructorId) ?? null,
  }));
}

export async function ensureEnrollmentForCourse(
  userId: string,
  courseId: string,
  lastLessonId?: string | null,
  status: Tables<"Enrollment">["status"] = "ACTIVE",
) {
  const now = new Date().toISOString();
  const existing = await maybeOne(
    database
      .from("Enrollment")
      .select("*")
      .eq("userId", userId)
      .eq("courseId", courseId)
      .maybeSingle(),
    "Enrollment could not be loaded.",
  );

  if (existing) {
    return maybeOne(
      database
        .from("Enrollment")
        .update({
          status,
          lastLessonId: lastLessonId ?? existing.lastLessonId,
          updatedAt: now,
        })
        .eq("id", existing.id)
        .select("*")
        .maybeSingle(),
      "Enrollment could not be updated.",
    );
  }

  return maybeOne(
    database
      .from("Enrollment")
      .insert({
        id: createId(),
        userId,
        courseId,
        status,
        lastLessonId: lastLessonId ?? null,
        updatedAt: now,
      })
      .select("*")
      .maybeSingle(),
    "Enrollment could not be created.",
  );
}

export async function upsertLessonProgress(input: {
  userId: string;
  lessonId: string;
  courseId: string;
  secondsWatched: number;
  lastPositionSeconds: number;
  completed?: boolean;
}): Promise<Tables<"LessonProgress">> {
  const now = new Date();
  const existingProgress = await maybeOne(
    database
      .from("LessonProgress")
      .select("*")
      .eq("userId", input.userId)
      .eq("lessonId", input.lessonId)
      .maybeSingle(),
    "Lesson progress could not be loaded.",
  );

  const progress = existingProgress
    ? await maybeOne(
        database
          .from("LessonProgress")
          .update({
            secondsWatched: input.secondsWatched,
            lastPositionSeconds: input.lastPositionSeconds,
            completed: input.completed ?? false,
            completedAt: input.completed ? now.toISOString() : null,
            watchCount: existingProgress.watchCount + 1,
            updatedAt: now.toISOString(),
          })
          .eq("id", existingProgress.id)
          .select("*")
          .maybeSingle(),
        "Lesson progress could not be updated.",
      )
    : await maybeOne(
        database
          .from("LessonProgress")
          .insert({
            id: createId(),
            userId: input.userId,
            lessonId: input.lessonId,
            courseId: input.courseId,
            secondsWatched: input.secondsWatched,
            lastPositionSeconds: input.lastPositionSeconds,
            completed: input.completed ?? false,
            completedAt: input.completed ? now.toISOString() : null,
            watchCount: 1,
            updatedAt: now.toISOString(),
          })
          .select("*")
          .maybeSingle(),
        "Lesson progress could not be created.",
      );

  const [completedLessonsCount, totalLessonsCount, existingCourseProgress, existingEnrollment] = await Promise.all([
    countRows(
      database
        .from("LessonProgress")
        .select("*", { count: "exact", head: true })
        .eq("userId", input.userId)
        .eq("courseId", input.courseId)
        .eq("completed", true),
      "Completed lesson count could not be loaded.",
    ),
    countRows(
      database
        .from("Lesson")
        .select("*", { count: "exact", head: true })
        .eq("courseId", input.courseId)
        .eq("status", "PUBLISHED"),
      "Lesson count could not be loaded.",
    ),
    maybeOne(
      database
        .from("CourseProgress")
        .select("*")
        .eq("userId", input.userId)
        .eq("courseId", input.courseId)
        .maybeSingle(),
      "Course progress could not be loaded.",
    ),
    maybeOne(
      database
        .from("Enrollment")
        .select("*")
        .eq("userId", input.userId)
        .eq("courseId", input.courseId)
        .in("status", ["ACTIVE", "COMPLETED"])
        .maybeSingle(),
      "Enrollment could not be loaded.",
    ),
  ]);

  const progressPercent =
    totalLessonsCount === 0 ? 0 : Math.round((completedLessonsCount / totalLessonsCount) * 100);

  const courseProgressPayload = {
    userId: input.userId,
    courseId: input.courseId,
    lastLessonId: input.lessonId,
    progressPercent,
    totalLessonsCount,
    completedLessonsCount,
    updatedAt: now.toISOString(),
  };

  const enrollmentPayload = {
    userId: input.userId,
    courseId: input.courseId,
    progressPercent,
    lastLessonId: input.lessonId,
    completedAt: progressPercent === 100 ? now.toISOString() : null,
    updatedAt: now.toISOString(),
  };

  await Promise.all([
    existingCourseProgress
      ? database.from("CourseProgress").update(courseProgressPayload).eq("id", existingCourseProgress.id)
      : database.from("CourseProgress").insert({
          id: createId(),
          ...courseProgressPayload,
        }),
    existingEnrollment
      ? database.from("Enrollment").update(enrollmentPayload).eq("id", existingEnrollment.id)
      : database.from("Enrollment").insert({
          id: createId(),
          ...enrollmentPayload,
        }),
  ]);

  if (!progress) {
    throw new Error("Lesson progress could not be persisted.");
  }

  return progress as Tables<"LessonProgress">;
}

export async function getStudentDashboardData(userId: string) {
  const [subscriptions, enrollments, progress, sessions, devices] = await Promise.all([
    many(
      database
        .from("Subscription")
        .select("*")
        .eq("userId", userId)
        .order("startsAt", { ascending: false })
        .limit(1),
      "Subscription could not be loaded.",
    ),
    many(
      database
        .from("Enrollment")
        .select("*")
        .eq("userId", userId)
        .order("updatedAt", { ascending: false }),
      "Enrollments could not be loaded.",
    ),
    many(
      database
        .from("CourseProgress")
        .select("*")
        .eq("userId", userId)
        .order("updatedAt", { ascending: false })
        .limit(6),
      "Course progress could not be loaded.",
    ),
    getUserSessions(userId),
    getUserDevices(userId),
  ]);

  const courseIds = Array.from(
    new Set([...enrollments.map((enrollment) => enrollment.courseId), ...progress.map((item) => item.courseId)]),
  );
  const lastLessonIds = Array.from(
    new Set(
      [...enrollments.map((enrollment) => enrollment.lastLessonId), ...progress.map((item) => item.lastLessonId)].filter(Boolean),
    ),
  ) as string[];
  const [courses, lastLessons] = await Promise.all([
    getCoursesForStudent(courseIds),
    lastLessonIds.length > 0
      ? many(database.from("Lesson").select("*").in("id", lastLessonIds), "Last lessons could not be loaded.")
      : Promise.resolve([] as Tables<"Lesson">[]),
  ]);

  const courseMap = indexById(courses);
  const lessonMap = indexById(lastLessons);

  return {
    subscription: subscriptions[0] ?? null,
    enrollments: enrollments.map((enrollment) => ({
      ...enrollment,
      course: courseMap.get(enrollment.courseId) ?? null,
      lastLesson: enrollment.lastLessonId ? lessonMap.get(enrollment.lastLessonId) ?? null : null,
    })),
    progress: progress.map((item) => ({
      ...item,
      course: courseMap.get(item.courseId) ?? null,
      lastLesson: item.lastLessonId ? lessonMap.get(item.lastLessonId) ?? null : null,
    })),
    sessions: sessions.slice(0, 5),
    devices: devices.slice(0, 5),
  };
}

export async function getStudentLessonPageData(input: {
  viewerId?: string | null;
  viewerRole?: Tables<"User">["role"] | null;
  viewerStudentYear?: Tables<"User">["studentYear"] | null;
  courseSlug: string;
  lessonSlug: string;
}) {
  const course = await maybeOne(
    database.from("Course").select("*").eq("slug", input.courseSlug).maybeSingle(),
    "Course could not be loaded.",
  );

  if (!course) {
    return null;
  }

  if (input.viewerRole === "STUDENT" && input.viewerStudentYear && course.targetStudentYear !== input.viewerStudentYear) {
    return null;
  }

  const [instructors, modules, lessons] = await Promise.all([
    getUsersWithRelations([course.instructorId]),
    many(
      database.from("Module").select("*").eq("courseId", course.id).order("position", { ascending: true }),
      "Modules could not be loaded.",
    ),
    many(
      database.from("Lesson").select("*").eq("courseId", course.id).order("position", { ascending: true }),
      "Lessons could not be loaded.",
    ),
  ]);

  const currentVideoAssetIds = Array.from(
    new Set(lessons.map((lesson) => lesson.currentVideoAssetId).filter(Boolean)),
  ) as string[];
  const currentVideoAssets =
    currentVideoAssetIds.length > 0
      ? await many(
          database.from("VideoAsset").select("*").in("id", currentVideoAssetIds),
          "Video assets could not be loaded.",
        )
      : [];
  const currentVideoAssetMap = indexById(currentVideoAssets);

  const canSeeUnpublishedLessons =
    (input.viewerRole ? isAdminRole(input.viewerRole) : false) ||
    (input.viewerRole === "INSTRUCTOR" && input.viewerId === course.instructorId);

  const hydratedLessons = lessons.map((lesson) => ({
    ...lesson,
    currentVideoAsset: lesson.currentVideoAssetId
      ? currentVideoAssetMap.get(lesson.currentVideoAssetId) ?? null
      : null,
  }));

  const visibleLessons = hydratedLessons.filter(
    (lesson) => lesson.status === "PUBLISHED" || canSeeUnpublishedLessons,
  );
  const lesson = visibleLessons.find((candidate) => candidate.slug === input.lessonSlug);

  if (!lesson) {
    return null;
  }

  const lessonProgress = input.viewerId
    ? await maybeOne(
        database
          .from("LessonProgress")
          .select("*")
          .eq("userId", input.viewerId)
          .eq("lessonId", lesson.id)
          .maybeSingle(),
        "Progress could not be loaded.",
      )
    : null;

  const lessonsByModuleId = groupBy(visibleLessons, (candidate) => candidate.moduleId);
  const moduleTree = modules.map((module) => ({
    ...module,
    lessons: lessonsByModuleId.get(module.id) ?? [],
  }));
  const access = await resolveLessonAccess({
    viewerId: input.viewerId,
    viewerRole: input.viewerRole ?? null,
    viewerStudentYear: input.viewerStudentYear ?? null,
    course,
    lesson,
  });

  const currentIndex = visibleLessons.findIndex((candidate) => candidate.id === lesson.id);
  const previousLesson = currentIndex > 0 ? visibleLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < visibleLessons.length - 1 ? visibleLessons[currentIndex + 1] : null;

  if (
    input.viewerId &&
    input.viewerRole === "STUDENT" &&
    access.allowed &&
    (access.mode === "free" || access.mode === "enrolled")
  ) {
    await ensureEnrollmentForCourse(input.viewerId, course.id, lesson.id);
  }

  return {
    course: {
      ...course,
      instructor: instructors[0] ?? null,
      modules: moduleTree,
    },
    lesson,
    lessons: visibleLessons,
    access,
    previousLesson,
    nextLesson,
    progress: lessonProgress as Tables<"LessonProgress"> | null,
  };
}
