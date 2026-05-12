/**
 * וידוא שכתובת תמונה לעיבוד שרתית מצביעה ל-Supabase של הפרויקט (במצב מוגדר).
 */
export function assertTrustedPhotoImageUrl(url: string): void {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error("כתובת תמונה לא תקינה.");
  }
  if (u.protocol !== "https:") {
    throw new Error("נדרש קישור HTTPS לתמונה.");
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (base) {
    const host = new URL(base).hostname;
    if (u.hostname !== host) {
      throw new Error("התמונה אינה ממאגר הסטודיו.");
    }
  }
}
