/**
 * מתג מצב אחסון — שלב 3 (ענן) יתחבר כאן בעתיד.
 * היום הנתונים תמיד ב-IndexedDB; אין נסיגה מרוחקת עד שייושם ספק (למשל Supabase).
 */
export type DataBackendMode = "local" | "cloud";

export function getDataBackendMode(): DataBackendMode {
  if (
    typeof process === "undefined" ||
    !process.env.NEXT_PUBLIC_DATA_BACKEND ||
    process.env.NEXT_PUBLIC_DATA_BACKEND === "local"
  ) {
    return "local";
  }
  return process.env.NEXT_PUBLIC_DATA_BACKEND === "cloud" ? "cloud" : "local";
}

/** true רק כשמבקשים cloud ומוגדרים מזהי Supabase ציבוריים (בשלב 3). */
export function isCloudDataBackendConfigured(): boolean {
  if (getDataBackendMode() !== "cloud") return false;
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}
