import "server-only";

import { createClient } from "@supabase/supabase-js";

export const ECHO_PHOTOS_BUCKET = "echo-photos";

/** מפתח service_role; תומך ב-SUPABASE_ROLE_KEY אם הוגדר ב-Vercel בשם הישן. */
export function getSupabaseServiceRoleKey(): string | undefined {
  const k =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ROLE_KEY?.trim();
  return k || undefined;
}

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL או SUPABASE_SERVICE_ROLE_KEY חסרים.");
  }
  return createClient(url, key);
}

export function getPublicObjectUrl(storagePath: string): string {
  const sb = supabaseAdmin();
  const { data } = sb.storage.from(ECHO_PHOTOS_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}
