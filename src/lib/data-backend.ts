/**
 * מתג מצב אחסון: `local` = IndexedDB בדפדפן, `cloud` = Supabase דרך API שרת (שירות עם Service Role).
 */
export type DataBackendMode = "local" | "cloud";

function normalizedBackendEnv(): string {
  return (process.env.NEXT_PUBLIC_DATA_BACKEND ?? "").trim().toLowerCase();
}

export function getDataBackendMode(): DataBackendMode {
  if (typeof process === "undefined") return "local";
  const v = normalizedBackendEnv();
  if (!v || v === "local") return "local";
  if (v === "cloud") return "cloud";
  return "local";
}

/**
 * בדיקה גסה ל־UI/בנייה: מצב ענן + משתני Supabase ציבוריים.
 * בשרת (Vercel) חובה גם `SUPABASE_SERVICE_ROLE_KEY` — בלי זה נתיבי `/api/studio-data` והעלאות ייכשלו.
 */
export function isCloudDataBackendConfigured(): boolean {
  if (getDataBackendMode() !== "cloud") return false;
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
}
