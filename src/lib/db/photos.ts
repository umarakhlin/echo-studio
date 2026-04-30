import { v4 as uuid } from "uuid";

import { getDB } from "./schema";
import type { Photo } from "./types";

export async function listPhotosByAlbum(albumId: string): Promise<Photo[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("photos", "by-albumId", albumId);
  return all.sort((a, b) => a.serialNumber - b.serialNumber);
}

export async function listPhotosByProject(projectId: string): Promise<Photo[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("photos", "by-projectId", projectId);
  return all.sort((a, b) => a.serialNumber - b.serialNumber);
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
  const db = await getDB();
  return db.get("photos", id);
}

interface AddPhotoInput {
  albumId: string;
  projectId: string;
  file: File;
}

/**
 * מוסיף תמונה לאלבום:
 *   - יוצר תמונה ממוזערת (~512px לאורך הצלע הארוכה)
 *   - מקצה מספר עוקב 1..N לפי הקיים באלבום
 */
export async function addPhotoToAlbum({
  albumId,
  projectId,
  file,
}: AddPhotoInput): Promise<Photo> {
  const { thumbnail, width, height } = await createThumbnail(file);

  const db = await getDB();

  // מציאת המספר העוקב הבא
  const existing = await db.getAllFromIndex("photos", "by-albumId", albumId);
  const nextSerial =
    existing.reduce((max, p) => Math.max(max, p.serialNumber), 0) + 1;

  const now = Date.now();
  const photo: Photo = {
    id: uuid(),
    albumId,
    projectId,
    serialNumber: nextSerial,
    fileName: file.name,
    mimeType: file.type || "image/jpeg",
    blob: file,
    thumbnailBlob: thumbnail,
    width,
    height,
    starred: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.put("photos", photo);
  return photo;
}

/** העלאה מאותו נתיב כמו קובץ — אחרי יישור ב-canvas או ייצוא מ-SVG. */
export async function addPhotoToAlbumFromBlob(input: {
  albumId: string;
  projectId: string;
  blob: Blob;
  fileName: string;
  mimeType?: string;
}): Promise<Photo> {
  const mime = input.mimeType ?? (input.blob.type || "image/jpeg");
  const file = new File([input.blob], input.fileName, { type: mime });
  return addPhotoToAlbum({
    albumId: input.albumId,
    projectId: input.projectId,
    file,
  });
}

/** מחליף את קובץ התמונה שכבר קיים (אותו מזהה ומספר עוקב) — אחרי סורק / יישור מחדש. */
export async function replacePhotoFromBlob(input: {
  photoId: string;
  blob: Blob;
  fileName: string;
  mimeType?: string;
}): Promise<Photo> {
  const db = await getDB();
  const existing = await db.get("photos", input.photoId);
  if (!existing) throw new Error(`Photo ${input.photoId} not found`);
  const mime = input.mimeType ?? (input.blob.type || "image/jpeg");
  const file = new File([input.blob], input.fileName, { type: mime });
  const { thumbnail, width, height } = await createThumbnail(file);
  const updated: Photo = {
    ...existing,
    fileName: input.fileName,
    mimeType: mime,
    blob: file,
    thumbnailBlob: thumbnail,
    width,
    height,
    updatedAt: Date.now(),
  };
  await db.put("photos", updated);
  return updated;
}

export async function updatePhoto(
  id: string,
  patch: Partial<Omit<Photo, "id" | "createdAt" | "blob" | "thumbnailBlob">>
): Promise<Photo> {
  const db = await getDB();
  const existing = await db.get("photos", id);
  if (!existing) throw new Error(`Photo ${id} not found`);
  const updated: Photo = { ...existing, ...patch, updatedAt: Date.now() };
  await db.put("photos", updated);
  return updated;
}

export async function toggleStarPhoto(id: string): Promise<Photo> {
  const db = await getDB();
  const existing = await db.get("photos", id);
  if (!existing) throw new Error(`Photo ${id} not found`);
  return updatePhoto(id, { starred: !existing.starred });
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDB();
  const photo = await db.get("photos", id);
  if (!photo) return;

  // לאחר מחיקה - דחיסת המספרים העוקבים כדי לשמר רצף 1..N
  const remaining = (
    await db.getAllFromIndex("photos", "by-albumId", photo.albumId)
  )
    .filter((p) => p.id !== id)
    .sort((a, b) => a.serialNumber - b.serialNumber);

  const tx = db.transaction("photos", "readwrite");
  await tx.store.delete(id);
  for (let i = 0; i < remaining.length; i++) {
    const p = remaining[i];
    if (p.serialNumber !== i + 1) {
      await tx.store.put({ ...p, serialNumber: i + 1, updatedAt: Date.now() });
    }
  }
  await tx.done;
}

/** סידור מחדש - מקבלים רשימה של ids לפי הסדר הרצוי. */
export async function reorderPhotos(
  albumId: string,
  orderedIds: string[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("photos", "readwrite");

  // בשל אילוץ ייחודיות [albumId, serialNumber], נשנה תחילה למספרים גדולים
  // ורק אחר כך נחזיר ל-1..N. שלב 1: ניקוי באמצעות offset.
  const offset = 100000;
  for (let i = 0; i < orderedIds.length; i++) {
    const photo = await tx.store.get(orderedIds[i]);
    if (!photo || photo.albumId !== albumId) continue;
    await tx.store.put({ ...photo, serialNumber: offset + i });
  }

  // שלב 2: החזרה לרצף 1..N.
  for (let i = 0; i < orderedIds.length; i++) {
    const photo = await tx.store.get(orderedIds[i]);
    if (!photo || photo.albumId !== albumId) continue;
    await tx.store.put({ ...photo, serialNumber: i + 1, updatedAt: Date.now() });
  }
  await tx.done;
}

/* -------------------------------------------------------------------------- */
/*  עזר: יצירת תמונה ממוזערת בצד הלקוח                                        */
/* -------------------------------------------------------------------------- */

const THUMBNAIL_LONG_EDGE = 512;
const THUMBNAIL_QUALITY = 0.82;

async function createThumbnail(file: File): Promise<{
  thumbnail: Blob | undefined;
  width?: number;
  height?: number;
}> {
  // בעת SSR או סביבה שלא תומכת — מחזירים ללא thumbnail
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return { thumbnail: undefined };
  }

  try {
    const bitmap = await loadBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, THUMBNAIL_LONG_EDGE / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { thumbnail: undefined, width, height };

    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const thumbnail = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", THUMBNAIL_QUALITY)
    );

    return { thumbnail: thumbnail ?? undefined, width, height };
  } catch (err) {
    console.warn("createThumbnail failed", err);
    return { thumbnail: undefined };
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  // Fallback - פותחים HTMLImageElement ואז ממירים
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")?.drawImage(img, 0, 0);
    const bitmap = await createImageBitmap(canvas);
    return bitmap;
  } finally {
    URL.revokeObjectURL(url);
  }
}
