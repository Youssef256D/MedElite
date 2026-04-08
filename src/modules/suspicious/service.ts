import {
  createId,
  database,
  maybeOne,
  type Json,
  type SuspiciousEventType,
  SuspiciousEventStatus,
} from "@/lib/database";
import { AppError } from "@/lib/errors";

type SuspiciousEventInput = {
  userId?: string | null;
  sessionId?: string | null;
  deviceId?: string | null;
  type: SuspiciousEventType;
  reason: string;
  severity?: number;
  metadata?: Json;
};

export async function createSuspiciousEvent(input: SuspiciousEventInput) {
  const record = await maybeOne(
    database
      .from("SuspiciousEvent")
      .insert({
        id: createId(),
        userId: input.userId ?? null,
        sessionId: input.sessionId ?? null,
        deviceId: input.deviceId ?? null,
        type: input.type,
        reason: input.reason,
        severity: input.severity ?? 1,
        metadata: input.metadata ?? null,
      })
      .select("*")
      .maybeSingle(),
    "Suspicious activity could not be recorded.",
  );

  if (!record) {
    throw new AppError("Suspicious activity could not be recorded.", "INTERNAL_ERROR", 500);
  }

  return record;
}

export async function resolveSuspiciousEvent(eventId: string, resolvedById: string) {
  const record = await maybeOne(
    database
      .from("SuspiciousEvent")
      .update({
        status: SuspiciousEventStatus.RESOLVED,
        resolvedById,
        resolvedAt: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select("*")
      .maybeSingle(),
    "Suspicious event could not be resolved.",
  );

  if (!record) {
    throw new AppError("Suspicious event could not be resolved.", "NOT_FOUND", 404);
  }

  return record;
}
