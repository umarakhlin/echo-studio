import { v4 as uuid } from "uuid";

import { getDB } from "./schema";
import type { Album } from "./types";

export async function listAlbumsByProject(projectId: string): Promise<Album[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("albums", "by-projectId", projectId);
  return all.sort((a, b) => a.order - b.order);
}

export async function getAlbum(id: string): Promise<Album | undefined> {
  const db = await getDB();
  return db.get("albums", id);
}

export async function createAlbum(
  input: Omit<Album, "id" | "order" | "createdAt" | "updatedAt"> & {
    order?: number;
  }
): Promise<Album> {
  const now = Date.now();
  const db = await getDB();

  const order =
    input.order ??
    (await listAlbumsByProject(input.projectId)).reduce(
      (max, a) => Math.max(max, a.order),
      -1
    ) + 1;

  const album: Album = {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    parentAlbumId: input.parentAlbumId ?? null,
    order,
    ...input,
  };
  await db.put("albums", album);
  return album;
}

export async function updateAlbum(
  id: string,
  patch: Partial<Omit<Album, "id" | "createdAt">>
): Promise<Album> {
  const db = await getDB();
  const existing = await db.get("albums", id);
  if (!existing) throw new Error(`Album ${id} not found`);
  const updated: Album = { ...existing, ...patch, updatedAt: Date.now() };
  await db.put("albums", updated);
  return updated;
}

export async function deleteAlbum(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["albums", "photos"], "readwrite");
  const photoKeys = await tx
    .objectStore("photos")
    .index("by-albumId")
    .getAllKeys(id);

  await Promise.all([
    ...photoKeys.map((key) => tx.objectStore("photos").delete(key)),
    tx.objectStore("albums").delete(id),
  ]);
  await tx.done;
}

/** מבטיח שלפחות אלבום ברירת מחדל אחד קיים בפרויקט. מחזיר את ה-id שלו. */
export async function ensureDefaultAlbum(projectId: string): Promise<Album> {
  const albums = await listAlbumsByProject(projectId);
  if (albums.length > 0) return albums[0];
  return createAlbum({
    projectId,
    title: "אלבום ראשי",
    description: "האלבום הראשי של הפרויקט",
  });
}
