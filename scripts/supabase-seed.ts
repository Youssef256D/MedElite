import { createId, database } from "../src/lib/database";
import { hashPassword } from "../src/modules/auth/password";
import { ensureDefaultSiteSettings } from "../src/modules/site-settings/service";

type SeedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  studentYear?: "YEAR_1" | "YEAR_2" | "YEAR_3" | "YEAR_4" | "YEAR_5";
  status?: "ACTIVE" | "SUSPENDED" | "BANNED";
};

async function deleteAll(table: string) {
  const { error } = await database.from(table as never).delete().not("id", "is", null);

  if (error) {
    throw error;
  }
}

async function resetDatabase() {
  const tables = [
    "Ban",
    "SuspiciousEvent",
    "AuditLog",
    "Notification",
    "Session",
    "Device",
    "LessonProgress",
    "CourseProgress",
    "Enrollment",
    "Subscription",
    "UploadJob",
    "VideoAsset",
    "Resource",
    "CourseAnnouncement",
    "Lesson",
    "Module",
    "Course",
    "InstructorProfile",
    "Profile",
    "SiteSetting",
    "Category",
    "User",
  ];

  for (const table of tables) {
    await deleteAll(table);
  }
}

async function insertRows(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    return;
  }

  const { error } = await database.from(table as never).insert(rows as never);

  if (error) {
    throw error;
  }
}

async function main() {
  const now = new Date();
  const passwordHash = await hashPassword("MedElite123!");

  await resetDatabase();
  await ensureDefaultSiteSettings();

  const categories = [
    {
      id: createId(),
      name: "Cardiology",
      slug: "cardiology",
      description: "Clinical cardiology, ECG reasoning, and acute care essentials.",
      sortOrder: 1,
      updatedAt: now.toISOString(),
    },
    {
      id: createId(),
      name: "Pharmacology",
      slug: "pharmacology",
      description: "Core medication principles for students and junior doctors.",
      sortOrder: 2,
      updatedAt: now.toISOString(),
    },
    {
      id: createId(),
      name: "Anatomy",
      slug: "anatomy",
      description: "Focused anatomy review for exams and clinical recall.",
      sortOrder: 3,
      updatedAt: now.toISOString(),
    },
    {
      id: createId(),
      name: "Surgery",
      slug: "surgery",
      description: "Perioperative fundamentals and surgical reasoning.",
      sortOrder: 4,
      updatedAt: now.toISOString(),
    },
  ];

  await insertRows("Category", categories);

  const users: SeedUser[] = [
    {
      id: createId(),
      email: "student@medelite.local",
      firstName: "Mariam",
      lastName: "Hassan",
      role: "STUDENT",
      studentYear: "YEAR_3",
    },
    {
      id: createId(),
      email: "dr.sara@medelite.local",
      firstName: "Sara",
      lastName: "Mahmoud",
      role: "INSTRUCTOR",
    },
    {
      id: createId(),
      email: "dr.hadi@medelite.local",
      firstName: "Hadi",
      lastName: "Nasser",
      role: "INSTRUCTOR",
    },
    {
      id: createId(),
      email: "admin@medelite.local",
      firstName: "Admin",
      lastName: "Manager",
      role: "ADMIN",
    },
  ];

  const adminUser = users[3];

  await insertRows(
    "User",
    users.map((user) => ({
      id: user.id,
      email: user.email,
      passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      studentYear: user.studentYear ?? null,
      status: user.status ?? "ACTIVE",
      updatedAt: now.toISOString(),
    })),
  );

  await insertRows(
    "Profile",
    users.map((user) => ({
      id: createId(),
      userId: user.id,
      fullName: `${user.firstName} ${user.lastName}`,
      bio:
        user.role === "STUDENT"
          ? "Focused learner preparing for clinical practice and board-style assessments."
          : "Medical education professional building clear, trusted premium lessons.",
      updatedAt: now.toISOString(),
    })),
  );

  await insertRows("InstructorProfile", [
    {
      id: createId(),
      userId: users[1].id,
      title: "Consultant Cardiologist",
      specialty: "Cardiology",
      institution: "Cairo Heart Institute",
      expertise: ["ECG", "Acute coronary syndrome", "Clinical examination"],
      bio: "Builds highly structured cardiology and ECG training for exam success and clinical confidence.",
      isApproved: true,
      approvedAt: now.toISOString(),
      approvedById: adminUser.id,
      updatedAt: now.toISOString(),
    },
    {
      id: createId(),
      userId: users[2].id,
      title: "General Surgery Educator",
      specialty: "Surgery",
      institution: "Alexandria Teaching Hospital",
      expertise: ["Operative principles", "Anatomy review", "Perioperative care"],
      bio: "Creates premium surgical and anatomy review content for fast, practical learning.",
      isApproved: true,
      approvedAt: now.toISOString(),
      approvedById: adminUser.id,
      updatedAt: now.toISOString(),
    },
  ]);

  const courseBlueprints = [
    {
      id: createId(),
      title: "Cardiology Basics",
      slug: "cardiology-basics",
      shortDescription: "Essential cardiology foundations with high-yield clinical framing.",
      description:
        "A premium starter course covering cardiovascular physiology, chest pain evaluation, common syndromes, and structured bedside reasoning.",
      difficulty: "Beginner",
      estimatedHours: 10,
      isPremium: true,
      accessType: "PAID",
      priceCents: 45000,
      targetStudentYear: "YEAR_3",
      isFeatured: true,
      status: "PUBLISHED",
      approvedAt: now.toISOString(),
      approvedById: adminUser.id,
      submittedAt: now.toISOString(),
      publishedAt: now.toISOString(),
      categoryId: categories[0].id,
      instructorId: users[1].id,
    },
    {
      id: createId(),
      title: "ECG Interpretation",
      slug: "ecg-interpretation",
      shortDescription: "A practical framework for reading ECGs quickly and accurately.",
      description:
        "Learn an exam-ready and ward-ready process for rhythm analysis, axis, intervals, ischemia patterns, and dangerous ECG findings.",
      difficulty: "Intermediate",
      estimatedHours: 8,
      isPremium: true,
      accessType: "PAID",
      priceCents: 55000,
      targetStudentYear: "YEAR_3",
      isFeatured: true,
      status: "PUBLISHED",
      approvedAt: now.toISOString(),
      approvedById: adminUser.id,
      submittedAt: now.toISOString(),
      publishedAt: now.toISOString(),
      categoryId: categories[0].id,
      instructorId: users[1].id,
    },
    {
      id: createId(),
      title: "Pharmacology Foundations",
      slug: "pharmacology-foundations",
      shortDescription: "Core drug principles with practical classification and recall systems.",
      description:
        "A modern pharmacology starter that connects mechanisms, adverse effects, and high-yield memory anchors.",
      difficulty: "Beginner",
      estimatedHours: 9,
      isPremium: true,
      accessType: "PAID",
      priceCents: 40000,
      targetStudentYear: "YEAR_2",
      isFeatured: true,
      status: "PUBLISHED",
      approvedAt: now.toISOString(),
      approvedById: adminUser.id,
      submittedAt: now.toISOString(),
      publishedAt: now.toISOString(),
      categoryId: categories[1].id,
      instructorId: users[2].id,
    },
    {
      id: createId(),
      title: "Anatomy Review",
      slug: "anatomy-review",
      shortDescription: "Fast anatomical revision for major systems and clinical landmarks.",
      description:
        "Focused anatomy revision designed for rapid retention, OSCE prep, and clinical context.",
      difficulty: "Beginner",
      estimatedHours: 7,
      isPremium: false,
      accessType: "FREE",
      priceCents: 0,
      targetStudentYear: "YEAR_3",
      isFeatured: false,
      status: "PUBLISHED",
      approvedAt: now.toISOString(),
      approvedById: adminUser.id,
      submittedAt: now.toISOString(),
      publishedAt: now.toISOString(),
      categoryId: categories[2].id,
      instructorId: users[2].id,
    },
    {
      id: createId(),
      title: "Surgery Principles",
      slug: "surgery-principles",
      shortDescription: "Core operative and perioperative principles for students and interns.",
      description:
        "Covers wound care, asepsis, surgical workflow, acute abdomen basics, and safe perioperative thinking.",
      difficulty: "Intermediate",
      estimatedHours: 11,
      isPremium: true,
      accessType: "PAID",
      priceCents: 60000,
      targetStudentYear: "YEAR_4",
      isFeatured: false,
      status: "PUBLISHED",
      approvedAt: now.toISOString(),
      approvedById: adminUser.id,
      submittedAt: now.toISOString(),
      publishedAt: now.toISOString(),
      categoryId: categories[3].id,
      instructorId: users[2].id,
    },
  ];

  await insertRows(
    "Course",
    courseBlueprints.map((course) => ({
      ...course,
      updatedAt: now.toISOString(),
    })),
  );

  const modules: Record<string, unknown>[] = [];
  const lessons: Record<string, unknown>[] = [];
  const resources: Record<string, unknown>[] = [];
  const announcements: Record<string, unknown>[] = [];

  for (const [courseIndex, course] of courseBlueprints.entries()) {
    for (let moduleIndex = 0; moduleIndex < 2; moduleIndex += 1) {
      const moduleId = createId();
      modules.push({
        id: moduleId,
        courseId: course.id,
        title: `${course.title} Module ${moduleIndex + 1}`,
        description: moduleIndex === 0 ? "Conceptual foundations and frameworks." : "Clinical application and retention.",
        position: moduleIndex + 1,
        updatedAt: now.toISOString(),
      });

      for (let lessonIndex = 0; lessonIndex < 2; lessonIndex += 1) {
        const lessonId = createId();
        const preview = moduleIndex === 0 && lessonIndex === 0;
        lessons.push({
          id: lessonId,
          courseId: course.id,
          moduleId,
          slug: `${course.slug}-m${moduleIndex + 1}-l${lessonIndex + 1}`,
          title: `${course.title} Lesson ${moduleIndex + 1}.${lessonIndex + 1}`,
          summary: `A focused lesson on ${course.title.toLowerCase()} with clinical framing, structured explanation, and exam-relevant takeaways.`,
          content:
            "Key objectives, concept map, common pitfalls, and practical memory anchors for fast recall.",
          position: lessonIndex + 1,
          visibility: preview || !course.isPremium ? "PREVIEW" : "PREMIUM",
          status: "PUBLISHED",
          updatedAt: now.toISOString(),
        });

        resources.push({
          id: createId(),
          lessonId,
          courseId: course.id,
          title: `${course.title} Quick Review Sheet ${moduleIndex + 1}.${lessonIndex + 1}`,
          description: "A concise external revision aid for the lesson.",
          type: "LINK",
          externalUrl: `https://example.com/medelite/${course.slug}/lesson-${moduleIndex + 1}-${lessonIndex + 1}`,
          updatedAt: now.toISOString(),
        });
      }
    }

    announcements.push({
      id: createId(),
      courseId: course.id,
      instructorId: course.instructorId,
      title: `${course.title} is now live`,
      body: `Welcome to ${course.title}. Start with the preview lesson, then continue through the full structured sequence.`,
      status: "PUBLISHED",
      publishedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    if (courseIndex === 0) {
      announcements.push({
        id: createId(),
        courseId: course.id,
        instructorId: course.instructorId,
        title: "Weekly review plan added",
        body: "A suggested 7-day study plan is now linked in the course resources for guided revision.",
        status: "PUBLISHED",
        publishedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }
  }

  await insertRows("Module", modules);
  await insertRows("Lesson", lessons);
  await insertRows("Resource", resources);
  await insertRows("CourseAnnouncement", announcements);

  const student = users[0];
  await insertRows("Subscription", [
    {
      id: createId(),
      userId: student.id,
      planCode: "premium_monthly",
      planName: "Premium Monthly",
      status: "ACTIVE",
      startsAt: now.toISOString(),
      endsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      priceCents: 4900,
      currency: "USD",
      updatedAt: now.toISOString(),
    },
  ]);

  const firstCourseLessons = lessons.filter((lesson) => lesson.courseId === courseBlueprints[0].id);
  const secondCourseLessons = lessons.filter((lesson) => lesson.courseId === courseBlueprints[1].id);

  await insertRows("Enrollment", [
    {
      id: createId(),
      userId: student.id,
      courseId: courseBlueprints[0].id,
      status: "ACTIVE",
      lastLessonId: firstCourseLessons[1]?.id ?? null,
      progressPercent: 50,
      reviewedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: createId(),
      userId: student.id,
      courseId: courseBlueprints[1].id,
      status: "ACTIVE",
      lastLessonId: secondCourseLessons[0]?.id ?? null,
      progressPercent: 25,
      reviewedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ]);

  await insertRows("CourseProgress", [
    {
      id: createId(),
      userId: student.id,
      courseId: courseBlueprints[0].id,
      lastLessonId: firstCourseLessons[1]?.id ?? null,
      progressPercent: 50,
      totalLessonsCount: 4,
      completedLessonsCount: 2,
      updatedAt: now.toISOString(),
    },
    {
      id: createId(),
      userId: student.id,
      courseId: courseBlueprints[1].id,
      lastLessonId: secondCourseLessons[0]?.id ?? null,
      progressPercent: 25,
      totalLessonsCount: 4,
      completedLessonsCount: 1,
      updatedAt: now.toISOString(),
    },
  ]);

  await insertRows("LessonProgress", [
    {
      id: createId(),
      userId: student.id,
      lessonId: firstCourseLessons[0]?.id,
      courseId: courseBlueprints[0].id,
      secondsWatched: 640,
      lastPositionSeconds: 640,
      completed: true,
      completedAt: now.toISOString(),
      watchCount: 1,
      updatedAt: now.toISOString(),
    },
    {
      id: createId(),
      userId: student.id,
      lessonId: firstCourseLessons[1]?.id,
      courseId: courseBlueprints[0].id,
      secondsWatched: 320,
      lastPositionSeconds: 320,
      completed: false,
      watchCount: 2,
      updatedAt: now.toISOString(),
    },
  ].filter((row) => row.lessonId));

  await insertRows("Notification", [
    {
      id: createId(),
      userId: student.id,
      type: "INFO",
      status: "UNREAD",
      title: "Welcome to MedElite",
      message: "Your premium plan is active. Continue where you left off from the dashboard.",
    },
    {
      id: createId(),
      userId: users[1].id,
      type: "SUCCESS",
      status: "UNREAD",
      title: "Instructor profile approved",
      message: "Your instructor studio is active and ready for course publishing.",
    },
  ]);

  await insertRows("SuspiciousEvent", [
    {
      id: createId(),
      userId: student.id,
      type: "MULTIPLE_CONCURRENT_STREAMS",
      reason: "Seeded example event for moderation testing.",
      severity: 2,
      status: "OPEN",
    },
  ]);

  await insertRows("AuditLog", [
    {
      id: createId(),
      actorUserId: adminUser.id,
      entityType: "Course",
      entityId: courseBlueprints[0].id,
      action: "course.seeded",
      message: "Seeded published course for demo access.",
      metadata: { source: "supabase-seed" },
    },
    {
      id: createId(),
      actorUserId: adminUser.id,
      entityType: "User",
      entityId: users[1].id,
      action: "instructor.approved",
      message: "Seeded instructor approval.",
      metadata: { source: "supabase-seed" },
    },
  ]);

  console.log("Supabase seed complete.");
  console.log("Accounts ready:");
  console.log("- student@medelite.local / MedElite123!");
  console.log("- dr.sara@medelite.local / MedElite123!");
  console.log("- dr.hadi@medelite.local / MedElite123!");
  console.log("- admin@medelite.local / MedElite123!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
