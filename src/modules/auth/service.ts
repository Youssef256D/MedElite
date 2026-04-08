import { createHash, randomBytes } from "node:crypto";

import {
  countRows,
  createId,
  database,
  DeviceStatus,
  many,
  maybeOne,
  type Role,
  Role as RoleValues,
  SessionStatus,
  StudentYear,
  type Tables,
  UserStatus,
} from "@/lib/database";
import { cookies, headers } from "next/headers";
import { UAParser } from "ua-parser-js";

import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { messages, getSuspensionMessage } from "@/messages";
import { recordAuditLogFromRequest } from "@/modules/audit/service";
import { getRoleHome, isAdminRole } from "@/modules/auth/permissions";
import { hashPassword, verifyPassword } from "@/modules/auth/password";
import { getPlatformAccessSettings } from "@/modules/site-settings/service";
import { createSuspiciousEvent } from "@/modules/suspicious/service";

type UserWithRelations = Tables<"User"> & {
  profile: Tables<"Profile"> | null;
  instructorProfile: Tables<"InstructorProfile"> | null;
};

type SessionWithRelations = Tables<"Session"> & {
  user: UserWithRelations;
  device: Tables<"Device">;
};

export type AuthenticatedUser = Awaited<ReturnType<typeof requireAuthenticatedUser>>;
export type CurrentSession = Awaited<ReturnType<typeof getCurrentSession>>;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildDeviceFingerprint(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function buildExpiryDate(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function getRequestMetadata() {
  const headerStore = await headers();
  const ipAddress =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    "127.0.0.1";
  const userAgent = headerStore.get("user-agent") ?? "Unknown device";
  const acceptLanguage = headerStore.get("accept-language") ?? "";
  const platform = headerStore.get("sec-ch-ua-platform") ?? "";
  const browserHint = headerStore.get("sec-ch-ua") ?? "";
  const ipPrefix = ipAddress.includes(".") ? ipAddress.split(".").slice(0, 3).join(".") : ipAddress;
  const fingerprint = buildDeviceFingerprint(
    [userAgent, acceptLanguage, platform, browserHint, ipPrefix].join("|"),
  );
  const parsedUserAgent = UAParser(userAgent);
  const label = [
    parsedUserAgent.device.vendor,
    parsedUserAgent.device.model,
    parsedUserAgent.browser.name,
    parsedUserAgent.os.name,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    ipAddress,
    userAgent,
    fingerprint,
    label: label || "Current browser session",
  };
}

async function getUserRelations(userId: string): Promise<UserWithRelations | null> {
  const user = (await maybeOne(
    database.from("User").select("*").eq("id", userId).maybeSingle(),
    "User could not be loaded.",
  )) as Tables<"User"> | null;

  if (!user) {
    return null;
  }

  const [profile, instructorProfile] = (await Promise.all([
    maybeOne(database.from("Profile").select("*").eq("userId", userId).maybeSingle(), "Profile could not be loaded."),
    maybeOne(
      database.from("InstructorProfile").select("*").eq("userId", userId).maybeSingle(),
      "Instructor profile could not be loaded.",
    ),
  ])) as [Tables<"Profile"> | null, Tables<"InstructorProfile"> | null];

  return {
    ...user,
    profile,
    instructorProfile,
  };
}

async function hydrateSession(session: Tables<"Session"> | null): Promise<SessionWithRelations | null> {
  if (!session) {
    return null;
  }

  const [user, device] = await Promise.all([
    getUserRelations(session.userId),
    maybeOne(database.from("Device").select("*").eq("id", session.deviceId).maybeSingle(), "Device could not be loaded."),
  ]);

  if (!user || !device) {
    return null;
  }

  return {
    ...session,
    user,
    device,
  };
}

async function getActiveBanForRequest(input: {
  userId?: string | null;
  sessionId?: string | null;
  deviceId?: string | null;
  ipAddress?: string | null;
}) {
  const now = new Date();
  const bans = await many(
    database.from("Ban").select("*").is("revokedAt", null).order("createdAt", { ascending: false }),
    "Ban status could not be checked.",
  );

  return (
    bans.find((ban) => {
      const activeFrom = new Date(String(ban.activeFrom));
      const expiresAt = ban.expiresAt ? new Date(String(ban.expiresAt)) : null;

      if (activeFrom > now) {
        return false;
      }

      if (expiresAt && expiresAt <= now) {
        return false;
      }

      return Boolean(
        (input.userId && ban.userId === input.userId) ||
          (input.sessionId && ban.sessionId === input.sessionId) ||
          (input.deviceId && ban.deviceId === input.deviceId) ||
          (input.ipAddress && ban.ipAddress === input.ipAddress),
      );
    }) ?? null
  );
}

async function getEffectiveLimits(userId: string) {
  const [user, platform] = await Promise.all([
    maybeOne(
      database
        .from("User")
        .select("sessionLimitOverride, deviceLimitOverride")
        .eq("id", userId)
        .maybeSingle(),
      "User limits could not be loaded.",
    ),
    getPlatformAccessSettings(),
  ]);

  return {
    sessionLimit: user?.sessionLimitOverride ?? platform.defaultSessionLimit,
    deviceLimit: user?.deviceLimitOverride ?? platform.defaultDeviceLimit,
  };
}

async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();

  cookieStore.set(env.AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(env.AUTH_COOKIE_NAME);
}

async function createSessionForUser(userId: string) {
  const [metadata, limits] = await Promise.all([getRequestMetadata(), getEffectiveLimits(userId)]);
  const now = new Date();

  const existingDevice = await maybeOne(
    database
      .from("Device")
      .select("*")
      .eq("userId", userId)
      .eq("fingerprint", metadata.fingerprint)
      .maybeSingle(),
    "Device state could not be loaded.",
  );

  const [activeSessionCount, activeDeviceCount] = await Promise.all([
    countRows(
      database
        .from("Session")
        .select("*", { count: "exact", head: true })
        .eq("userId", userId)
        .eq("status", SessionStatus.ACTIVE)
        .is("revokedAt", null)
        .gt("expiresAt", now.toISOString()),
      "Session count could not be loaded.",
    ),
    countRows(
      database
        .from("Device")
        .select("*", { count: "exact", head: true })
        .eq("userId", userId)
        .eq("status", DeviceStatus.ACTIVE)
        .is("revokedAt", null),
      "Device count could not be loaded.",
    ),
  ]);

  if (!existingDevice && activeDeviceCount >= limits.deviceLimit) {
    await createSuspiciousEvent({
      userId,
      type: "SESSION_LIMIT_EXCEEDED",
      severity: 2,
      reason: "Device limit reached during sign-in.",
      metadata: {
        activeDeviceCount,
        deviceLimit: limits.deviceLimit,
        ipAddress: metadata.ipAddress,
      },
    });

    throw new AppError(messages.devices.limitReached, "DEVICE_LIMIT_REACHED", 403);
  }

  if (activeSessionCount >= limits.sessionLimit) {
    await createSuspiciousEvent({
      userId,
      type: "SESSION_LIMIT_EXCEEDED",
      severity: 2,
      reason: "Session limit reached during sign-in.",
      metadata: {
        activeSessionCount,
        sessionLimit: limits.sessionLimit,
        ipAddress: metadata.ipAddress,
      },
    });

    throw new AppError(messages.devices.limitReached, "SESSION_LIMIT_REACHED", 403);
  }

  const device =
    existingDevice && existingDevice.status === "ACTIVE" && !existingDevice.revokedAt
      ? await maybeOne(
          database
            .from("Device")
            .update({
              label: metadata.label,
              userAgent: metadata.userAgent,
              lastIpAddress: metadata.ipAddress,
              lastSeenAt: now.toISOString(),
            })
            .eq("id", existingDevice.id)
            .select("*")
            .maybeSingle(),
          "Device could not be refreshed.",
        )
      : await maybeOne(
          database
            .from("Device")
            .insert({
              id: createId(),
              userId,
              fingerprint: metadata.fingerprint,
              label: metadata.label,
              userAgent: metadata.userAgent,
              firstIpAddress: metadata.ipAddress,
              lastIpAddress: metadata.ipAddress,
              firstSeenAt: now.toISOString(),
              lastSeenAt: now.toISOString(),
            })
            .select("*")
            .maybeSingle(),
          "Device could not be created.",
        );

  if (!device) {
    throw new AppError("Device could not be created.", "INTERNAL_ERROR", 500);
  }

  if (device.status === "BLOCKED") {
    throw new AppError(messages.auth.noPermission, "FORBIDDEN", 403);
  }

  const activeBan = await getActiveBanForRequest({
    userId,
    deviceId: device.id,
    ipAddress: metadata.ipAddress,
  });

  if (activeBan) {
    throw new AppError(messages.auth.suspended, "FORBIDDEN", 403);
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = buildExpiryDate(env.AUTH_SESSION_TTL_DAYS);
  const sessionRow = await maybeOne(
    database
      .from("Session")
      .insert({
        id: createId(),
        userId,
        deviceId: device.id,
        tokenHash: hashToken(token),
        expiresAt: expiresAt.toISOString(),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      })
      .select("*")
      .maybeSingle(),
    "Session could not be created.",
  );

  const session = await hydrateSession(sessionRow);

  if (!session) {
    throw new AppError("Session could not be created.", "INTERNAL_ERROR", 500);
  }

  await Promise.all([
    setSessionCookie(token, expiresAt),
    database.from("User").update({ lastLoginAt: now.toISOString() }).eq("id", userId),
    recordAuditLogFromRequest({
      actorUserId: userId,
      entityType: "Session",
      entityId: session.id,
      action: "session.created",
      message: "User signed in and created a new session.",
      metadata: {
        deviceId: device.id,
      },
    }),
  ]);

  return session;
}

async function fetchSessionByToken(token: string) {
  const session = await maybeOne(
    database.from("Session").select("*").eq("tokenHash", hashToken(token)).maybeSingle(),
    "Session could not be loaded.",
  );

  return hydrateSession(session);
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(env.AUTH_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await fetchSessionByToken(sessionToken);

  if (!session) {
    return null;
  }

  if (
    session.status !== SessionStatus.ACTIVE ||
    session.revokedAt ||
    new Date(String(session.expiresAt)) <= new Date()
  ) {
    return null;
  }

  if (session.user.status === UserStatus.BANNED || session.user.status === UserStatus.SUSPENDED) {
    return null;
  }

  const activeBan = await getActiveBanForRequest({
    userId: session.userId,
    sessionId: session.id,
    deviceId: session.deviceId,
    ipAddress: session.ipAddress,
  });

  if (activeBan) {
    return null;
  }

  if (Date.now() - new Date(String(session.lastSeenAt)).getTime() > 5 * 60 * 1000) {
    await database
      .from("Session")
      .update({
        lastSeenAt: new Date().toISOString(),
      })
      .eq("id", session.id);
  }

  return session;
}

export async function requireAuthenticatedUser() {
  const session = await getCurrentSession();

  if (!session) {
    throw new AppError(messages.auth.sessionExpired, "UNAUTHORIZED", 401);
  }

  if (session.user.status === UserStatus.SUSPENDED) {
    throw new AppError(getSuspensionMessage(session.user.suspensionReason), "FORBIDDEN", 403);
  }

  if (session.user.status === UserStatus.BANNED) {
    throw new AppError(messages.auth.suspended, "FORBIDDEN", 403);
  }

  return session.user;
}

export async function requireRoles(roles: Role[]) {
  const session = await getCurrentSession();

  if (!session) {
    throw new AppError(messages.auth.sessionExpired, "UNAUTHORIZED", 401);
  }

  if (!roles.includes(session.user.role) && !isAdminRole(session.user.role)) {
    throw new AppError(messages.auth.noPermission, "FORBIDDEN", 403);
  }

  return session.user;
}

export async function authenticateWithPassword(email: string, password: string) {
  const user = await maybeOne(
    database.from("User").select("*").eq("email", email.toLowerCase()).maybeSingle(),
    "User could not be loaded.",
  );

  if (!user) {
    throw new AppError(messages.auth.invalidCredentials, "UNAUTHORIZED", 401);
  }

  const passwordValid = await verifyPassword(user.passwordHash, password);

  if (!passwordValid) {
    throw new AppError(messages.auth.invalidCredentials, "UNAUTHORIZED", 401);
  }

  if (user.status === UserStatus.SUSPENDED) {
    throw new AppError(getSuspensionMessage(user.suspensionReason), "FORBIDDEN", 403);
  }

  if (user.status === UserStatus.BANNED) {
    throw new AppError(messages.auth.suspended, "FORBIDDEN", 403);
  }

  return createSessionForUser(user.id);
}

export async function registerStudent(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  studentYear: keyof typeof StudentYear;
}) {
  const normalizedEmail = input.email.toLowerCase().trim();
  const existingUser = await maybeOne(
    database.from("User").select("id").eq("email", normalizedEmail).maybeSingle(),
    "User availability could not be checked.",
  );

  if (existingUser) {
    throw new AppError("An account with this email already exists.", "CONFLICT", 409);
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const userId = createId();

  await Promise.all([
    database.from("User").insert({
      id: userId,
      email: normalizedEmail,
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: RoleValues.STUDENT,
      studentYear: input.studentYear,
      updatedAt: now.toISOString(),
    }),
    database.from("Profile").insert({
      id: createId(),
      userId,
      fullName: `${input.firstName.trim()} ${input.lastName.trim()}`,
      updatedAt: now.toISOString(),
    }),
    database.from("Subscription").insert({
      id: createId(),
      userId,
      planCode: "trial",
      planName: "7-Day Trial",
      status: "TRIAL",
      startsAt: now.toISOString(),
      trialEndsAt: trialEndsAt.toISOString(),
      priceCents: 0,
      currency: "USD",
      updatedAt: now.toISOString(),
    }),
  ]);

  await recordAuditLogFromRequest({
    actorUserId: userId,
    entityType: "User",
    entityId: userId,
    action: "user.registered",
    message: "A new student account was created.",
  });

  return createSessionForUser(userId);
}

export async function signOutCurrentSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(env.AUTH_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return;
  }

  const session = await fetchSessionByToken(sessionToken);

  if (session) {
    await database
      .from("Session")
      .update({
        status: SessionStatus.REVOKED,
        revokedAt: new Date().toISOString(),
        revokedReason: "User signed out.",
      })
      .eq("id", session.id);
  }

  await clearSessionCookie();
}

export async function revokeSessionById(sessionId: string, actorUserId: string, reason = "Revoked by user.") {
  const session = await maybeOne(
    database
      .from("Session")
      .update({
        status: SessionStatus.REVOKED,
        revokedAt: new Date().toISOString(),
        revokedReason: reason,
      })
      .eq("id", sessionId)
      .select("*")
      .maybeSingle(),
    "Session could not be revoked.",
  );

  if (!session) {
    throw new AppError("Session not found.", "NOT_FOUND", 404);
  }

  await recordAuditLogFromRequest({
    actorUserId,
    entityType: "Session",
    entityId: session.id,
    action: "session.revoked",
    message: reason,
  });

  return session;
}

export async function revokeAllSessionsForUser(
  userId: string,
  actorUserId: string,
  reason = "Sessions revoked by administrator.",
) {
  await database
    .from("Session")
    .update({
      status: SessionStatus.REVOKED,
      revokedAt: new Date().toISOString(),
      revokedReason: reason,
    })
    .eq("userId", userId)
    .eq("status", SessionStatus.ACTIVE)
    .is("revokedAt", null);

  await recordAuditLogFromRequest({
    actorUserId,
    entityType: "User",
    entityId: userId,
    action: "user.sessions.revoked",
    message: reason,
  });
}

export async function getUserSessions(userId: string) {
  const sessions = await many(
    database
      .from("Session")
      .select("*")
      .eq("userId", userId)
      .order("lastSeenAt", { ascending: false })
      .order("createdAt", { ascending: false }),
    "Sessions could not be loaded.",
  );
  const devices = await many(
    database.from("Device").select("*").in(
      "id",
      Array.from(new Set(sessions.map((session) => session.deviceId))),
    ),
    "Devices could not be loaded.",
  );
  const deviceMap = new Map(devices.map((device) => [device.id, device]));

  return sessions.map((session) => ({
    ...session,
    device: deviceMap.get(session.deviceId) ?? null,
  }));
}

export async function getUserDevices(userId: string) {
  return many(
    database
      .from("Device")
      .select("*")
      .eq("userId", userId)
      .order("lastSeenAt", { ascending: false })
      .order("firstSeenAt", { ascending: false }),
    "Devices could not be loaded.",
  );
}

export { getRoleHome };
