import "server-only";

import { v4 as uuid } from "uuid";

import type {
  Album,
  Client,
  DashboardStats,
  Photo,
  Project,
  ProjectStatus,
} from "@/lib/db/types";
import { projectStatusOrder } from "@/lib/db/types";
import { generateProjectCode } from "@/lib/db/projectSecrets";
import { ECHO_PHOTOS_BUCKET, getPublicObjectUrl, supabaseAdmin } from "@/lib/supabase/admin";

const FALLBACK_STATUS: ProjectStatus = "intake";

/** מניעת תצוגת תמונה ישנה מהמטמון אחרי החלפת קובץ ב-Storage (אותו נתיב). */
function publicUrlWithVersion(storagePath: string, updatedAt: number): string {
  const base = getPublicObjectUrl(storagePath);
  const t = Number(updatedAt);
  if (!Number.isFinite(t) || t <= 0) return base;
  return base.includes("?") ? `${base}&v=${t}` : `${base}?v=${t}`;
}

function normalizeProjectStatus(raw: unknown): ProjectStatus {
  if (
    typeof raw === "string" &&
    (projectStatusOrder as readonly string[]).includes(raw)
  ) {
    return raw as ProjectStatus;
  }
  return FALLBACK_STATUS;
}

function rowToClient(r: Record<string, unknown>): Client {
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    phone: (r.phone as string) ?? undefined,
    email: (r.email as string) ?? undefined,
    address: (r.address as string) ?? undefined,
    notes: (r.notes as string) ?? undefined,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

function rowToProject(r: Record<string, unknown>): Project {
  return {
    id: String(r.id ?? ""),
    clientId: String(r.client_id ?? ""),
    code: String(r.code ?? ""),
    password: (r.password as string) ?? "",
    title: String(r.title ?? ""),
    status: normalizeProjectStatus(r.status),
    startDate: (r.start_date as string) ?? undefined,
    targetEndDate: (r.target_end_date as string) ?? undefined,
    estimatedPhotos: (r.estimated_photos as number) ?? undefined,
    notes: (r.notes as string) ?? undefined,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

function rowToAlbum(r: Record<string, unknown>): Album {
  return {
    id: String(r.id ?? ""),
    projectId: String(r.project_id ?? ""),
    parentAlbumId: (r.parent_album_id as string | null) ?? null,
    title: String(r.title ?? ""),
    description: (r.description as string) ?? undefined,
    coverPhotoId: (r.cover_photo_id as string) ?? undefined,
    order: Number(r.sort_order),
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

function normalizePeopleJson(raw: unknown): string[] | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw) && raw.every((x) => typeof x === "string")) {
    return raw;
  }
  return undefined;
}

function rowToPhoto(r: Record<string, unknown>): Photo {
  const storagePath = String(r.storage_path ?? "");
  const thumbPath = String(r.thumb_path ?? "");
  const updatedAt = Number(r.updated_at);
  return {
    id: String(r.id ?? ""),
    albumId: String(r.album_id ?? ""),
    projectId: String(r.project_id ?? ""),
    serialNumber: Number(r.serial_number) || 0,
    fileName: String(r.file_name ?? ""),
    mimeType: String(r.mime_type ?? "image/jpeg"),
    blob: new Blob(),
    thumbnailBlob: undefined,
    displayUrl: storagePath.trim()
      ? publicUrlWithVersion(storagePath, updatedAt)
      : undefined,
    thumbnailDisplayUrl: thumbPath.trim()
      ? publicUrlWithVersion(thumbPath, updatedAt)
      : undefined,
    width: (r.width as number) ?? undefined,
    height: (r.height as number) ?? undefined,
    starred: Boolean(r.starred),
    estimatedDate: (r.estimated_date as string) ?? undefined,
    story: (r.story as string) ?? undefined,
    people: normalizePeopleJson(r.people),
    createdAt: Number(r.created_at),
    updatedAt,
  };
}

/* -------------------------------------------------------------------------- */
/* clients                                                                    */
/* -------------------------------------------------------------------------- */

export async function cloudListClients(): Promise<Client[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("echo_clients").select("*").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToClient(r as Record<string, unknown>));
}

export async function cloudGetClient(id: string): Promise<Client | undefined> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("echo_clients").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  return rowToClient(data as Record<string, unknown>);
}

export async function cloudCreateClient(
  input: Omit<Client, "id" | "createdAt" | "updatedAt">
): Promise<Client> {
  const now = Date.now();
  const id = uuid();
  const row = {
    id,
    name: input.name,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    notes: input.notes ?? null,
    created_at: now,
    updated_at: now,
  };
  const sb = supabaseAdmin();
  const { error } = await sb.from("echo_clients").insert(row);
  if (error) throw new Error(error.message);
  return {
    id,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

export async function cloudUpdateClient(
  id: string,
  patch: Partial<Omit<Client, "id" | "createdAt">>
): Promise<Client> {
  const existing = await cloudGetClient(id);
  if (!existing) throw new Error(`Client ${id} not found`);
  const updated: Client = { ...existing, ...patch, updatedAt: Date.now() };
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("echo_clients")
    .update({
      name: updated.name,
      phone: updated.phone ?? null,
      email: updated.email ?? null,
      address: updated.address ?? null,
      notes: updated.notes ?? null,
      updated_at: updated.updatedAt,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return updated;
}

export async function cloudDeleteClient(id: string): Promise<void> {
  const sb = supabaseAdmin();
  const { count, error: cErr } = await sb
    .from("echo_projects")
    .select("*", { count: "exact", head: true })
    .eq("client_id", id);
  if (cErr) throw new Error(cErr.message);
  if ((count ?? 0) > 0) {
    throw new Error(
      `לא ניתן למחוק את הלקוח - יש לו ${count} פרויקט/ים פעילים. מחקו אותם קודם.`
    );
  }
  const { error } = await sb.from("echo_clients").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* projects                                                                   */
/* -------------------------------------------------------------------------- */

export async function cloudListProjects(): Promise<Project[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("echo_projects").select("*");
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => rowToProject(r as Record<string, unknown>))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function cloudListProjectsByClient(clientId: string): Promise<Project[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("echo_projects").select("*").eq("client_id", clientId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => rowToProject(r as Record<string, unknown>))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function cloudGetProject(id: string): Promise<Project | undefined> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("echo_projects").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  return rowToProject(data as Record<string, unknown>);
}

export async function cloudGetProjectByCode(code: string): Promise<Project | undefined> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("echo_projects")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  return rowToProject(data as Record<string, unknown>);
}

export async function cloudCreateProject(
  input: Omit<Project, "id" | "code" | "password" | "createdAt" | "updatedAt"> & {
    code?: string;
    password?: string;
  }
): Promise<Project> {
  const now = Date.now();
  let code = (input.code ?? generateProjectCode()).toUpperCase();
  const sb = supabaseAdmin();
  for (let i = 0; i < 8; i++) {
    const { data } = await sb.from("echo_projects").select("id").eq("code", code).maybeSingle();
    if (!data) break;
    code = generateProjectCode();
  }
  const project: Project = {
    id: uuid(),
    code,
    password: input.password ?? "",
    createdAt: now,
    updatedAt: now,
    title: input.title,
    status: input.status,
    clientId: input.clientId,
    startDate: input.startDate,
    targetEndDate: input.targetEndDate,
    estimatedPhotos: input.estimatedPhotos,
    notes: input.notes,
  };
  const { error } = await sb.from("echo_projects").insert({
    id: project.id,
    client_id: project.clientId,
    code: project.code,
    password: project.password,
    title: project.title,
    status: project.status,
    start_date: project.startDate ?? null,
    target_end_date: project.targetEndDate ?? null,
    estimated_photos: project.estimatedPhotos ?? null,
    notes: project.notes ?? null,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  });
  if (error) throw new Error(error.message);
  return project;
}

export async function cloudUpdateProject(
  id: string,
  patch: Partial<Omit<Project, "id" | "createdAt">>
): Promise<Project> {
  const existing = await cloudGetProject(id);
  if (!existing) throw new Error(`Project ${id} not found`);
  const updated: Project = { ...existing, ...patch, updatedAt: Date.now() };
  if (patch.code) updated.code = patch.code.toUpperCase();
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("echo_projects")
    .update({
      client_id: updated.clientId,
      code: updated.code,
      password: updated.password,
      title: updated.title,
      status: updated.status,
      start_date: updated.startDate ?? null,
      target_end_date: updated.targetEndDate ?? null,
      estimated_photos: updated.estimatedPhotos ?? null,
      notes: updated.notes ?? null,
      updated_at: updated.updatedAt,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return updated;
}

export async function cloudSetProjectStatus(id: string, status: ProjectStatus): Promise<Project> {
  return cloudUpdateProject(id, { status });
}

async function storageRemovePaths(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const sb = supabaseAdmin();
  const { error } = await sb.storage.from(ECHO_PHOTOS_BUCKET).remove(paths);
  if (error) console.warn("storage remove:", error.message);
}

export async function cloudDeleteProject(id: string): Promise<void> {
  const sb = supabaseAdmin();
  const { data: rows } = await sb
    .from("echo_photos")
    .select("storage_path, thumb_path")
    .eq("project_id", id);
  const paths: string[] = [];
  for (const raw of rows ?? []) {
    const r = raw as { storage_path: string; thumb_path: string };
    paths.push(r.storage_path);
    if (r.thumb_path !== r.storage_path) paths.push(r.thumb_path);
  }
  await storageRemovePaths(paths);
  const { error } = await sb.from("echo_projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* albums                                                                     */
/* -------------------------------------------------------------------------- */

export async function cloudListAlbumsByProject(projectId: string): Promise<Album[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("echo_albums")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToAlbum(r as Record<string, unknown>));
}

export async function cloudGetAlbum(id: string): Promise<Album | undefined> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("echo_albums").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  return rowToAlbum(data as Record<string, unknown>);
}

export async function cloudCreateAlbum(
  input: Omit<Album, "id" | "order" | "createdAt" | "updatedAt"> & { order?: number }
): Promise<Album> {
  const now = Date.now();
  const sb = supabaseAdmin();
  let sortOrder = input.order;
  if (sortOrder === undefined) {
    const albums = await cloudListAlbumsByProject(input.projectId);
    sortOrder = albums.reduce((max, a) => Math.max(max, a.order), -1) + 1;
  }
  const album: Album = {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    parentAlbumId: input.parentAlbumId ?? null,
    order: sortOrder,
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    coverPhotoId: input.coverPhotoId,
  };
  const { error } = await sb.from("echo_albums").insert({
    id: album.id,
    project_id: album.projectId,
    parent_album_id: album.parentAlbumId ?? null,
    title: album.title,
    description: album.description ?? null,
    cover_photo_id: album.coverPhotoId ?? null,
    sort_order: album.order,
    created_at: album.createdAt,
    updated_at: album.updatedAt,
  });
  if (error) throw new Error(error.message);
  return album;
}

export async function cloudUpdateAlbum(
  id: string,
  patch: Partial<Omit<Album, "id" | "createdAt">>
): Promise<Album> {
  const existing = await cloudGetAlbum(id);
  if (!existing) throw new Error(`Album ${id} not found`);
  const updated: Album = { ...existing, ...patch, updatedAt: Date.now() };
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("echo_albums")
    .update({
      title: updated.title,
      description: updated.description ?? null,
      cover_photo_id: updated.coverPhotoId ?? null,
      parent_album_id: updated.parentAlbumId ?? null,
      sort_order: updated.order,
      updated_at: updated.updatedAt,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return updated;
}

export async function cloudDeleteAlbum(id: string): Promise<void> {
  const photos = await cloudListPhotosByAlbum(id);
  const paths: string[] = [];
  const sb = supabaseAdmin();
  for (const p of photos) {
    const { data } = await sb
      .from("echo_photos")
      .select("storage_path, thumb_path")
      .eq("id", p.id)
      .maybeSingle();
    if (data) {
      const r = data as { storage_path: string; thumb_path: string };
      paths.push(r.storage_path);
      if (r.thumb_path !== r.storage_path) paths.push(r.thumb_path);
    }
  }
  await storageRemovePaths(paths);
  const { error } = await sb.from("echo_albums").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function cloudEnsureDefaultAlbum(projectId: string): Promise<Album> {
  const albums = await cloudListAlbumsByProject(projectId);
  if (albums.length > 0) return albums[0];
  return cloudCreateAlbum({
    projectId,
    title: "אלבום ראשי",
    description: "האלבום הראשי של הפרויקט",
  });
}

/* -------------------------------------------------------------------------- */
/* photos                                                                     */
/* -------------------------------------------------------------------------- */

export async function cloudListPhotosByAlbum(albumId: string): Promise<Photo[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("echo_photos")
    .select("*")
    .eq("album_id", albumId)
    .order("serial_number");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToPhoto(r as Record<string, unknown>));
}

export async function cloudListPhotosByProject(projectId: string): Promise<Photo[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("echo_photos")
    .select("*")
    .eq("project_id", projectId)
    .order("serial_number");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToPhoto(r as Record<string, unknown>));
}

export async function cloudGetPhoto(id: string): Promise<Photo | undefined> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("echo_photos").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  return rowToPhoto(data as Record<string, unknown>);
}

export async function cloudUploadPhoto(input: {
  albumId: string;
  projectId: string;
  file: File;
}): Promise<Photo> {
  const { albumId, projectId, file } = input;
  const sb = supabaseAdmin();
  const existing = await cloudListPhotosByAlbum(albumId);
  const nextSerial = existing.reduce((max, p) => Math.max(max, p.serialNumber), 0) + 1;
  const photoId = uuid();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const storagePath = `${projectId}/${photoId}/original.${ext}`;
  const thumbPath = `${projectId}/${photoId}/thumb.jpg`;

  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upOrig } = await sb.storage
    .from(ECHO_PHOTOS_BUCKET)
    .upload(storagePath, buf, { contentType: file.type || "image/jpeg", upsert: true });
  if (upOrig) throw new Error(upOrig.message);
  const { error: upThumb } = await sb.storage
    .from(ECHO_PHOTOS_BUCKET)
    .upload(thumbPath, buf, { contentType: "image/jpeg", upsert: true });
  if (upThumb) throw new Error(upThumb.message);

  const now = Date.now();
  const width: number | undefined = undefined;
  const height: number | undefined = undefined;

  const row = {
    id: photoId,
    album_id: albumId,
    project_id: projectId,
    serial_number: nextSerial,
    file_name: file.name,
    mime_type: file.type || "image/jpeg",
    storage_path: storagePath,
    thumb_path: thumbPath,
    width,
    height,
    starred: false,
    estimated_date: null,
    story: null,
    people: null,
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("echo_photos").insert(row);
  if (error) throw new Error(error.message);
  return rowToPhoto(row as unknown as Record<string, unknown>);
}

export async function cloudReplacePhotoImage(input: {
  photoId: string;
  file: File;
}): Promise<Photo> {
  const existing = await cloudGetPhoto(input.photoId);
  if (!existing) throw new Error(`Photo ${input.photoId} not found`);

  const sb = supabaseAdmin();
  const { data: row, error: fetchErr } = await sb
    .from("echo_photos")
    .select("storage_path, thumb_path, project_id")
    .eq("id", input.photoId)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!row) throw new Error("שורת תמונה לא נמצאה.");
  const r = row as { storage_path: string; thumb_path: string; project_id: string };
  if (r.project_id !== existing.projectId) {
    throw new Error("התמונה אינה שייכת לפרויקט.");
  }

  const buf = Buffer.from(await input.file.arrayBuffer());
  const mime = input.file.type || "image/jpeg";

  const { error: upOrig } = await sb.storage
    .from(ECHO_PHOTOS_BUCKET)
    .upload(r.storage_path, buf, { contentType: mime, upsert: true });
  if (upOrig) throw new Error(upOrig.message);

  const { error: upThumb } = await sb.storage
    .from(ECHO_PHOTOS_BUCKET)
    .upload(r.thumb_path, buf, { contentType: "image/jpeg", upsert: true });
  if (upThumb) throw new Error(upThumb.message);

  const now = Date.now();
  const { error: upRow } = await sb
    .from("echo_photos")
    .update({
      file_name: input.file.name,
      mime_type: mime,
      updated_at: now,
    })
    .eq("id", input.photoId);
  if (upRow) throw new Error(upRow.message);

  return (await cloudGetPhoto(input.photoId))!;
}

export async function cloudUpdatePhoto(
  id: string,
  patch: Partial<Omit<Photo, "id" | "createdAt" | "blob" | "thumbnailBlob">>
): Promise<Photo> {
  const existing = await cloudGetPhoto(id);
  if (!existing) throw new Error(`Photo ${id} not found`);
  const merged = { ...existing, ...patch, updatedAt: Date.now() };
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("echo_photos")
    .update({
      serial_number: merged.serialNumber,
      file_name: merged.fileName,
      mime_type: merged.mimeType,
      width: merged.width ?? null,
      height: merged.height ?? null,
      starred: merged.starred,
      estimated_date: merged.estimatedDate ?? null,
      story: merged.story ?? null,
      people: merged.people ?? null,
      updated_at: merged.updatedAt,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return (await cloudGetPhoto(id))!;
}

export async function cloudToggleStarPhoto(id: string): Promise<Photo> {
  const existing = await cloudGetPhoto(id);
  if (!existing) throw new Error(`Photo ${id} not found`);
  return cloudUpdatePhoto(id, { starred: !existing.starred });
}

export async function cloudDeletePhoto(id: string): Promise<void> {
  const sb = supabaseAdmin();
  const { data: row } = await sb
    .from("echo_photos")
    .select("storage_path, thumb_path, album_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return;
  const r = row as { storage_path: string; thumb_path: string; album_id: string };
  const paths = [r.storage_path];
  if (r.thumb_path !== r.storage_path) paths.push(r.thumb_path);
  await storageRemovePaths(paths);
  await sb.from("echo_photos").delete().eq("id", id);

  const { data: remainingRows } = await sb
    .from("echo_photos")
    .select("id, serial_number")
    .eq("album_id", r.album_id)
    .order("serial_number");
  const remaining = (remainingRows ?? []) as { id: string; serial_number: number }[];
  for (let i = 0; i < remaining.length; i++) {
    const ph = remaining[i];
    if (ph.serial_number !== i + 1) {
      await sb
        .from("echo_photos")
        .update({ serial_number: i + 1, updated_at: Date.now() })
        .eq("id", ph.id);
    }
  }
}

export async function cloudReorderPhotos(albumId: string, orderedIds: string[]): Promise<void> {
  const offset = 100000;
  const sb = supabaseAdmin();
  for (let i = 0; i < orderedIds.length; i++) {
    const pid = orderedIds[i];
    const p = await cloudGetPhoto(pid);
    if (!p || p.albumId !== albumId) continue;
    await sb
      .from("echo_photos")
      .update({ serial_number: offset + i })
      .eq("id", pid);
  }
  for (let i = 0; i < orderedIds.length; i++) {
    const pid = orderedIds[i];
    const p = await cloudGetPhoto(pid);
    if (!p || p.albumId !== albumId) continue;
    await sb
      .from("echo_photos")
      .update({ serial_number: i + 1, updated_at: Date.now() })
      .eq("id", pid);
  }
}

/* -------------------------------------------------------------------------- */
/* stats                                                                      */
/* -------------------------------------------------------------------------- */

export async function cloudGetDashboardStats(): Promise<DashboardStats> {
  const sb = supabaseAdmin();
  const [clientsC, projects, photosMeta] = await Promise.all([
    sb.from("echo_clients").select("*", { count: "exact", head: true }),
    sb.from("echo_projects").select("*"),
    sb.from("echo_photos").select("starred"),
  ]);
  if (clientsC.error) throw new Error(clientsC.error.message);
  if (projects.error) throw new Error(projects.error.message);
  if (photosMeta.error) throw new Error(photosMeta.error.message);

  const plist = (projects.data ?? []).map((r) => rowToProject(r as Record<string, unknown>));
  const stars = (photosMeta.data ?? []) as { starred: boolean }[];
  const photosCount = stars.length;
  const starredCount = stars.filter((r) => r.starred).length;

  const byStatus = projectStatusOrder.reduce<Record<ProjectStatus, number>>(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    {} as Record<ProjectStatus, number>
  );
  for (const p of plist) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  }

  return {
    clientsCount: clientsC.count ?? 0,
    projectsCount: plist.length,
    activeProjects: plist.filter((p) => p.status !== "delivered").length,
    photosCount,
    starredCount,
    byStatus,
  };
}
