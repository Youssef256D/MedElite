import { countRows, database, groupBy, indexById, many, type Role, type Tables } from "@/lib/database";

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

async function getCourseCounts(courseIds: string[]) {
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

async function decorateCourses(courses: Tables<"Course">[]) {
  if (courses.length === 0) {
    return [];
  }

  const [categories, instructors, counts] = await Promise.all([
    Array.from(new Set(courses.map((course) => course.categoryId).filter(Boolean))).length > 0
      ? many(
          database
            .from("Category")
            .select("*")
            .in(
              "id",
              Array.from(new Set(courses.map((course) => course.categoryId).filter(Boolean))) as string[],
            ),
          "Categories could not be loaded.",
        )
      : Promise.resolve([] as Tables<"Category">[]),
    getUsersWithRelations(Array.from(new Set(courses.map((course) => course.instructorId)))),
    getCourseCounts(courses.map((course) => course.id)),
  ]);

  const categoryMap = indexById(categories);
  const instructorMap = indexById(instructors);

  return courses.map((course) => ({
    ...course,
    category: course.categoryId ? categoryMap.get(course.categoryId) ?? null : null,
    instructor: instructorMap.get(course.instructorId) ?? null,
    _count: {
      lessons: counts.lessonsByCourseId.get(course.id) ?? 0,
      enrollments: counts.enrollmentsByCourseId.get(course.id) ?? 0,
    },
  }));
}

export async function getAdminDashboardData() {
  const [
    usersCount,
    instructorsCount,
    coursesCount,
    uploadJobsCount,
    suspiciousCount,
    activeSubscriptions,
    pendingCourseReviews,
    pendingEnrollmentReviews,
  ] = await Promise.all([
    countRows(database.from("User").select("*", { count: "exact", head: true }), "User count could not be loaded."),
    countRows(
      database.from("User").select("*", { count: "exact", head: true }).eq("role", "INSTRUCTOR"),
      "Instructor count could not be loaded.",
    ),
    countRows(database.from("Course").select("*", { count: "exact", head: true }), "Course count could not be loaded."),
    countRows(
      database.from("UploadJob").select("*", { count: "exact", head: true }),
      "Upload count could not be loaded.",
    ),
    countRows(
      database.from("SuspiciousEvent").select("*", { count: "exact", head: true }).eq("status", "OPEN"),
      "Suspicious event count could not be loaded.",
    ),
    countRows(
      database
        .from("Subscription")
        .select("*", { count: "exact", head: true })
        .in("status", ["ACTIVE", "TRIAL"]),
      "Subscription count could not be loaded.",
    ),
    countRows(
      database.from("Course").select("*", { count: "exact", head: true }).eq("status", "REVIEW"),
      "Pending course approvals could not be loaded.",
    ),
    countRows(
      database.from("Enrollment").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
      "Pending enrollment approvals could not be loaded.",
    ),
  ]);

  return {
    stats: {
      usersCount,
      instructorsCount,
      coursesCount,
      uploadJobsCount,
      suspiciousCount,
      activeSubscriptions,
      pendingCourseReviews,
      pendingEnrollmentReviews,
    },
  };
}

export async function getAdminUsers(input?: { role?: Role }) {
  let query = database.from("User").select("*").order("createdAt", { ascending: false });

  if (input?.role) {
    query = query.eq("role", input.role);
  }

  const users = await many(query, "Users could not be loaded.");

  if (users.length === 0) {
    return [];
  }

  const userIds = users.map((user) => user.id);
  const [profiles, subscriptions, sessions, devices, instructorProfiles, instructorCourses] = await Promise.all([
    many(database.from("Profile").select("*").in("userId", userIds), "Profiles could not be loaded."),
    many(
      database.from("Subscription").select("*").in("userId", userIds).order("startsAt", { ascending: false }),
      "Subscriptions could not be loaded.",
    ),
    many(database.from("Session").select("*").in("userId", userIds), "Sessions could not be loaded."),
    many(database.from("Device").select("*").in("userId", userIds), "Devices could not be loaded."),
    many(
      database.from("InstructorProfile").select("*").in("userId", userIds),
      "Instructor profiles could not be loaded.",
    ),
    many(
      database.from("Course").select("id, instructorId").in("instructorId", userIds),
      "Instructor course counts could not be loaded.",
    ),
  ]);

  const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
  const subscriptionsByUserId = groupBy(subscriptions, (subscription) => subscription.userId);
  const sessionsByUserId = groupBy(
    sessions.filter((session) => session.status === "ACTIVE" && !session.revokedAt),
    (session) => session.userId,
  );
  const devicesByUserId = groupBy(
    devices.filter((device) => device.status === "ACTIVE" && !device.revokedAt),
    (device) => device.userId,
  );
  const instructorProfileByUserId = new Map(instructorProfiles.map((profile) => [profile.userId, profile]));
  const coursesByInstructorId = groupBy(instructorCourses, (course) => course.instructorId);

  return users.map((user) => ({
    ...user,
    profile: profileByUserId.get(user.id) ?? null,
    subscriptions: (subscriptionsByUserId.get(user.id) ?? []).slice(0, 1),
    sessions: sessionsByUserId.get(user.id) ?? [],
    devices: devicesByUserId.get(user.id) ?? [],
    instructorProfile: instructorProfileByUserId.get(user.id) ?? null,
    coursesManagedCount: (coursesByInstructorId.get(user.id) ?? []).length,
  }));
}

export async function getAdminInstructors() {
  const instructors = await many(
    database.from("User").select("*").eq("role", "INSTRUCTOR").order("createdAt", { ascending: false }),
    "Instructors could not be loaded.",
  );

  if (instructors.length === 0) {
    return [];
  }

  const instructorIds = instructors.map((instructor) => instructor.id);
  const [profiles, instructorProfiles, courses] = await Promise.all([
    many(database.from("Profile").select("*").in("userId", instructorIds), "Profiles could not be loaded."),
    many(
      database.from("InstructorProfile").select("*").in("userId", instructorIds),
      "Instructor profiles could not be loaded.",
    ),
    many(
      database.from("Course").select("*").in("instructorId", instructorIds),
      "Instructor courses could not be loaded.",
    ),
  ]);

  const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
  const instructorProfileByUserId = new Map(
    instructorProfiles.map((profile) => [profile.userId, profile]),
  );
  const courseCounts = await getCourseCounts(courses.map((course) => course.id));
  const coursesByInstructorId = groupBy(courses, (course) => course.instructorId);

  return instructors.map((instructor) => ({
    ...instructor,
    profile: profileByUserId.get(instructor.id) ?? null,
    instructorProfile: instructorProfileByUserId.get(instructor.id) ?? null,
    courses: (coursesByInstructorId.get(instructor.id) ?? []).map((course) => ({
      ...course,
      _count: {
        lessons: courseCounts.lessonsByCourseId.get(course.id) ?? 0,
        enrollments: courseCounts.enrollmentsByCourseId.get(course.id) ?? 0,
      },
    })),
  }));
}

export async function getAdminCourses() {
  const courses = await many(
    database.from("Course").select("*").order("updatedAt", { ascending: false }),
    "Courses could not be loaded.",
  );

  const decorated = await decorateCourses(courses);

  return decorated.sort((left, right) => {
    if (left.status === "REVIEW" && right.status !== "REVIEW") {
      return -1;
    }

    if (right.status === "REVIEW" && left.status !== "REVIEW") {
      return 1;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export async function getAdminEnrollmentRequests() {
  const enrollments = await many(
    database
      .from("Enrollment")
      .select("*")
      .eq("status", "PENDING")
      .order("paymentSubmittedAt", { ascending: false })
      .order("createdAt", { ascending: false }),
    "Enrollment requests could not be loaded.",
  );

  if (enrollments.length === 0) {
    return [];
  }

  const userIds = Array.from(new Set(enrollments.map((enrollment) => enrollment.userId)));
  const courseIds = Array.from(new Set(enrollments.map((enrollment) => enrollment.courseId)));
  const reviewerIds = Array.from(new Set(enrollments.map((enrollment) => enrollment.reviewedById).filter(Boolean))) as string[];

  const [users, courses, reviewers] = await Promise.all([
    getUsersWithRelations(userIds),
    many(database.from("Course").select("*").in("id", courseIds), "Enrollment courses could not be loaded."),
    reviewerIds.length > 0 ? getUsersWithRelations(reviewerIds) : Promise.resolve([] as UserWithRelations[]),
  ]);

  const userMap = indexById(users);
  const courseMap = indexById(courses);
  const reviewerMap = indexById(reviewers);

  return enrollments.map((enrollment) => ({
    ...enrollment,
    user: userMap.get(enrollment.userId) ?? null,
    course: courseMap.get(enrollment.courseId) ?? null,
    reviewedBy: enrollment.reviewedById ? reviewerMap.get(enrollment.reviewedById) ?? null : null,
  }));
}

export async function getAdminUploadJobs() {
  const uploadJobs = await many(
    database.from("UploadJob").select("*").order("createdAt", { ascending: false }),
    "Upload jobs could not be loaded.",
  );

  if (uploadJobs.length === 0) {
    return [];
  }

  const [courses, lessons, instructors, videoAssets] = await Promise.all([
    many(
      database
        .from("Course")
        .select("*")
        .in(
          "id",
          Array.from(new Set(uploadJobs.map((job) => job.courseId))),
        ),
      "Courses could not be loaded.",
    ),
    many(
      database
        .from("Lesson")
        .select("*")
        .in(
          "id",
          Array.from(new Set(uploadJobs.map((job) => job.lessonId))),
        ),
      "Lessons could not be loaded.",
    ),
    getUsersWithRelations(Array.from(new Set(uploadJobs.map((job) => job.instructorId)))),
    many(
      database
        .from("VideoAsset")
        .select("*")
        .in(
          "originalUploadJobId",
          uploadJobs.map((job) => job.id),
        ),
      "Video assets could not be loaded.",
    ),
  ]);

  const courseMap = indexById(courses);
  const lessonMap = indexById(lessons);
  const instructorMap = indexById(instructors);
  const videoAssetByJobId = new Map(videoAssets.map((asset) => [asset.originalUploadJobId, asset]));

  return uploadJobs.map((job) => ({
    ...job,
    course: courseMap.get(job.courseId) ?? null,
    lesson: lessonMap.get(job.lessonId) ?? null,
    instructor: instructorMap.get(job.instructorId) ?? null,
    videoAsset: videoAssetByJobId.get(job.id) ?? null,
  }));
}

export async function getAdminSuspiciousEvents() {
  const events = (
    await many(
    database
      .from("SuspiciousEvent")
      .select("*")
      .order("severity", { ascending: false })
      .order("createdAt", { ascending: false }),
    "Suspicious events could not be loaded.",
    )
  ).filter((event) => !event.reason?.startsWith("Seeded example event"));

  if (events.length === 0) {
    return [];
  }

  const userIds = Array.from(new Set(events.map((event) => event.userId).filter(Boolean))) as string[];
  const sessionIds = Array.from(new Set(events.map((event) => event.sessionId).filter(Boolean))) as string[];
  const deviceIds = Array.from(new Set(events.map((event) => event.deviceId).filter(Boolean))) as string[];

  const [users, sessions, devices] = await Promise.all([
    getUsersWithRelations(userIds),
    sessionIds.length > 0
      ? many(database.from("Session").select("*").in("id", sessionIds), "Sessions could not be loaded.")
      : Promise.resolve([] as Tables<"Session">[]),
    deviceIds.length > 0
      ? many(database.from("Device").select("*").in("id", deviceIds), "Devices could not be loaded.")
      : Promise.resolve([] as Tables<"Device">[]),
  ]);

  const userMap = indexById(users);
  const sessionMap = indexById(sessions);
  const deviceMap = indexById(devices);

  return events.map((event) => ({
    ...event,
    user: event.userId ? userMap.get(event.userId) ?? null : null,
    session: event.sessionId ? sessionMap.get(event.sessionId) ?? null : null,
    device: event.deviceId ? deviceMap.get(event.deviceId) ?? null : null,
  }));
}

export async function getAdminAuditLogs() {
  const logs = await many(
    database.from("AuditLog").select("*").order("createdAt", { ascending: false }).limit(100),
    "Audit logs could not be loaded.",
  );

  return logs.filter((log) => {
    const metadataSource =
      log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
        ? log.metadata.source
        : null;

    return metadataSource !== "supabase-seed" && log.action !== "course.seeded" && !log.message.startsWith("Seeded ");
  });
}

export async function getAdminSiteSettings() {
  return many(
    database.from("SiteSetting").select("*").order("group", { ascending: true }).order("key", { ascending: true }),
    "Site settings could not be loaded.",
  );
}
