import { z } from "zod";

const serverSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: z.string().url(),
    AUTH_COOKIE_NAME: z.string().min(1).default("medelite_session"),
    AUTH_SESSION_TTL_DAYS: z.coerce.number().int().positive().default(14),
    MEDIA_SIGNING_SECRET: z.string().min(16),
    INTERNAL_JOB_SECRET: z.string().min(12),
    STORAGE_PROVIDER: z.enum(["local", "supabase"]).default("supabase"),
    LOCAL_STORAGE_ROOT: z.string().min(1).default("./storage"),
    UPLOAD_TEMP_ROOT: z.string().min(1).default("./.tmp/uploads"),
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    SUPABASE_ANON_KEY: z.string().min(1).optional(),
    SUPABASE_STORAGE_BUCKET: z.string().min(1).default("medelite-media"),
    DEFAULT_SESSION_LIMIT: z.coerce.number().int().positive().default(3),
    DEFAULT_DEVICE_LIMIT: z.coerce.number().int().positive().default(2),
    MAX_UPLOAD_SIZE_BYTES: z.coerce.number().int().positive().default(1_073_741_824),
    UPLOAD_CHUNK_SIZE_BYTES: z.coerce.number().int().positive().default(5_242_880),
    PLAYBACK_URL_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  })
  .superRefine((value, ctx) => {
    if (value.STORAGE_PROVIDER === "supabase") {
      if (!value.SUPABASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SUPABASE_URL"],
          message: "SUPABASE_URL is required when STORAGE_PROVIDER is supabase.",
        });
      }

      if (!value.SUPABASE_SERVICE_ROLE_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SUPABASE_SERVICE_ROLE_KEY"],
          message: "SUPABASE_SERVICE_ROLE_KEY is required when STORAGE_PROVIDER is supabase.",
        });
      }
    }
  });

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;

export const publicEnv = {
  appUrl: env.NEXT_PUBLIC_APP_URL,
  maxUploadSizeBytes: env.MAX_UPLOAD_SIZE_BYTES,
  supabaseUrl: env.SUPABASE_URL,
  supabaseAnonKey: env.SUPABASE_ANON_KEY,
};
