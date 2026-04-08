import { headers } from "next/headers";

import { createId, database, maybeOne, type Json } from "@/lib/database";
import { AppError } from "@/lib/errors";

type AuditLogInput = {
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  message: string;
  metadata?: Json | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function getRequestAuditContext() {
  const headerStore = await headers();

  return {
    ipAddress:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerStore.get("x-real-ip") ??
      null,
    userAgent: headerStore.get("user-agent"),
  };
}

export async function recordAuditLog(input: AuditLogInput) {
  const record = await maybeOne(
    database
      .from("AuditLog")
      .insert({
        id: createId(),
        actorUserId: input.actorUserId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        message: input.message,
        metadata: input.metadata ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      })
      .select("*")
      .maybeSingle(),
    "Audit log could not be recorded.",
  );

  if (!record) {
    throw new AppError("Audit log could not be recorded.", "INTERNAL_ERROR", 500);
  }

  return record;
}

export async function recordAuditLogFromRequest(input: Omit<AuditLogInput, "ipAddress" | "userAgent">) {
  const context = await getRequestAuditContext();
  return recordAuditLog({
    ...input,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });
}
