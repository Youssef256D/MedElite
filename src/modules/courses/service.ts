import {
  CourseStatus,
  database,
  groupBy,
  indexById,
  many,
  maybeOne,
  type Role,
  type StudentYear,
  type Tables,
} from "@/lib/database";

type UserWithRelations = Tables<"User"> & {
  profile: Tables<"Profile"> | null;
  instructorProfile: Tables<"InstructorProfile"> | null;
};

type LessonWithRelations = Tables<"Lesson"> & {
  resources: Tables<"Resource">[];
  currentVideoAsset: Tables<"VideoAsset"> | null;
  videoAssets?: Tables<"VideoAsset">[];
};

type ModuleWithRelations = Tables<"Module"> & {
  lessons: LessonWithRelations[];
};

type CourseWithRelations = Tables<"Course"> & {
  category: Tables<"Category"> | null;
  instructor: UserWithRelations | null;
  lessons?: LessonWithRelations[];
  modules?: ModuleWithRelations[];
  announcements?: (Tables<"CourseAnnouncement"> & { course?: Tables<"Course"> | null })[];
  enrollments?: Tables<"Enrollment">[];
  _count: {
    lessons: number;
    enrollments: number;
  };
  _stats: {
    videos: number;
    averageVideoDurationSeconds: number | null;
  };
};

function getVideoStats(input: {
  lessons?: LessonWithRelations[];
  modules?: ModuleWithRelations[];
}) {
  const lessons =
    input.lessons ??
    input.modules?.flatMap((module) => module.lessons) ??
    [];
  const durations = lessons
    .map((lesson) => lesson.durationSeconds ?? lesson.currentVideoAsset?.durationSeconds ?? 0)
    .filter((duration) => duration > 0);

  return {
    videos: durations.length,
    averageVideoDurationSeconds:
      durations.length > 0
        ? Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length)
        : null,
  };
}

function sortByDateDesc<T extends { publishedAt?: Date | null; updatedAt?: Date | null; createdAt?: Date | null }>(
  records: T[],
  field: "publishedAt" | "updatedAt" | "createdAt",
) {
  return [...records].sort((left, right) => {
    const leftValue = left[field]?.getTime() ?? 0;
    const rightValue = right[field]?.getTime() ?? 0;
    return rightValue - leftValue;
  });
}

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

async function getCounts(courseIds: string[]) {
  if (courseIds.length === 0) {
    return {
      lessonsByCourseId: new Map<string, number>(),
      enrollmentsByCourseId: new Map<string, number>(),
    };
  }

  const [lessons, enrollments] = await Promise.all([
    many(database.from("Lesson").select("id, courseId").in("courseId", courseIds), "Lessons could not be counted."),
    many(
      database
        .from("Enrollment")
        .select("id, courseId")
        .in("courseId", courseIds)
        .in("status", ["ACTIVE", "COMPLETED"]),
      "Enrollments could not be counted.",
    ),
  ]);

  const lessonsByCourseId = new Map<string, number>();
  for (const lesson of lessons) {
    lessonsByCourseId.set(lesson.courseId, (lessonsByCourseId.get(lesson.courseId) ?? 0) + 1);
  }

  const enrollmentsByCourseId = new Map<string, number>();
  for (const enrollment of enrollments) {
    enrollmentsByCourseId.set(
      enrollment.courseId,
      (enrollmentsByCourseId.get(enrollment.courseId) ?? 0) + 1,
    );
  }

  return {
    lessonsByCourseId,
    enrollmentsByCourseId,
  };
}

async function getLessonsByCourseIds(
  courseIds: string[],
  options?: { publishedOnly?: boolean; includeResources?: boolean; includeVideoAssets?: boolean },
) {
  if (courseIds.length === 0) {
    return [] as LessonWithRelations[];
  }

  let lessonQuery = database
    .from("Lesson")
    .select("*")
    .in("courseId", courseIds)
    .order("position", { ascending: true });

  if (options?.publishedOnly) {
    lessonQuery = lessonQuery.eq("status", "PUBLISHED");
  }

  const lessons = await many(lessonQuery, "Lessons could not be loaded.");
  const currentVideoAssetIds = Array.from(
    new Set(lessons.map((lesson) => lesson.currentVideoAssetId).filter(Boolean)),
  ) as string[];
  const lessonIds = lessons.map((lesson) => lesson.id);

  const [resources, currentVideoAssets, videoAssets] = await Promise.all([
    options?.includeResources && lessonIds.length > 0
      ? many(database.from("Resource").select("*").in("lessonId", lessonIds), "Resources could not be loaded.")
      : Promise.resolve([] as Tables<"Resource">[]),
    currentVideoAssetIds.length > 0
      ? many(
          database.from("VideoAsset").select("*").in("id", currentVideoAssetIds),
          "Video assets could not be loaded.",
        )
      : Promise.resolve([] as Tables<"VideoAsset">[]),
    options?.includeVideoAssets && lessonIds.length > 0
      ? many(
          database.from("VideoAsset").select("*").in("lessonId", lessonIds).order("version", { ascending: false }),
          "Lesson video history could not be loaded.",
        )
      : Promise.resolve([] as Tables<"VideoAsset">[]),
  ]);

  const resourcesByLessonId = groupBy(resources, (resource) => resource.lessonId ?? "");
  const currentVideoAssetMap = indexById(currentVideoAssets);
  const videoAssetsByLessonId = groupBy(videoAssets, (asset) => asset.lessonId);

  return lessons.map((lesson) => ({
    ...lesson,
    resources: resourcesByLessonId.get(lesson.id) ?? [],
    currentVideoAsset: lesson.currentVideoAssetId
      ? currentVideoAssetMap.get(lesson.currentVideoAssetId) ?? null
      : null,
    videoAssets: options?.includeVideoAssets ? videoAssetsByLessonId.get(lesson.id) ?? [] : undefined,
  }));
}

async function getModulesWithLessons(
  courseIds: string[],
  options?: { publishedLessonsOnly?: boolean; includeResources?: boolean; includeVideoAssets?: boolean },
) {
  if (courseIds.length === 0) {
    return [] as ModuleWithRelations[];
  }

  const [modules, lessons] = await Promise.all([
    many(
      database.from("Module").select("*").in("courseId", courseIds).order("position", { ascending: true }),
      "Modules could not be loaded.",
    ),
    getLessonsByCourseIds(courseIds, {
      publishedOnly: options?.publishedLessonsOnly,
      includeResources: options?.includeResources,
      includeVideoAssets: options?.includeVideoAssets,
    }),
  ]);

  const lessonsByModuleId = groupBy(lessons, (lesson) => lesson.moduleId);

  return modules.map((module) => ({
    ...module,
    lessons: lessonsByModuleId.get(module.id) ?? [],
  }));
}

async function decorateCourses(
  courses: Tables<"Course">[],
  options?: {
    includeLessons?: boolean;
    includeModules?: boolean;
    publishedLessonsOnly?: boolean;
    includeResources?: boolean;
    includeVideoAssets?: boolean;
    includeAnnouncements?: boolean;
    announcementStatus?: Tables<"CourseAnnouncement">["status"];
    announcementLimit?: number;
    includeEnrollments?: boolean;
    enrollmentStatus?: Tables<"Enrollment">["status"];
  },
) {
  if (courses.length === 0) {
    return [] as CourseWithRelations[];
  }

  const courseIds = courses.map((course) => course.id);
  const categoryIds = Array.from(new Set(courses.map((course) => course.categoryId).filter(Boolean))) as string[];
  const instructorIds = Array.from(new Set(courses.map((course) => course.instructorId)));

  const [categories, instructors, counts, lessons, modules, announcements, enrollments] = await Promise.all([
    categoryIds.length > 0
      ? many(database.from("Category").select("*").in("id", categoryIds), "Categories could not be loaded.")
      : Promise.resolve([] as Tables<"Category">[]),
    getUsersWithRelations(instructorIds),
    getCounts(courseIds),
    options?.includeLessons
      ? getLessonsByCourseIds(courseIds, {
          publishedOnly: options.publishedLessonsOnly,
          includeResources: options.includeResources,
          includeVideoAssets: options.includeVideoAssets,
        })
      : Promise.resolve([] as LessonWithRelations[]),
    options?.includeModules
      ? getModulesWithLessons(courseIds, {
          publishedLessonsOnly: options.publishedLessonsOnly,
          includeResources: options.includeResources,
          includeVideoAssets: options.includeVideoAssets,
        })
      : Promise.resolve([] as ModuleWithRelations[]),
    options?.includeAnnouncements
      ? many(
          database
            .from("CourseAnnouncement")
            .select("*")
            .in("courseId", courseIds)
            .order("publishedAt", { ascending: false })
            .order("createdAt", { ascending: false }),
          "Announcements could not be loaded.",
        )
      : Promise.resolve([] as Tables<"CourseAnnouncement">[]),
    options?.includeEnrollments
      ? many(database.from("Enrollment").select("*").in("courseId", courseIds), "Enrollments could not be loaded.")
      : Promise.resolve([] as Tables<"Enrollment">[]),
  ]);

  const categoryMap = indexById(categories);
  const instructorMap = indexById(instructors);
  const lessonsByCourseId = groupBy(lessons, (lesson) => lesson.courseId);
  const modulesByCourseId = groupBy(modules, (module) => module.courseId);
  const enrollmentsByCourseId = groupBy(
    options?.enrollmentStatus
      ? enrollments.filter((enrollment) => enrollment.status === options.enrollmentStatus)
      : enrollments,
    (enrollment) => enrollment.courseId,
  );
  const announcementsByCourseId = groupBy(
    options?.announcementStatus
      ? announcements.filter((announcement) => announcement.status === options.announcementStatus)
      : announcements,
    (announcement) => announcement.courseId,
  );

  return courses.map((course) => {
    const courseAnnouncements = announcementsByCourseId.get(course.id) ?? [];
    const courseLessons = options?.includeLessons ? lessonsByCourseId.get(course.id) ?? [] : undefined;
    const courseModules = options?.includeModules ? modulesByCourseId.get(course.id) ?? [] : undefined;
    return {
      ...course,
      category: course.categoryId ? categoryMap.get(course.categoryId) ?? null : null,
      instructor: instructorMap.get(course.instructorId) ?? null,
      lessons: courseLessons,
      modules: courseModules,
      announcements: options?.includeAnnouncements
        ? courseAnnouncements.slice(0, options.announcementLimit ?? courseAnnouncements.length)
        : undefined,
      enrollments: options?.includeEnrollments ? enrollmentsByCourseId.get(course.id) ?? [] : undefined,
      _count: {
        lessons: counts.lessonsByCourseId.get(course.id) ?? 0,
        enrollments: counts.enrollmentsByCourseId.get(course.id) ?? 0,
      },
      _stats: getVideoStats({
        lessons: courseLessons,
        modules: courseModules,
      }),
    };
  });
}

export async function getCategories() {
  return many(
    database.from("Category").select("*").order("sortOrder", { ascending: true }),
    "Categories could not be loaded.",
  );
}

export async function getFeaturedCourses() {
  const courses = await many(
    database
      .from("Course")
      .select("*")
      .eq("status", CourseStatus.PUBLISHED)
      .eq("isFeatured", true),
    "Featured courses could not be loaded.",
  );

  const decorated = await decorateCourses(
    sortByDateDesc(courses, "publishedAt").sort((left, right) => left.title.localeCompare(right.title)).slice(0, 3),
    {
      includeModules: true,
      publishedLessonsOnly: true,
    },
  );

  return decorated;
}

export async function getCourseCatalog(input?: { studentYear?: StudentYear | null }) {
  let query = database.from("Course").select("*").eq("status", CourseStatus.PUBLISHED);

  if (input?.studentYear) {
    query = query.eq("targetStudentYear", input.studentYear);
  }

  const courses = await many(
    query,
    "Course catalog could not be loaded.",
  );

  const decorated = await decorateCourses(
    [...courses].sort((left, right) => {
      if (left.isFeatured !== right.isFeatured) {
        return Number(right.isFeatured) - Number(left.isFeatured);
      }

      return (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0);
    }),
    {
      includeLessons: true,
      publishedLessonsOnly: true,
    },
  );

  return decorated;
}

export async function getPublicCourseBySlug(slug: string) {
  const course = await maybeOne(
    database.from("Course").select("*").eq("slug", slug).eq("status", CourseStatus.PUBLISHED).maybeSingle(),
    "Course could not be loaded.",
  );

  if (!course) {
    return null;
  }

  const [decoratedCourse] = await decorateCourses([course], {
    includeModules: true,
    publishedLessonsOnly: true,
    includeResources: true,
    includeAnnouncements: true,
    announcementStatus: "PUBLISHED",
    announcementLimit: 5,
  });

  return decoratedCourse ?? null;
}

export async function getStudentCourseBySlug(input: {
  slug: string;
  viewerId?: string | null;
  viewerRole?: Role | null;
  studentYear?: StudentYear | null;
}) {
  const course = await getPublicCourseBySlug(input.slug);

  if (!course) {
    return null;
  }

  if (input.viewerRole === "STUDENT" && input.studentYear && course.targetStudentYear !== input.studentYear) {
    return null;
  }

  const viewerEnrollment = input.viewerId
    ? await maybeOne(
        database
          .from("Enrollment")
          .select("*")
          .eq("userId", input.viewerId)
          .eq("courseId", course.id)
          .maybeSingle(),
        "Enrollment could not be loaded.",
      )
    : null;

  return {
    ...course,
    viewerEnrollment,
  };
}

export async function getInstructorCourses(instructorId: string) {
  const courses = await many(
    database
      .from("Course")
      .select("*")
      .eq("instructorId", instructorId)
      .order("updatedAt", { ascending: false })
      .order("createdAt", { ascending: false }),
    "Instructor courses could not be loaded.",
  );

  return decorateCourses(courses, {
    includeModules: true,
    includeEnrollments: true,
    enrollmentStatus: "ACTIVE",
  });
}

export async function getInstructorCourseBuilder(courseId: string, instructorId: string) {
  const course = await maybeOne(
    database
      .from("Course")
      .select("*")
      .eq("id", courseId)
      .eq("instructorId", instructorId)
      .maybeSingle(),
    "Course could not be loaded.",
  );

  if (!course) {
    return null;
  }

  const [decoratedCourse] = await decorateCourses([course], {
    includeModules: true,
    includeResources: true,
    includeVideoAssets: true,
  });

  return decoratedCourse ?? null;
}

export async function getInstructorDashboardData(instructorId: string) {
  const [courses, uploads, enrollments] = await Promise.all([
    many(
      database.from("Course").select("*").eq("instructorId", instructorId).order("updatedAt", { ascending: false }),
      "Instructor courses could not be loaded.",
    ),
    many(
      database.from("UploadJob").select("*").eq("instructorId", instructorId).order("createdAt", { ascending: false }),
      "Upload jobs could not be loaded.",
    ),
    many(
      database.from("Enrollment").select("*").order("createdAt", { ascending: false }),
      "Enrollments could not be loaded.",
    ),
  ]);

  const decoratedCourses = await decorateCourses(courses, {});
  const courseMap = indexById(courses);
  const uploadCourseIds = Array.from(new Set(uploads.map((upload) => upload.courseId)));
  const uploadLessonIds = Array.from(new Set(uploads.map((upload) => upload.lessonId)));
  const uploadJobIds = uploads.map((upload) => upload.id);
  const [uploadCourses, uploadLessons, uploadAssets] = await Promise.all([
    uploadCourseIds.length > 0
      ? many(database.from("Course").select("*").in("id", uploadCourseIds), "Upload courses could not be loaded.")
      : Promise.resolve([] as Tables<"Course">[]),
    uploadLessonIds.length > 0
      ? many(database.from("Lesson").select("*").in("id", uploadLessonIds), "Upload lessons could not be loaded.")
      : Promise.resolve([] as Tables<"Lesson">[]),
    uploadJobIds.length > 0
      ? many(
          database.from("VideoAsset").select("*").in("originalUploadJobId", uploadJobIds),
          "Upload assets could not be loaded.",
        )
      : Promise.resolve([] as Tables<"VideoAsset">[]),
  ]);

  const uploadCourseMap = indexById(uploadCourses);
  const uploadLessonMap = indexById(uploadLessons);
  const uploadAssetByJobId = new Map(uploadAssets.map((asset) => [asset.originalUploadJobId, asset]));

  const instructorCourseIds = new Set(courses.map((course) => course.id));
  const instructorEnrollments = enrollments
    .filter(
      (enrollment) =>
        instructorCourseIds.has(enrollment.courseId) &&
        ["ACTIVE", "COMPLETED"].includes(enrollment.status),
    )
    .map((enrollment) => ({
      ...enrollment,
      course: courseMap.get(enrollment.courseId) ?? null,
    }));

  return {
    courses: decoratedCourses.slice(0, 4),
    uploads: uploads.slice(0, 6).map((upload) => ({
      ...upload,
      lesson: uploadLessonMap.get(upload.lessonId) ?? null,
      course: uploadCourseMap.get(upload.courseId) ?? null,
      videoAsset: uploadAssetByJobId.get(upload.id) ?? null,
    })),
    enrollments: instructorEnrollments,
    stats: {
      totalCourses: courses.length,
      publishedCourses: courses.filter((course) => course.status === "PUBLISHED").length,
      activeUploads: uploads.filter((job) => ["UPLOADING", "QUEUED", "PROCESSING"].includes(job.status)).length,
      totalEnrollments: instructorEnrollments.length,
    },
  };
}

export async function getInstructorAnnouncements(instructorId: string) {
  const announcements = await many(
    database
      .from("CourseAnnouncement")
      .select("*")
      .eq("instructorId", instructorId)
      .order("createdAt", { ascending: false }),
    "Announcements could not be loaded.",
  );

  if (announcements.length === 0) {
    return [];
  }

  const courses = await many(
    database
      .from("Course")
      .select("*")
      .in(
        "id",
        Array.from(new Set(announcements.map((announcement) => announcement.courseId))),
      ),
    "Announcement courses could not be loaded.",
  );
  const courseMap = indexById(courses);

  return announcements.map((announcement) => ({
    ...announcement,
    course: courseMap.get(announcement.courseId) ?? null,
  }));
}
