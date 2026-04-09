import { createHash } from "node:crypto";

import {
  countRows,
  createId,
  database,
  DeviceStatus,
  execute,
  many,
  maybeOne,
  type Role,
  Role as RoleValues,
  SessionStatus,
  StudentYear,
  type Tables,
  UserStatus,
} from "@/lib/database";
import { headers } from "next/headers";
import { UAParser } from "ua-parser-js";

import { AppError, isAppError } from "@/lib/errors";
import { messages, getSuspensionMessage } from "@/messages";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { recordAuditLogFromRequest } from "@/modules/audit/service";
import { getRoleHome, isAdminRole } from "@/modules/auth/permissions";
import { hashPassword } from "@/modules/auth/password";
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

type SessionClaims = {
  email?: string;
  exp?: number;
  session_id?: string;
  sub?: string;
};

export type SupabaseUserProfileInput = {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  passwordHash?: string;
  role: Role;
  studentYear?: keyof typeof StudentYear | null;
};

const MAX_CONCURRENT_SESSIONS = 2;
const STALE_SESSION_WINDOW_MS = 30 * 60 * 1000;

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

function decodeBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function getSessionClaimsFromAccessToken(accessToken: string): SessionClaims {
  try {
    const [, payload] = accessToken.split(".");

    if (!payload) {
      return {};
    }

    return JSON.parse(decodeBase64Url(payload)) as SessionClaims;
  } catch {
    return {};
  }
}

function getSessionExpiryIso(value?: number | null) {
  if (!value) {
    return buildExpiryDate(env.AUTH_SESSION_TTL_DAYS).toISOString();
  }

  return new Date(value * 1000).toISOString();
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

async function cleanupStaleSessionsForUser(userId: string, now: Date) {
  const staleThreshold = new Date(now.getTime() - STALE_SESSION_WINDOW_MS).toISOString();
  const staleSessions = await many(
    database
      .from("Session")
      .select("id")
      .eq("userId", userId)
      .or(`expiresAt.lt.${now.toISOString()},lastSeenAt.lt.${staleThreshold}`),
    "Stale sessions could not be loaded.",
  );

  if (staleSessions.length === 0) {
    return;
  }

  await execute(
    database
      .from("Session")
      .delete()
      .in(
        "id",
        staleSessions.map((session) => session.id),
      ),
    "Stale sessions could not be cleared.",
  );
}

async function getAppUserByEmail(email: string) {
  return maybeOne(
    database.from("User").select("*").eq("email", email.toLowerCase().trim()).maybeSingle(),
    "User could not be loaded.",
  ) as Promise<Tables<"User"> | null>;
}

async function getAppUserByAuthId(authUserId: string) {
  return maybeOne(
    database.from("User").select("*").eq("authUserId", authUserId).maybeSingle(),
    "User could not be loaded.",
  ) as Promise<Tables<"User"> | null>;
}

function buildSupabaseMetadata(input: {
  firstName: string;
  lastName: string;
  role: Role;
  studentYear?: keyof typeof StudentYear | null;
}) {
  return {
    user_metadata: {
      first_name: input.firstName,
      last_name: input.lastName,
      full_name: `${input.firstName} ${input.lastName}`.trim(),
    },
    app_metadata: {
      role: input.role,
      student_year: input.studentYear ?? null,
    },
  };
}

async function findSupabaseAuthUserByEmail(email: string) {
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new AppError(error.message, "INTERNAL_ERROR", 500);
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());

    if (user) {
      return user;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }
}

async function updateAppUserAuthLink(input: {
  userId: string;
  authUserId: string;
  emailVerifiedAt?: string | null;
}) {
  return maybeOne(
    database
      .from("User")
      .update({
        authUserId: input.authUserId,
        emailVerifiedAt: input.emailVerifiedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", input.userId)
      .select("*")
      .maybeSingle(),
    "User auth link could not be updated.",
  ) as Promise<Tables<"User"> | null>;
}

async function resolveAppUserFromAuth(input: {
  authUserId: string;
  email?: string | null;
  emailVerifiedAt?: string | null;
}) {
  const linkedUser = await getAppUserByAuthId(input.authUserId);

  if (linkedUser) {
    return linkedUser;
  }

  if (!input.email) {
    return null;
  }

  const emailUser = await getAppUserByEmail(input.email);

  if (!emailUser) {
    return null;
  }

  if (emailUser.authUserId && emailUser.authUserId !== input.authUserId) {
    throw new AppError("This account is already linked to a different sign-in identity.", "CONFLICT", 409);
  }

  return updateAppUserAuthLink({
    userId: emailUser.id,
    authUserId: input.authUserId,
    emailVerifiedAt: input.emailVerifiedAt,
  });
}

async function createSupabaseAuthUser(input: SupabaseUserProfileInput) {
  const metadata = buildSupabaseMetadata(input);
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email.toLowerCase().trim(),
    password: input.password,
    password_hash: input.passwordHash,
    email_confirm: true,
    ...metadata,
  });

  if (error) {
    if (error.status === 422 || error.status === 409) {
      const existingUser = await findSupabaseAuthUserByEmail(input.email);

      if (existingUser) {
        return existingUser;
      }
    }

    throw new AppError(error.message, "CONFLICT", error.status ?? 409);
  }

  if (!data.user) {
    throw new AppError("Supabase auth user could not be created.", "INTERNAL_ERROR", 500);
  }

  return data.user;
}

export async function createSupabaseAuthAccount(input: SupabaseUserProfileInput) {
  return createSupabaseAuthUser(input);
}

export async function syncSupabaseAuthMetadataForUser(userId: string) {
  const user = await maybeOne(
    database.from("User").select("*").eq("id", userId).maybeSingle(),
    "User could not be loaded.",
  );

  if (!user) {
    throw new AppError("User not found.", "NOT_FOUND", 404);
  }

  if (!user.authUserId) {
    const authUser = await createSupabaseAuthUser({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      passwordHash: user.passwordHash,
      role: user.role,
      studentYear: user.studentYear,
    });

    await updateAppUserAuthLink({
      userId: user.id,
      authUserId: authUser.id,
      emailVerifiedAt: authUser.email_confirmed_at ?? new Date().toISOString(),
    });

    return;
  }

  const metadata = buildSupabaseMetadata(user);
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.authUserId, {
    email: user.email,
    ...metadata,
  });

  if (error) {
    throw new AppError(error.message, "INTERNAL_ERROR", error.status ?? 500);
  }
}

async function provisionSupabaseAuthForExistingUser(user: Tables<"User">) {
  if (user.authUserId) {
    return user;
  }

  const authUser = await createSupabaseAuthUser({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    passwordHash: user.passwordHash,
    role: user.role,
    studentYear: user.studentYear,
  });

  const updatedUser = await updateAppUserAuthLink({
    userId: user.id,
    authUserId: authUser.id,
    emailVerifiedAt: authUser.email_confirmed_at ?? new Date().toISOString(),
  });

  if (!updatedUser) {
    throw new AppError("User auth link could not be updated.", "INTERNAL_ERROR", 500);
  }

  return updatedUser;
}

async function createOrRefreshExistingDevice(
  existingDevice: Tables<"Device"> | null,
  userId: string,
  now: Date,
  metadata: Awaited<ReturnType<typeof getRequestMetadata>>,
) {
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

  return { device, existingDevice };
}

async function syncAppSessionRecord(input: {
  expiresAt: string;
  sessionId: string;
  userId: string;
}) {
  const [metadata, limits] = await Promise.all([getRequestMetadata(), getEffectiveLimits(input.userId)]);
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - STALE_SESSION_WINDOW_MS).toISOString();
  const sessionLimit = Math.min(limits.sessionLimit, MAX_CONCURRENT_SESSIONS);

  await cleanupStaleSessionsForUser(input.userId, now);

  const [existingSession, existingDevice] = await Promise.all([
    maybeOne(database.from("Session").select("*").eq("id", input.sessionId).maybeSingle(), "Session could not be loaded."),
    maybeOne(
      database
        .from("Device")
        .select("*")
        .eq("userId", input.userId)
        .eq("fingerprint", metadata.fingerprint)
        .maybeSingle(),
      "Device state could not be loaded.",
    ),
  ]);

  if (existingSession?.status === SessionStatus.REVOKED || existingSession?.revokedAt) {
    return null;
  }

  const [activeSessionCount, activeDeviceCount] = await Promise.all([
    countRows(
      database
        .from("Session")
        .select("*", { count: "exact", head: true })
        .eq("userId", input.userId)
        .eq("status", SessionStatus.ACTIVE)
        .is("revokedAt", null)
        .gt("expiresAt", now.toISOString())
        .gt("lastSeenAt", staleThreshold),
      "Session count could not be loaded.",
    ),
    countRows(
      database
        .from("Device")
        .select("*", { count: "exact", head: true })
        .eq("userId", input.userId)
        .eq("status", DeviceStatus.ACTIVE)
        .is("revokedAt", null),
      "Device count could not be loaded.",
    ),
  ]);

  if (!existingDevice && activeDeviceCount >= limits.deviceLimit) {
    await createSuspiciousEvent({
      userId: input.userId,
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

  if (!existingSession && activeSessionCount >= sessionLimit) {
    await createSuspiciousEvent({
      userId: input.userId,
      type: "SESSION_LIMIT_EXCEEDED",
      severity: 2,
      reason: "Session limit reached during sign-in.",
      metadata: {
        activeSessionCount,
        sessionLimit,
        ipAddress: metadata.ipAddress,
      },
    });

    throw new AppError(
      "You already have 2 active sessions. Sign out from another device and try again.",
      "SESSION_LIMIT_REACHED",
      403,
    );
  }

  const { device } = await createOrRefreshExistingDevice(existingDevice, input.userId, now, metadata);

  if (device.status === "BLOCKED") {
    throw new AppError(messages.auth.noPermission, "FORBIDDEN", 403);
  }

  const activeBan = await getActiveBanForRequest({
    userId: input.userId,
    deviceId: device.id,
    ipAddress: metadata.ipAddress,
  });

  if (activeBan) {
    throw new AppError(messages.auth.suspended, "FORBIDDEN", 403);
  }

  const sessionRow = existingSession
    ? await maybeOne(
        database
          .from("Session")
          .update({
            deviceId: device.id,
            expiresAt: input.expiresAt,
            ipAddress: metadata.ipAddress,
            lastSeenAt: now.toISOString(),
            status: SessionStatus.ACTIVE,
            tokenHash: hashToken(input.sessionId),
            userAgent: metadata.userAgent,
          })
          .eq("id", input.sessionId)
          .select("*")
          .maybeSingle(),
        "Session could not be refreshed.",
      )
    : await maybeOne(
        database
          .from("Session")
          .insert({
            id: input.sessionId,
            userId: input.userId,
            deviceId: device.id,
            tokenHash: hashToken(input.sessionId),
            expiresAt: input.expiresAt,
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

  if (!existingSession) {
    await Promise.all([
      database.from("User").update({ lastLoginAt: now.toISOString() }).eq("id", input.userId),
      recordAuditLogFromRequest({
        actorUserId: input.userId,
        entityType: "Session",
        entityId: session.id,
        action: "session.created",
        message: "User signed in through Supabase Auth and opened a new session.",
        metadata: {
          deviceId: device.id,
        },
      }),
    ]);
  }

  return session;
}

async function getSupabaseClaims() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return { claims: null, supabase };
  }

  return {
    claims: data.claims as SessionClaims,
    supabase,
  };
}

export async function getCurrentSession() {
  const { claims, supabase } = await getSupabaseClaims();

  if (!claims?.sub || !claims.session_id) {
    return null;
  }

  let appUser = await getAppUserByAuthId(claims.sub);

  if (!appUser) {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user?.email) {
      return null;
    }

    appUser = await resolveAppUserFromAuth({
      authUserId: data.user.id,
      email: data.user.email,
      emailVerifiedAt: data.user.email_confirmed_at ?? null,
    });
  }

  if (!appUser) {
    return null;
  }

  if (appUser.status === UserStatus.BANNED || appUser.status === UserStatus.SUSPENDED) {
    return null;
  }

  let session: SessionWithRelations | null = null;

  try {
    session = await syncAppSessionRecord({
      userId: appUser.id,
      sessionId: claims.session_id,
      expiresAt: getSessionExpiryIso(claims.exp),
    });
  } catch (error) {
    if (isAppError(error) && ["SESSION_LIMIT_REACHED", "DEVICE_LIMIT_REACHED", "FORBIDDEN"].includes(error.code)) {
      return null;
    }

    throw error;
  }

  if (!session) {
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
  const normalizedEmail = email.toLowerCase().trim();
  const appUser = await getAppUserByEmail(normalizedEmail);

  if (appUser?.status === UserStatus.SUSPENDED) {
    throw new AppError(getSuspensionMessage(appUser.suspensionReason), "FORBIDDEN", 403);
  }

  if (appUser?.status === UserStatus.BANNED) {
    throw new AppError(messages.auth.suspended, "FORBIDDEN", 403);
  }

  const supabase = await createSupabaseServerClient();
  let response = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (response.error && appUser && !appUser.authUserId) {
    await provisionSupabaseAuthForExistingUser(appUser);
    response = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
  }

  if (response.error || !response.data.user || !response.data.session) {
    throw new AppError(messages.auth.invalidCredentials, "UNAUTHORIZED", 401);
  }

  const resolvedUser = await resolveAppUserFromAuth({
    authUserId: response.data.user.id,
    email: response.data.user.email,
    emailVerifiedAt: response.data.user.email_confirmed_at ?? null,
  });

  if (!resolvedUser) {
    await supabase.auth.signOut({ scope: "local" });
    throw new AppError("Your account is not provisioned for MedElite Academy yet.", "UNAUTHORIZED", 401);
  }

  const claims = getSessionClaimsFromAccessToken(response.data.session.access_token);

  if (!claims.session_id) {
    await supabase.auth.signOut({ scope: "local" });
    throw new AppError("The auth session could not be initialized.", "INTERNAL_ERROR", 500);
  }

  try {
    const session = await syncAppSessionRecord({
      userId: resolvedUser.id,
      sessionId: claims.session_id,
      expiresAt: getSessionExpiryIso(response.data.session.expires_at ?? claims.exp),
    });

    if (!session) {
      throw new AppError(messages.auth.sessionExpired, "UNAUTHORIZED", 401);
    }

    return session;
  } catch (error) {
    await supabase.auth.signOut({ scope: "local" });
    throw error;
  }
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
  const authUser = await createSupabaseAuthUser({
    email: normalizedEmail,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    password: input.password,
    role: RoleValues.STUDENT,
    studentYear: input.studentYear,
  });

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const userId = createId();

  try {
    await Promise.all([
      database.from("User").insert({
        id: userId,
        authUserId: authUser.id,
        email: normalizedEmail,
        passwordHash,
        emailVerifiedAt: authUser.email_confirmed_at ?? now.toISOString(),
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
  } catch (error) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.id);
    throw error;
  }

  await recordAuditLogFromRequest({
    actorUserId: userId,
    entityType: "User",
    entityId: userId,
    action: "user.registered",
    message: "A new student account was created through Supabase Auth.",
  });

  return authenticateWithPassword(normalizedEmail, input.password);
}

export async function signOutCurrentSession() {
  const currentSession = await getCurrentSession();
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut({
    scope: "local",
  });

  if (!currentSession) {
    return;
  }

  await database
    .from("Session")
    .update({
      status: SessionStatus.REVOKED,
      revokedAt: new Date().toISOString(),
      revokedReason: "User signed out.",
    })
    .eq("id", currentSession.id);
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
