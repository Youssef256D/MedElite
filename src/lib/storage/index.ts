import { env } from "@/lib/env";
import { LocalStorageProvider } from "@/lib/storage/local";
import { SupabaseStorageProvider } from "@/lib/storage/supabase";

export const storage = env.STORAGE_PROVIDER === "supabase" ? new SupabaseStorageProvider() : new LocalStorageProvider();
