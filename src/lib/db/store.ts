/**
 * ניתוב מצב נתונים: IndexedDB מקומי או Supabase דרך /api/studio-data.
 */

import { getDataBackendMode } from "@/lib/data-backend";

import * as localAlbums from "./albums";
import * as localClients from "./clients";
import { studioOp, uploadStudioPhoto } from "./cloudFetch";
import * as localPhotos from "./photos";
import * as localProjects from "./projects";
import * as localStats from "./stats";
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
  return localClients.listClients();
}

export async function getClient(id: string): Promise<Client | undefined> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<Client | null>("getClient", { id });
    return r ?? undefined;
  }
  return localClients.getClient(id);
}

export async function createClient(
  input: Omit<Client, "id" | "createdAt" | "updatedAt">
): Promise<Client> {
  if (getDataBackendMode() === "cloud") return cloud("createClient", { input });
  return localClients.createClient(input);
}

export async function updateClient(
  id: string,
  patch: Partial<Omit<Client, "id" | "createdAt">>
): Promise<Client> {
  if (getDataBackendMode() === "cloud") return cloud("updateClient", { id, patch });
  return localClients.updateClient(id, patch);
}

export async function deleteClient(id: string): Promise<void> {
  if (getDataBackendMode() === "cloud") {
    await cloud("deleteClient", { id });
    return;
  }
  return localClients.deleteClient(id);
}

export async function listProjects(): Promise<Project[]> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<unknown>("listProjects");
    return Array.isArray(r) ? (r as Project[]) : [];
  }
  return localProjects.listProjects();
}

export async function listProjectsByClient(clientId: string): Promise<Project[]> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<unknown>("listProjectsByClient", { clientId });
    return Array.isArray(r) ? (r as Project[]) : [];
  }
  return localProjects.listProjectsByClient(clientId);
}

export async function getProject(id: string): Promise<Project | undefined> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<Project | null>("getProject", { id });
    return r ?? undefined;
  }
  return localProjects.getProject(id);
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
  return localProjects.getProjectByCode(code);
}

export async function createProject(
  input: Omit<Project, "id" | "code" | "password" | "createdAt" | "updatedAt"> & {
    code?: string;
    password?: string;
  }
): Promise<Project> {
  if (getDataBackendMode() === "cloud") return cloud("createProject", { input });
  return localProjects.createProject(input);
}

export async function updateProject(
  id: string,
  patch: Partial<Omit<Project, "id" | "createdAt">>
): Promise<Project> {
  if (getDataBackendMode() === "cloud") return cloud("updateProject", { id, patch });
  return localProjects.updateProject(id, patch);
}

export async function setProjectStatus(id: string, status: ProjectStatus): Promise<Project> {
  if (getDataBackendMode() === "cloud")
    return cloud("setProjectStatus", { id, status });
  return localProjects.setProjectStatus(id, status);
}

export async function deleteProject(id: string): Promise<void> {
  if (getDataBackendMode() === "cloud") {
    await cloud("deleteProject", { id });
    return;
  }
  return localProjects.deleteProject(id);
}

export async function listAlbumsByProject(projectId: string): Promise<Album[]> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<unknown>("listAlbumsByProject", { projectId });
    return Array.isArray(r) ? (r as Album[]) : [];
  }
  return localAlbums.listAlbumsByProject(projectId);
}

export async function getAlbum(id: string): Promise<Album | undefined> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<Album | null>("getAlbum", { id });
    return r ?? undefined;
  }
  return localAlbums.getAlbum(id);
}

export async function createAlbum(
  input: Omit<Album, "id" | "order" | "createdAt" | "updatedAt"> & { order?: number }
): Promise<Album> {
  if (getDataBackendMode() === "cloud") return cloud("createAlbum", { input });
  return localAlbums.createAlbum(input);
}

export async function updateAlbum(
  id: string,
  patch: Partial<Omit<Album, "id" | "createdAt">>
): Promise<Album> {
  if (getDataBackendMode() === "cloud") return cloud("updateAlbum", { id, patch });
  return localAlbums.updateAlbum(id, patch);
}

export async function deleteAlbum(id: string): Promise<void> {
  if (getDataBackendMode() === "cloud") {
    await cloud("deleteAlbum", { id });
    return;
  }
  return localAlbums.deleteAlbum(id);
}

export async function ensureDefaultAlbum(projectId: string): Promise<Album> {
  if (getDataBackendMode() === "cloud")
    return cloud("ensureDefaultAlbum", { projectId });
  return localAlbums.ensureDefaultAlbum(projectId);
}

export async function listPhotosByAlbum(albumId: string): Promise<Photo[]> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<unknown>("listPhotosByAlbum", { albumId });
    return Array.isArray(r) ? (r as Photo[]) : [];
  }
  return localPhotos.listPhotosByAlbum(albumId);
}

export async function listPhotosByProject(projectId: string): Promise<Photo[]> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<unknown>("listPhotosByProject", { projectId });
    return Array.isArray(r) ? (r as Photo[]) : [];
  }
  return localPhotos.listPhotosByProject(projectId);
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
  if (getDataBackendMode() === "cloud") {
    const r = await cloud<Photo | null>("getPhoto", { id });
    return r ?? undefined;
  }
  return localPhotos.getPhoto(id);
}

export async function addPhotoToAlbum(
  input: Parameters<typeof localPhotos.addPhotoToAlbum>[0]
): Promise<Photo> {
  if (getDataBackendMode() === "cloud") {
    return uploadStudioPhoto({
      albumId: input.albumId,
      projectId: input.projectId,
      file: input.file,
    });
  }
  return localPhotos.addPhotoToAlbum(input);
}

export async function addPhotoToAlbumFromBlob(
  input: Parameters<typeof localPhotos.addPhotoToAlbumFromBlob>[0]
): Promise<Photo> {
  if (getDataBackendMode() === "cloud") {
    const mime = (input.mimeType ?? input.blob.type) || "image/jpeg";
    const file = new File([input.blob], input.fileName, { type: mime });
    return uploadStudioPhoto({
      albumId: input.albumId,
      projectId: input.projectId,
      file,
    });
  }
  return localPhotos.addPhotoToAlbumFromBlob(input);
}

export async function updatePhoto(
  id: string,
  patch: Parameters<typeof localPhotos.updatePhoto>[1]
): Promise<Photo> {
  if (getDataBackendMode() === "cloud") return cloud("updatePhoto", { id, patch });
  return localPhotos.updatePhoto(id, patch);
}

export async function toggleStarPhoto(id: string): Promise<Photo> {
  if (getDataBackendMode() === "cloud") return cloud("toggleStarPhoto", { id });
  return localPhotos.toggleStarPhoto(id);
}

export async function deletePhoto(id: string): Promise<void> {
  if (getDataBackendMode() === "cloud") {
    await cloud("deletePhoto", { id });
    return;
  }
  return localPhotos.deletePhoto(id);
}

export async function reorderPhotos(albumId: string, orderedIds: string[]): Promise<void> {
  if (getDataBackendMode() === "cloud") {
    await cloud("reorderPhotos", { albumId, orderedIds });
    return;
  }
  return localPhotos.reorderPhotos(albumId, orderedIds);
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
  return localStats.getDashboardStats();
}
