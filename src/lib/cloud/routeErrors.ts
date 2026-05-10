/**
 * הודעות קריאות כששרת Next לא מצליח להגיע ל-Supabase (undici / fetch).
 */
export function formatCloudRouteError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/fetch failed/i.test(msg)) {
    return (
      "השרת לא הצליח להתחבר ל-Supabase (רשת / כתובת / מפתח). " +
      "ב-Vercel → Environment Variables: וודאי ש-NEXT_PUBLIC_SUPABASE_URL מדויק (כולל https://…supabase.co), " +
      "ש-SUPABASE_SERVICE_ROLE_KEY הוא מפתח service_role (JWT המתחיל ב-eyJ… בדרך כלל), " +
      "שפרויקט Supabase לא מושהה, ואז Redeploy. " +
      `(${msg})`
    );
  }
  return msg;
}
