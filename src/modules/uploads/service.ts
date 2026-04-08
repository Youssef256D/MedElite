import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { once } from "node:events";
import os from "node:os";
import path from "node:path";

import {
  LessonStatus,
  LessonVisibility,
  UploadJobStatus,
  countRows,
  createId,
  database,
  many,
  maybeOne,
  type Tables,
} from "@/lib/database";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { storage } from "@/lib/storage";
import { slugify } from "@/lib/utils";
import { messages } from "@/messages";
import { canManageCourse } from "@/modules/auth/permissions";
import { requireRoles } from "@/modules/auth/service";
import { recordAuditLogFromRequest } from "@/modules/audit/service";
import { getUploadSettings } from "@/modules/site-settings/service";
import { uploadChunkSchema, uploadInitSchema } from "@/modules/uploads/validation";

const tempRoot = path.resolve(
  env.UPLOAD_TEMP_ROOT.startsWith("/")
    ? env.UPLOAD_TEMP_ROOT
    : path.join(/* turbopackIgnore: true */ process.cwd(), env.UPLOAD_TEMP_ROOT || path.join(os.tmpdir(), "medelite-uploads")),
);

type UploadJobWithRelations = Tables<"UploadJob"> & {
  lesson: Tables<"Lesson"> | null;
  course: Tables<"Course"> | null;
  videoAsset: Tables<"VideoAsset"> | null;
};

function getChunkStorageKey(tempStorageKey: string, chunkIndex: number) {
  return `${tempStorageKey}/chunks/chunk-${chunkIndex}`;
}

function getMergedPath(uploadJobId: string) {
  return path.join(tempRoot, uploadJobId, "merged-upload.bin");
}

async function ensureTempRoot() {
  await mkdir(tempRoot, { recursive: true });
}

async function assertUploadPermissions(courseId: string) {
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

function normalizeLessonName(input: string) {
  return input.replace(/^video\s+\d+\s*[-:]\s*/i, "").trim();
}

async function getOrCreateUploadModule(courseId: string) {
  const existingModule = await maybeOne(
    database
      .from("Module")
      .select("*")
      .eq("courseId", courseId)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle(),
    "Course modules could not be loaded.",
  );

  if (existingModule) {
    return existingModule;
  }

  const position =
    (await countRows(
      database.from("Module").select("*", { count: "exact", head: true }).eq("courseId", courseId),
      "Module count could not be loaded.",
    )) + 1;

  const moduleRecord = await maybeOne(
    database
      .from("Module")
      .insert({
        id: createId(),
        courseId,
        title: "Main lessons",
        description: "Auto-created module for uploaded lesson videos.",
        position,
        updatedAt: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle(),
    "A default module could not be created.",
  );

  if (!moduleRecord) {
    throw new AppError("A default module could not be created.", "INTERNAL_ERROR", 500);
  }

  return moduleRecord;
}

async function createLessonShellForUpload(courseId: string, lessonTitle: string) {
  const cleanTitle = normalizeLessonName(lessonTitle);

  if (!cleanTitle) {
    throw new AppError("Lesson name is required.", "VALIDATION_ERROR", 400);
  }

  const [moduleRecord, lessonCount] = await Promise.all([
    getOrCreateUploadModule(courseId),
    countRows(
      database.from("Lesson").select("*", { count: "exact", head: true }).eq("courseId", courseId),
      "Lesson count could not be loaded.",
    ),
  ]);
  const nextPosition = lessonCount + 1;
  const numberedTitle = `Video ${String(nextPosition).padStart(2, "0")} - ${cleanTitle}`;

  const lesson = await maybeOne(
    database
      .from("Lesson")
      .insert({
        id: createId(),
        courseId,
        moduleId: moduleRecord.id,
        slug: `${slugify(numberedTitle)}-${Math.random().toString(36).slice(2, 6)}`,
        title: numberedTitle,
        summary: `Video lesson for ${cleanTitle}.`,
        content: null,
        position: nextPosition,
        visibility: LessonVisibility.PREMIUM,
        status: LessonStatus.PUBLISHED,
        updatedAt: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle(),
    "Lesson could not be created for upload.",
  );

  if (!lesson) {
    throw new AppError("Lesson could not be created for upload.", "INTERNAL_ERROR", 500);
  }

  return lesson;
}

async function assembleChunks(tempStorageKey: string, uploadJobId: string, totalChunks: number) {
  const mergedPath = getMergedPath(uploadJobId);
  await mkdir(path.dirname(mergedPath), { recursive: true });
  const writer = createWriteStream(mergedPath);

  for (let index = 0; index < totalChunks; index += 1) {
    const { stream: reader } = await storage.createReadStream(getChunkStorageKey(tempStorageKey, index));
    reader.pipe(writer, { end: false });
    await once(reader, "end");
  }

  writer.end();
  await once(writer, "finish");
  return mergedPath;
}

async function removeTemporaryUploadArtifacts(uploadJob: {
  id: string;
  tempStorageKey: string;
  uploadedChunks: number[] | null;
}) {
  await Promise.allSettled(
    (uploadJob.uploadedChunks ?? []).map((chunkIndex) =>
      storage.deleteObject(getChunkStorageKey(uploadJob.tempStorageKey, chunkIndex)),
    ),
  );
  await rm(path.join(tempRoot, uploadJob.id), { recursive: true, force: true });
}

async function hydrateUploadJob(uploadJobId: string): Promise<UploadJobWithRelations | null> {
  const uploadJob = await maybeOne(
    database.from("UploadJob").select("*").eq("id", uploadJobId).maybeSingle(),
    "Upload job could not be loaded.",
  );

  if (!uploadJob) {
    return null;
  }

  const [lesson, course, videoAssets] = await Promise.all([
    maybeOne(database.from("Lesson").select("*").eq("id", uploadJob.lessonId).maybeSingle(), "Lesson not found."),
    maybeOne(database.from("Course").select("*").eq("id", uploadJob.courseId).maybeSingle(), "Course not found."),
    many(
      database.from("VideoAsset").select("*").eq("originalUploadJobId", uploadJob.id).order("createdAt", { ascending: false }),
      "Upload assets could not be loaded.",
    ),
  ]);

  return {
    ...uploadJob,
    lesson,
    course,
    videoAsset: videoAssets[0] ?? null,
  };
}

export async function createUploadJob(input: {
  courseId: string;
  lessonId?: string;
  lessonTitle?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number;
}): Promise<Tables<"UploadJob">> {
  await ensureTempRoot();
  const payload = uploadInitSchema.parse(input);
  const [{ user, course }, settings] = await Promise.all([
    assertUploadPermissions(payload.courseId),
    getUploadSettings(),
  ]);
  const lesson = payload.lessonId
    ? await maybeOne(
        database.from("Lesson").select("id, courseId").eq("id", payload.lessonId).maybeSingle(),
        "Lesson could not be loaded.",
      )
    : await createLessonShellForUpload(course.id, payload.lessonTitle ?? "");

  if (!lesson || lesson.courseId !== course.id) {
    throw new AppError("Lesson not found.", "NOT_FOUND", 404);
  }

  if (!settings.allowedMimeTypes.some((mimeType) => mimeType === payload.mimeType)) {
    throw new AppError(messages.upload.unsupportedFormat, "VALIDATION_ERROR", 400);
  }

  if (payload.sizeBytes > settings.maxUploadSizeBytes) {
    throw new AppError(messages.upload.fileTooLarge, "VALIDATION_ERROR", 400);
  }

  const totalChunks = Math.ceil(payload.sizeBytes / settings.chunkSizeBytes);
  const fileSlug = slugify(payload.fileName.replace(/\.[^/.]+$/, "")) || "lesson-video";
  const uploadJob = await maybeOne(
    database
      .from("UploadJob")
      .insert({
        id: createId(),
        instructorId: user.id,
        courseId: course.id,
        lessonId: lesson.id,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        sizeBytes: payload.sizeBytes,
        durationSeconds: payload.durationSeconds,
        chunkSize: settings.chunkSizeBytes,
        totalChunks,
        tempStorageKey: `tmp/uploads/${course.id}/${lesson.id}/${Date.now()}-${fileSlug}`,
        finalStorageKey: `videos/${course.id}/${lesson.id}/${Date.now()}-${fileSlug}${path.extname(payload.fileName)}`,
        status: UploadJobStatus.CREATED,
        updatedAt: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle(),
    "Upload job could not be created.",
  );

  if (!uploadJob) {
    throw new AppError("Upload job could not be created.", "INTERNAL_ERROR", 500);
  }

  await recordAuditLogFromRequest({
    actorUserId: user.id,
    entityType: "UploadJob",
    entityId: uploadJob.id,
    action: "upload.created",
    message: "A resumable upload job was created.",
    metadata: {
      lessonId: lesson.id,
      courseId: course.id,
      totalChunks,
    },
  });

  return uploadJob;
}

export async function getUploadJobStatus(uploadJobId: string): Promise<UploadJobWithRelations> {
  const user = await requireRoles(["INSTRUCTOR", "ADMIN"]);
  const uploadJob = await hydrateUploadJob(uploadJobId);

  if (!uploadJob) {
    throw new AppError("Upload job not found.", "NOT_FOUND", 404);
  }

  if (uploadJob.instructorId !== user.id && user.role === "INSTRUCTOR") {
    throw new AppError(messages.auth.noPermission, "FORBIDDEN", 403);
  }

  return uploadJob as UploadJobWithRelations;
}

export async function uploadChunk(
  uploadJobId: string,
  chunkIndex: number,
  totalChunks: number,
  body: Buffer,
): Promise<Tables<"UploadJob">> {
  const validatedChunk = uploadChunkSchema.parse({ chunkIndex, totalChunks });
  const uploadJob = await getUploadJobStatus(uploadJobId);
  const uploadedChunks = uploadJob.uploadedChunks ?? [];

  if (uploadJob.status === "CANCELED" || uploadJob.status === "READY") {
    throw new AppError(messages.upload.failed, "UPLOAD_FAILED", 409);
  }

  if (validatedChunk.totalChunks !== uploadJob.totalChunks) {
    throw new AppError("Unexpected chunk count.", "VALIDATION_ERROR", 400);
  }

  const chunkAlreadyExists = uploadedChunks.includes(validatedChunk.chunkIndex);
  await storage.putObject({
    key: getChunkStorageKey(uploadJob.tempStorageKey, validatedChunk.chunkIndex),
    body,
    contentType: "application/octet-stream",
  });

  const nextUploadedChunks = chunkAlreadyExists
    ? uploadedChunks
    : [...new Set([...uploadedChunks, validatedChunk.chunkIndex])].sort((left, right) => left - right);
  const receivedBytes = chunkAlreadyExists ? uploadJob.receivedBytes : uploadJob.receivedBytes + body.length;

  const updated = await maybeOne(
    database
      .from("UploadJob")
      .update({
        status: UploadJobStatus.UPLOADING,
        uploadedChunks: nextUploadedChunks,
        receivedBytes,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", uploadJobId)
      .select("*")
      .maybeSingle(),
    "Upload job could not be updated.",
  );

  if (!updated) {
    throw new AppError("Upload job could not be updated.", "INTERNAL_ERROR", 500);
  }

  return updated as Tables<"UploadJob">;
}

export async function cancelUploadJob(uploadJobId: string) {
  const uploadJob = await getUploadJobStatus(uploadJobId);

  await database
    .from("UploadJob")
    .update({
      status: UploadJobStatus.CANCELED,
      canceledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .eq("id", uploadJobId);

  await removeTemporaryUploadArtifacts(uploadJob);

  return uploadJob;
}

export async function completeUploadJob(uploadJobId: string): Promise<UploadJobWithRelations> {
  const uploadJob = await getUploadJobStatus(uploadJobId);
  const uploadedChunks = uploadJob.uploadedChunks ?? [];

  if (uploadedChunks.length !== uploadJob.totalChunks) {
    throw new AppError(messages.upload.interrupted, "UPLOAD_FAILED", 409);
  }

  const mergedPath = await assembleChunks(uploadJob.tempStorageKey, uploadJobId, uploadJob.totalChunks);
  await storage.putObjectFromPath({
    key: uploadJob.finalStorageKey,
    sourcePath: mergedPath,
    contentType: uploadJob.mimeType,
  });

  const previousAsset = await maybeOne(
    database
      .from("VideoAsset")
      .select("*")
      .eq("lessonId", uploadJob.lessonId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "Previous asset state could not be loaded.",
  );

  if (previousAsset && previousAsset.status !== "REPLACED") {
    await database
      .from("VideoAsset")
      .update({
        status: "REPLACED",
        replacedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", previousAsset.id);
  }

  const asset = await maybeOne(
    database
      .from("VideoAsset")
      .insert({
        id: createId(),
        lessonId: uploadJob.lessonId,
        originalUploadJobId: uploadJob.id,
        version: (previousAsset?.version ?? 0) + 1,
        status: "QUEUED",
        storageKey: uploadJob.finalStorageKey,
        fileName: uploadJob.fileName,
        mimeType: uploadJob.mimeType,
        sizeBytes: uploadJob.sizeBytes,
        durationSeconds: uploadJob.durationSeconds,
        updatedAt: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle(),
    "Video asset could not be created.",
  );

  if (!asset) {
    throw new AppError("Video asset could not be created.", "INTERNAL_ERROR", 500);
  }

  await Promise.all([
    database
      .from("Lesson")
      .update({
        currentVideoAssetId: asset.id,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", uploadJob.lessonId),
    database
      .from("UploadJob")
      .update({
        status: "QUEUED",
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", uploadJob.id),
  ]);

  await removeTemporaryUploadArtifacts(uploadJob);

  await recordAuditLogFromRequest({
    actorUserId: uploadJob.instructorId,
    entityType: "UploadJob",
    entityId: uploadJob.id,
    action: "upload.completed",
    message: "A resumable upload was assembled and queued for processing.",
    metadata: {
      finalStorageKey: uploadJob.finalStorageKey,
    },
  });

  return getUploadJobStatus(uploadJobId);
}

export async function processUploadJob(uploadJobId: string): Promise<Tables<"UploadJob"> | null> {
  const uploadJob = await maybeOne(
    database.from("UploadJob").select("*").eq("id", uploadJobId).maybeSingle(),
    "Upload job could not be loaded.",
  );

  if (!uploadJob || !["QUEUED", "PROCESSING"].includes(uploadJob.status)) {
    return null;
  }

  await database
    .from("UploadJob")
    .update({
      status: "PROCESSING",
      processingStartedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .eq("id", uploadJobId);

  const object = await storage.statObject(uploadJob.finalStorageKey);

  if (!object) {
    await Promise.all([
      database
        .from("UploadJob")
        .update({
          status: "FAILED",
          errorMessage: "Final upload object is missing from storage.",
          processingFinishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq("id", uploadJobId),
      database
        .from("VideoAsset")
        .update({
          status: "FAILED",
          processingError: "Final upload object is missing from storage.",
          updatedAt: new Date().toISOString(),
        })
        .eq("originalUploadJobId", uploadJobId),
    ]);
    return null;
  }

  await Promise.all([
    database
      .from("UploadJob")
      .update({
        status: "READY",
        processingFinishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", uploadJobId),
    database
      .from("VideoAsset")
      .update({
        status: "READY",
        readyAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("originalUploadJobId", uploadJobId),
  ]);

  return maybeOne(
    database.from("UploadJob").select("*").eq("id", uploadJobId).maybeSingle(),
    "Upload job could not be loaded.",
  );
}

export async function processPendingUploadJobs(limit = 10) {
  await ensureTempRoot();
  const jobs = await many(
    database
      .from("UploadJob")
      .select("*")
      .in("status", ["QUEUED", "PROCESSING"])
      .order("createdAt", { ascending: true })
      .limit(limit),
    "Pending upload jobs could not be loaded.",
  );

  const results = [];

  for (const job of jobs) {
    const result = await processUploadJob(job.id);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

export async function getInstructorUploadJobs(instructorId: string) {
  const jobs = await many(
    database
      .from("UploadJob")
      .select("*")
      .eq("instructorId", instructorId)
      .order("createdAt", { ascending: false }),
    "Upload jobs could not be loaded.",
  );

  const hydratedJobs = await Promise.all(jobs.map((job) => hydrateUploadJob(job.id)));
  return hydratedJobs.filter(
    (
      job,
    ): job is NonNullable<Awaited<ReturnType<typeof hydrateUploadJob>>> => Boolean(job),
  );
}

export async function listUploadedChunkIndexes(uploadJobId: string) {
  const uploadJob = await getUploadJobStatus(uploadJobId);
  return uploadJob.uploadedChunks ?? [];
}
