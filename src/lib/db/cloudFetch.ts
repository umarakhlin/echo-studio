import type { Photo } from "./types";

export async function studioOp<T>(
  op: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch("/api/studio-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ op, payload }),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text || res.statusText;
    try {
      const j = JSON.parse(text) as { error?: string; hint?: string };
      if (j.error) {
        msg = j.hint ? `${j.error} — ${j.hint}` : j.error;
      }
    } catch {
      /* גוף לא JSON */
    }
    throw new Error(msg);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function uploadStudioPhoto(params: {
  albumId: string;
  projectId: string;
  file: File;
}): Promise<Photo> {
  const fd = new FormData();
  fd.append("albumId", params.albumId);
  fd.append("projectId", params.projectId);
  fd.append("file", params.file);
  const res = await fetch("/api/studio-data/upload-photo", {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text || "העלאה נכשלה.";
    try {
      const j = JSON.parse(text) as { error?: string; hint?: string };
      if (j.error) msg = j.hint ? `${j.error} — ${j.hint}` : j.error;
    } catch {
      /* body לא JSON */
    }
    throw new Error(msg);
  }
  return JSON.parse(text) as Photo;
}

export async function replaceStudioPhoto(params: {
  photoId: string;
  file: File;
}): Promise<Photo> {
  const fd = new FormData();
  fd.append("replacePhotoId", params.photoId);
  fd.append("file", params.file);
  const res = await fetch("/api/studio-data/upload-photo", {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text || "החלפת התמונה נכשלה.";
    try {
      const j = JSON.parse(text) as { error?: string; hint?: string };
      if (j.error) msg = j.hint ? `${j.error} — ${j.hint}` : j.error;
    } catch {
      /* body לא JSON */
    }
    throw new Error(msg);
  }
  return JSON.parse(text) as Photo;
}
