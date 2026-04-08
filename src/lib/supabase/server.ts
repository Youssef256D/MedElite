import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database/generated.types";
import { env } from "@/lib/env";

export const supabaseAdmin = createClient<Database>(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
