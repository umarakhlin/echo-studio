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
    try {
      const j = JSON.parse(text) as { error?: string };
      throw new Error(j.error ?? (text || res.statusText));
    } catch {
      throw new Error(text || res.statusText);
    }
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
    try {
      const j = JSON.parse(text) as { error?: string };
      throw new Error(j.error ?? text);
    } catch {
      throw new Error(text || "העלאה נכשלה.");
    }
  }
  return JSON.parse(text) as Photo;
}
