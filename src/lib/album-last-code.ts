/** קוד הפרויקט האחרון שנכנסו אליו בהצלחה — מקומי בדפדפן בלבד */

export const LAST_ALBUM_PROJECT_CODE_KEY = "echo-last-album-project-code";

export function readLastAlbumProjectCode(): string {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem(LAST_ALBUM_PROJECT_CODE_KEY) ?? "").trim();
}

export function writeLastAlbumProjectCode(code: string): void {
  if (typeof window === "undefined") return;
  const c = code.trim().toUpperCase();
  if (c) localStorage.setItem(LAST_ALBUM_PROJECT_CODE_KEY, c);
  else localStorage.removeItem(LAST_ALBUM_PROJECT_CODE_KEY);
}
