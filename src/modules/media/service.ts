import { Readable } from "node:stream";

import { countRows, database, maybeOne } from "@/lib/database";
import { AppError } from "@/lib/errors";
import { storage } from "@/lib/storage";
import { absoluteUrl } from "@/lib/utils";
import { messages } from "@/messages";
import { getCurrentSession } from "@/modules/auth/service";
import { recordAuditLogFromRequest } from "@/modules/audit/service";
import { signPlaybackToken, verifyPlaybackToken } from "@/modules/media/signing";
import { getMediaSecuritySettings } from "@/modules/site-settings/service";
import { createSuspiciousEvent } from "@/modules/suspicious/service";
import { resolveLessonAccess } from "@/modules/subscriptions/service";

function parseRangeHeader(rangeHeader: string | null, fileSize: number) {
  if (!rangeHeader?.startsWith("bytes=")) {
    return null;
  }

  const [startValue, endValue] = rangeHeader.replace("bytes=", "").split("-");
  const start = Number.parseInt(startValue, 10);
  const end = endValue ? Number.parseInt(endValue, 10) : fileSize - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start < 0 || end >= fileSize) {
    throw new AppError("Invalid byte range.", "PLAYBACK_DENIED", 416);
  }

  return { start, end };
}

async function getAssetPlaybackContext(assetId: string) {
  const asset = await maybeOne(
    database.from("VideoAsset").select("*").eq("id", assetId).maybeSingle(),
    "Video could not be loaded.",
  );

  if (!asset) {
    return null;
  }

  const lesson = await maybeOne(
    database.from("Lesson").select("*").eq("id", asset.lessonId).maybeSingle(),
    "Lesson could not be loaded.",
  );

  if (!lesson) {
    return null;
  }

  const course = await maybeOne(
    database.from("Course").select("*").eq("id", lesson.courseId).maybeSingle(),
    "Course could not be loaded.",
  );

  if (!course) {
    return null;
  }

  return {
    ...asset,
    lesson: {
      ...lesson,
      course,
    },
  };
}

export async function issuePlaybackUrl(assetId: string) {
  const [session, securitySettings, asset] = await Promise.all([
    getCurrentSession(),
    getMediaSecuritySettings(),
    getAssetPlaybackContext(assetId),
  ]);

  if (!asset) {
    throw new AppError("Video not found.", "NOT_FOUND", 404);
  }

  if (asset.status !== "READY") {
    throw new AppError(messages.upload.processing, "PLAYBACK_DENIED", 409);
  }

  const access = await resolveLessonAccess({
    viewerId: session?.user.id,
    viewerRole: session?.user.role ?? null,
    viewerStudentYear: session?.user.studentYear ?? null,
    course: asset.lesson.course,
    lesson: asset.lesson,
  });

  if (!access.allowed) {
    throw new AppError(access.message ?? "You do not have access to this lesson yet.", "PLAYBACK_DENIED", 403);
  }

  const expiresAt = Date.now() + securitySettings.playbackUrlTtlSeconds * 1000;
  const token = signPlaybackToken({
    assetId,
    exp: expiresAt,
    subjectType: session ? "authenticated" : "guest",
    userId: session?.user.id,
    sessionId: session?.id,
  });

  return {
    url: absoluteUrl(`/api/media/video/${assetId}/stream?token=${encodeURIComponent(token)}`),
    expiresAt,
  };
}

export async function streamVideoAsset(assetId: string, token: string, rangeHeader: string | null) {
  const payload = verifyPlaybackToken(token);

  if (!payload || payload.assetId !== assetId) {
    throw new AppError(messages.upload.playbackFailed, "PLAYBACK_DENIED", 403);
  }

  const asset = await getAssetPlaybackContext(assetId);

  if (!asset || asset.status !== "READY") {
    throw new AppError(messages.upload.processing, "PLAYBACK_DENIED", 404);
  }

  if (payload.subjectType === "authenticated") {
    const session = await getCurrentSession();

    if (!session || session.id !== payload.sessionId || session.user.id !== payload.userId) {
      throw new AppError(messages.auth.sessionExpired, "UNAUTHORIZED", 401);
    }

    const concurrentSessions = await countRows(
      database
        .from("Session")
        .select("*", { count: "exact", head: true })
        .eq("userId", session.user.id)
        .eq("status", "ACTIVE")
        .is("revokedAt", null)
        .gt("expiresAt", new Date().toISOString())
        .gt("lastSeenAt", new Date(Date.now() - 5 * 60 * 1000).toISOString()),
      "Concurrent session count could not be loaded.",
    );

    if (concurrentSessions > 1) {
      await createSuspiciousEvent({
        userId: session.user.id,
        sessionId: session.id,
        deviceId: session.deviceId,
        type: "MULTIPLE_CONCURRENT_STREAMS",
        severity: 2,
        reason: "Multiple active sessions attempted video playback within a short window.",
        metadata: {
          concurrentSessions,
          assetId,
        },
      });
    }
  } else {
    const access = await resolveLessonAccess({
      course: asset.lesson.course,
      lesson: asset.lesson,
    });

    if (!access.allowed || access.mode !== "preview") {
      throw new AppError(messages.subscription.previewOnly, "PLAYBACK_DENIED", 403);
    }
  }

  const stat = await storage.statObject(asset.storageKey);

  if (!stat) {
    throw new AppError(messages.upload.playbackFailed, "PLAYBACK_DENIED", 404);
  }

  const range = parseRangeHeader(rangeHeader, stat.contentLength);
  const { stream, object } = await storage.createReadStream(asset.storageKey, range ?? undefined);

  if (payload.subjectType === "authenticated" && payload.userId) {
    await recordAuditLogFromRequest({
      actorUserId: payload.userId,
      entityType: "VideoAsset",
      entityId: assetId,
      action: "video.playback.requested",
      message: "A signed video playback request was served.",
      metadata: {
        lessonId: asset.lessonId,
        range,
      },
    });
  }

  const body = Readable.toWeb(stream) as ReadableStream;
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Content-Type": object.contentType,
    "Content-Disposition": `inline; filename="${asset.fileName}"`,
    "Cache-Control": "private, no-store, max-age=0",
  });

  if (range) {
    const chunkSize = range.end - range.start + 1;
    headers.set("Content-Length", String(chunkSize));
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${object.contentLength}`);
    return new Response(body, {
      status: 206,
      headers,
    });
  }

  headers.set("Content-Length", String(object.contentLength));

  return new Response(body, {
    status: 200,
    headers,
  });
}
