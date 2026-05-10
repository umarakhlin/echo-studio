/** העדפות כינוי תמונה בדף אלבום לקוח — נשמרות מקומית בדפדפן. */

export const ALBUM_SHOW_CUSTOM_LABEL_KEY = "echo-album-show-display-names";

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
