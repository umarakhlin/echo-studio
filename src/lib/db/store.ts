/**
 * ניתוב מצב נתונים: IndexedDB מקומי או Supabase דרך /api/studio-data.
 * מודולי IndexedDB נטענים רק במצב מקומי (`import()` דינמי), כדי שלא ייטענו לדפדפן במצב ענן.
 */

import { getDataBackendMode } from "@/lib/data-backend";

import { studioOp, replaceStudioPhoto, uploadStudioPhoto } from "./cloudFetch";
import type { Album, Client, DashboardStats, Photo, Project, ProjectStatus } from "./types";
import { projectStatusOrder } from "./types";

export { generatePassword, generateProjectCode } from "./projectSecrets";

async function cloud<T>(op: string, payload: Record<string, unknown> = {}): Promise<T> {
  return studioOp<T>(op, payload);
}

export async function listClients(): Promise<Client[]> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<unknown>("listClients");
    return Array.isArray(r) ? (r as Client[]) : [];
  }
  return (await import("./clients")).listClients();
}

export async function getClient(id: string): Promise<Client | undefined> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<Client | null>("getClient", { id });
    return r ?? undefined;
  }
  return (await import("./clients")).getClient(id);
}

export async function createClient(
  input: Omit<Client, "id" | "createdAt" | "updatedAt">
): Promise<Client> {
  if (getDataBackendMode() === "cloud") return cloud("createClient", { input });
  return (await import("./clients")).createClient(input);
}

export async function updateClient(
  id: string,
  patch: Partial<Omit<Client, "id" | "createdAt">>
): Promise<Client> {
  if (getDataBackendMode() === "cloud") return cloud("updateClient", { id, patch });
  return (await import("./clients")).updateClient(id, patch);
}

export async function deleteClient(id: string): Promise<void> {
  if (getDataBackendMode() === "cloud") {
    await cloud("deleteClient", { id });
    return;
  }
  return (await import("./clients")).deleteClient(id);
}

export async function listProjects(): Promise<Project[]> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<unknown>("listProjects");
    return Array.isArray(r) ? (r as Project[]) : [];
  }
  return (await import("./projects")).listProjects();
}

export async function listProjectsByClient(clientId: string): Promise<Project[]> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<unknown>("listProjectsByClient", { clientId });
    return Array.isArray(r) ? (r as Project[]) : [];
  }
  return (await import("./projects")).listProjectsByClient(clientId);
}

export async function getProject(id: string): Promise<Project | undefined> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<Project | null>("getProject", { id });
    return r ?? undefined;
  }
  return (await import("./projects")).getProject(id);
}

/** נתוני דף אלבום ללקוח — ללא סשן סטודיו (רק במצב ענן). */
export async function fetchPublicAlbumPage(code: string): Promise<{
  project: Project;
  albums: Album[];
  photos: Photo[];
} | null> {
  const res = await fetch(
    `/api/public/project/${encodeURIComponent(code.toUpperCase())}`,
    { cache: "no-store" }
  );
  const text = await res.text();
  if (res.status === 404) return null;
  if (!res.ok) {
    let msg = text || "טעינה נכשלה.";
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* body לא JSON */
    }
    throw new Error(msg);
  }
  return JSON.parse(text) as {
    project: Project;
    albums: Album[];
    photos: Photo[];
  };
}

export async function getProjectByCode(code: string): Promise<Project | undefined> {
  if (getDataBackendMode() === "cloud") {
    const page = await fetchPublicAlbumPage(code);
    return page?.project;
  }
  return (await import("./projects")).getProjectByCode(code);
}

export async function createProject(
  input: Omit<Project, "id" | "code" | "password" | "createdAt" | "updatedAt"> & {
    code?: string;
    password?: string;
  }
): Promise<Project> {
  if (getDataBackendMode() === "cloud") return cloud("createProject", { input });
  return (await import("./projects")).createProject(input);
}

export async function updateProject(
  id: string,
  patch: Partial<Omit<Project, "id" | "createdAt">>
): Promise<Project> {
  if (getDataBackendMode() === "cloud") return cloud("updateProject", { id, patch });
  return (await import("./projects")).updateProject(id, patch);
}

export async function setProjectStatus(id: string, status: ProjectStatus): Promise<Project> {
  if (getDataBackendMode() === "cloud")
    return cloud("setProjectStatus", { id, status });
  return (await import("./projects")).setProjectStatus(id, status);
}

export async function deleteProject(id: string): Promise<void> {
  if (getDataBackendMode() === "cloud") {
    await cloud("deleteProject", { id });
    return;
  }
  return (await import("./projects")).deleteProject(id);
}

export async function listAlbumsByProject(projectId: string): Promise<Album[]> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<unknown>("listAlbumsByProject", { projectId });
    return Array.isArray(r) ? (r as Album[]) : [];
  }
  return (await import("./albums")).listAlbumsByProject(projectId);
}

export async function getAlbum(id: string): Promise<Album | undefined> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<Album | null>("getAlbum", { id });
    return r ?? undefined;
  }
  return (await import("./albums")).getAlbum(id);
}

export async function createAlbum(
  input: Omit<Album, "id" | "order" | "createdAt" | "updatedAt"> & { order?: number }
): Promise<Album> {
  if (getDataBackendMode() === "cloud") return cloud("createAlbum", { input });
  return (await import("./albums")).createAlbum(input);
}

export async function updateAlbum(
  id: string,
  patch: Partial<Omit<Album, "id" | "createdAt">>
): Promise<Album> {
  if (getDataBackendMode() === "cloud") return cloud("updateAlbum", { id, patch });
  return (await import("./albums")).updateAlbum(id, patch);
}

export async function deleteAlbum(id: string): Promise<void> {
  if (getDataBackendMode() === "cloud") {
    await cloud("deleteAlbum", { id });
    return;
  }
  return (await import("./albums")).deleteAlbum(id);
}

export async function ensureDefaultAlbum(projectId: string): Promise<Album> {
  if (getDataBackendMode() === "cloud")
    return cloud("ensureDefaultAlbum", { projectId });
  return (await import("./albums")).ensureDefaultAlbum(projectId);
}

export async function listPhotosByAlbum(albumId: string): Promise<Photo[]> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<unknown>("listPhotosByAlbum", { albumId });
    return Array.isArray(r) ? (r as Photo[]) : [];
  }
  return (await import("./photos")).listPhotosByAlbum(albumId);
}

export async function listPhotosByProject(projectId: string): Promise<Photo[]> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<unknown>("listPhotosByProject", { projectId });
    return Array.isArray(r) ? (r as Photo[]) : [];
  }
  return (await import("./photos")).listPhotosByProject(projectId);
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<Photo | null>("getPhoto", { id });
    return r ?? undefined;
  }
  return (await import("./photos")).getPhoto(id);
}

export async function addPhotoToAlbum(input: {
  albumId: string;
  projectId: string;
  file: File;
}): Promise<Photo> {
  if (getDataBackendMode() === "cloud") {
    return uploadStudioPhoto({
      albumId: input.albumId,
      projectId: input.projectId,
      file: input.file,
    });
  }
  return (await import("./photos")).addPhotoToAlbum(input);
}

export async function addPhotoToAlbumFromBlob(input: {
  albumId: string;
  projectId: string;
  blob: Blob;
  fileName: string;
  mimeType?: string;
}): Promise<Photo> {
  if (getDataBackendMode() === "cloud") {
    const mime = (input.mimeType ?? input.blob.type) || "image/jpeg";
    const file = new File([input.blob], input.fileName, { type: mime });
    return uploadStudioPhoto({
      albumId: input.albumId,
      projectId: input.projectId,
      file,
    });
  }
  return (await import("./photos")).addPhotoToAlbumFromBlob(input);
}

export async function replacePhotoFromBlob(input: {
  photoId: string;
  blob: Blob;
  fileName: string;
  mimeType?: string;
}): Promise<Photo> {
  if (getDataBackendMode() === "cloud") {
    const mime = (input.mimeType ?? input.blob.type) || "image/jpeg";
    const file = new File([input.blob], input.fileName, { type: mime });
    return replaceStudioPhoto({ photoId: input.photoId, file });
  }
  return (await import("./photos")).replacePhotoFromBlob(input);
}

export async function updatePhoto(
  id: string,
  patch: Partial<Omit<Photo, "id" | "createdAt" | "blob" | "thumbnailBlob">>
): Promise<Photo> {
  if (getDataBackendMode() === "cloud") return cloud("updatePhoto", { id, patch });
  return (await import("./photos")).updatePhoto(id, patch);
}

export async function toggleStarPhoto(id: string): Promise<Photo> {
  if (getDataBackendMode() === "cloud") return cloud("toggleStarPhoto", { id });
  return (await import("./photos")).toggleStarPhoto(id);
}

/** סימון כוכב מדף אלבום לקוח — ללא סשן סטודיו (ענן: API ציבורי לפי קוד פרויקט). */
export async function toggleStarOnClientAlbum(
  projectCode: string,
  photoId: string
): Promise<{ id: string; starred: boolean; updatedAt: number }> {
  const code = projectCode.toUpperCase();
  if (getDataBackendMode() === "cloud") {
    const res = await fetch(
      `/api/public/project/${encodeURIComponent(code)}/toggle-star`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      }
    );
    const text = await res.text();
    if (!res.ok) {
      let msg = text || "עדכון נכשל.";
      try {
        const j = JSON.parse(text) as { error?: string };
        if (j.error) msg = j.error;
      } catch {
        /* לא JSON */
      }
      throw new Error(msg);
    }
    const body = JSON.parse(text) as {
      photo?: { id: string; starred: boolean; updatedAt: number };
    };
    const p = body.photo;
    if (!p?.id) throw new Error("תגובת שרת לא תקינה.");
    return p;
  }
  const updated = await toggleStarPhoto(photoId);
  return {
    id: updated.id,
    starred: updated.starred,
    updatedAt: updated.updatedAt,
  };
}

export async function deletePhoto(id: string): Promise<void> {
  if (getDataBackendMode() === "cloud") {
    await cloud("deletePhoto", { id });
    return;
  }
  return (await import("./photos")).deletePhoto(id);
}

export async function reorderPhotos(albumId: string, orderedIds: string[]): Promise<void> {
  if (getDataBackendMode() === "cloud") {
    await cloud("reorderPhotos", { albumId, orderedIds });
    return;
  }
  return (await import("./photos")).reorderPhotos(albumId, orderedIds);
}

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function emptyDashboardStats(): DashboardStats {
  const byStatus = projectStatusOrder.reduce<Record<ProjectStatus, number>>(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    {} as Record<ProjectStatus, number>
  );
  return {
    clientsCount: 0,
    projectsCount: 0,
    activeProjects: 0,
    photosCount: 0,
    starredCount: 0,
    byStatus,
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<unknown>("getDashboardStats");
    if (
      isPlainRecord(r) &&
      typeof r.clientsCount === "number" &&
      typeof r.projectsCount === "number" &&
      typeof r.activeProjects === "number" &&
      typeof r.photosCount === "number" &&
      typeof r.starredCount === "number" &&
      isPlainRecord(r.byStatus)
    ) {
      return r as unknown as DashboardStats;
    }
    return emptyDashboardStats();
  }
  return (await import("./stats")).getDashboardStats();
}
