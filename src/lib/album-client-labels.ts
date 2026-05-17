/** העדפות כינוי תמונה בדף אלבום לקוח — נשמרות מקומית בדפדפן. */

export const ALBUM_SHOW_CUSTOM_LABEL_KEY = "echo-album-show-display-names";

/** תאריך, סיפור ואנשים מהסטודיו — «מאחורי התמונה». */
export const ALBUM_SHOW_STUDIO_BACK_INFO_KEY =
  "echo-album-show-studio-back-info";

export function albumDisplayNameStorageKey(photoId: string) {
  return `echo-album-display-name-${photoId}`;
}

export function readShowCustomAlbumLabels(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ALBUM_SHOW_CUSTOM_LABEL_KEY) === "1";
}

export function writeShowCustomAlbumLabels(value: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ALBUM_SHOW_CUSTOM_LABEL_KEY, value ? "1" : "0");
}

/** ברירת מחדל true — שומרים התנהגות קודמת לפני קיום המפתח. */
export function readShowStudioBackInfo(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(ALBUM_SHOW_STUDIO_BACK_INFO_KEY);
  if (v === null) return true;
  return v === "1";
}

export function writeShowStudioBackInfo(value: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    ALBUM_SHOW_STUDIO_BACK_INFO_KEY,
    value ? "1" : "0"
  );
}
