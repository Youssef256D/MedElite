import { createId as createCuid } from "@paralleldrive/cuid2";
import type { PostgrestError } from "@supabase/supabase-js";

import type { Database, Enums as EnumValue, Json, Tables, TablesInsert, TablesUpdate } from "@/lib/database/generated.types";
import { Constants } from "@/lib/database/generated.types";
import { AppError } from "@/lib/errors";
import { supabaseAdmin } from "@/lib/supabase/server";

export type { Database, Json, Tables, TablesInsert, TablesUpdate };
export { Constants };

const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export type Role = EnumValue<"Role">;
export type UserStatus = EnumValue<"UserStatus">;
export type SubscriptionStatus = EnumValue<"SubscriptionStatus">;
export type CourseStatus = EnumValue<"CourseStatus">;
export type CourseAccessType = EnumValue<"CourseAccessType">;
export type LessonStatus = EnumValue<"LessonStatus">;
export type LessonVisibility = EnumValue<"LessonVisibility">;
export type ResourceType = EnumValue<"ResourceType">;
export type VideoAssetStatus = EnumValue<"VideoAssetStatus">;
export type UploadJobStatus = EnumValue<"UploadJobStatus">;
export type EnrollmentStatus = EnumValue<"EnrollmentStatus">;
export type PaymentMethod = EnumValue<"PaymentMethod">;
export type AnnouncementStatus = EnumValue<"AnnouncementStatus">;
export type NotificationType = EnumValue<"NotificationType">;
export type NotificationStatus = EnumValue<"NotificationStatus">;
export type SessionStatus = EnumValue<"SessionStatus">;
export type DeviceStatus = EnumValue<"DeviceStatus">;
export type SuspiciousEventType = EnumValue<"SuspiciousEventType">;
export type SuspiciousEventStatus = EnumValue<"SuspiciousEventStatus">;
export type BanTargetType = EnumValue<"BanTargetType">;
export type StudentYear = EnumValue<"StudentYear">;

function createEnumRecord<const Values extends readonly string[]>(values: Values) {
  return Object.freeze(
    Object.fromEntries(values.map((value) => [value, value])) as {
      [Key in Values[number]]: Key;
    },
  );
}

export const Role = createEnumRecord(Constants.public.Enums.Role);
export const UserStatus = createEnumRecord(Constants.public.Enums.UserStatus);
export const SubscriptionStatus = createEnumRecord(Constants.public.Enums.SubscriptionStatus);
export const CourseStatus = createEnumRecord(Constants.public.Enums.CourseStatus);
export const CourseAccessType = createEnumRecord(Constants.public.Enums.CourseAccessType);
export const LessonStatus = createEnumRecord(Constants.public.Enums.LessonStatus);
export const LessonVisibility = createEnumRecord(Constants.public.Enums.LessonVisibility);
export const ResourceType = createEnumRecord(Constants.public.Enums.ResourceType);
export const VideoAssetStatus = createEnumRecord(Constants.public.Enums.VideoAssetStatus);
export const UploadJobStatus = createEnumRecord(Constants.public.Enums.UploadJobStatus);
export const EnrollmentStatus = createEnumRecord(Constants.public.Enums.EnrollmentStatus);
export const PaymentMethod = createEnumRecord(Constants.public.Enums.PaymentMethod);
export const AnnouncementStatus = createEnumRecord(Constants.public.Enums.AnnouncementStatus);
export const NotificationType = createEnumRecord(Constants.public.Enums.NotificationType);
export const NotificationStatus = createEnumRecord(Constants.public.Enums.NotificationStatus);
export const SessionStatus = createEnumRecord(Constants.public.Enums.SessionStatus);
export const DeviceStatus = createEnumRecord(Constants.public.Enums.DeviceStatus);
export const SuspiciousEventType = createEnumRecord(Constants.public.Enums.SuspiciousEventType);
export const SuspiciousEventStatus = createEnumRecord(Constants.public.Enums.SuspiciousEventStatus);
export const BanTargetType = createEnumRecord(Constants.public.Enums.BanTargetType);
export const StudentYear = createEnumRecord(Constants.public.Enums.StudentYear);

export const database = supabaseAdmin;

export function createId() {
  return createCuid();
}

export function toIsoDate(value?: Date | string | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function hydrateDates<T>(value: T, parentKey?: string): T {
  if (Array.isArray(value)) {
    return value.map((item) => hydrateDates(item)) as T;
  }

  if (typeof value === "string" && parentKey?.endsWith("At") && isoDatePattern.test(value)) {
    return new Date(value) as T;
  }

  if (!value || typeof value !== "object" || value instanceof Date) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, hydrateDates(nestedValue, key)]),
  ) as T;
}

function toAppError(error: PostgrestError, fallbackMessage: string) {
  if (error.code === "23505") {
    return new AppError("This record already exists.", "CONFLICT", 409, {
      details: error.details,
      hint: error.hint,
    });
  }

  return new AppError(error.message || fallbackMessage, "INTERNAL_ERROR", 500, {
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

export function isUniqueViolation(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505",
  );
}

export async function many(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: PromiseLike<{ data: any[] | null; error: PostgrestError | null }>,
  fallbackMessage = "Database request failed.",
) {
  const { data, error } = await query;

  if (error) {
    throw toAppError(error, fallbackMessage);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return hydrateDates((data ?? []) as any[]);
}

export async function maybeOne(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: PromiseLike<{ data: any; error: PostgrestError | null }>,
  fallbackMessage = "Database request failed.",
) {
  const { data, error } = await query;

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw toAppError(error, fallbackMessage);
  }

  return hydrateDates(data);
}

export async function one(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: PromiseLike<{ data: any; error: PostgrestError | null }>,
  fallbackMessage = "Database request failed.",
) {
  const record = await maybeOne(query, fallbackMessage);

  if (!record) {
    throw new AppError(fallbackMessage, "NOT_FOUND", 404);
  }

  return record;
}

export async function execute(
  query: PromiseLike<{ error: PostgrestError | null }>,
  fallbackMessage = "Database request failed.",
) {
  const { error } = await query;

  if (error) {
    throw toAppError(error, fallbackMessage);
  }
}

export async function countRows(
  query: PromiseLike<{ count: number | null; error: PostgrestError | null }>,
  fallbackMessage = "Database request failed.",
) {
  const { count, error } = await query;

  if (error) {
    throw toAppError(error, fallbackMessage);
  }

  return count ?? 0;
}

export function indexById<T extends { id: string }>(records: T[]) {
  return new Map(records.map((record) => [record.id, record]));
}

export function groupBy<T, Key extends string | number>(records: T[], keySelector: (record: T) => Key) {
  return records.reduce(
    (accumulator, record) => {
      const key = keySelector(record);
      const bucket = accumulator.get(key) ?? [];
      bucket.push(record);
      accumulator.set(key, bucket);
      return accumulator;
    },
    new Map<Key, T[]>(),
  );
}
