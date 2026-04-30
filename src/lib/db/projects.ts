import { v4 as uuid } from "uuid";

import { getDB } from "./schema";
import type { Project, ProjectStatus } from "./types";

/** קוד פרויקט קצר וזכיר: 4 תווים אלפא + 4 ספרות. */
export function generateProjectCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // ללא O/I לקריאות
  const digits = "0123456789";
  const pick = (src: string, n: number) =>
    Array.from(
      { length: n },
      () => src[Math.floor(Math.random() * src.length)]
    ).join("");
  return `${pick(letters, 4)}-${pick(digits, 4)}`;
}

/** סיסמה אקראית קצרה ידידותית (8 תווים, ללא 0/O/I/1). */
export function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(
    { length: 8 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}

export async function listProjects(): Promise<Project[]> {
  const db = await getDB();
  const all = await db.getAll("projects");
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listProjectsByClient(clientId: string): Promise<Project[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("projects", "by-clientId", clientId);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB();
  return db.get("projects", id);
}

export async function getProjectByCode(code: string): Promise<Project | undefined> {
  const db = await getDB();
  return db.getFromIndex("projects", "by-code", code.toUpperCase());
}

export async function createProject(
  input: Omit<
    Project,
    "id" | "code" | "password" | "createdAt" | "updatedAt"
  > & { code?: string; password?: string }
): Promise<Project> {
  const now = Date.now();
  const project: Project = {
    id: uuid(),
    code: (input.code ?? generateProjectCode()).toUpperCase(),
    /** הלקוחות נכנסים רק עם קוד — שדה נשמר לתאימות / עתיד, לא לחובה. */
    password: input.password ?? "",
    createdAt: now,
    updatedAt: now,
    ...input,
    title: input.title,
    status: input.status,
    clientId: input.clientId,
  };
  const db = await getDB();
  await db.put("projects", project);
  return project;
}

export async function updateProject(
  id: string,
  patch: Partial<Omit<Project, "id" | "createdAt">>
): Promise<Project> {
  const db = await getDB();
  const existing = await db.get("projects", id);
  if (!existing) throw new Error(`Project ${id} not found`);

  const updated: Project = { ...existing, ...patch, updatedAt: Date.now() };
  if (patch.code) updated.code = patch.code.toUpperCase();
  await db.put("projects", updated);
  return updated;
}

export async function setProjectStatus(
  id: string,
  status: ProjectStatus
): Promise<Project> {
  return updateProject(id, { status });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["projects", "albums", "photos"], "readwrite");
  const albums = await tx.objectStore("albums").index("by-projectId").getAllKeys(id);
  const photos = await tx.objectStore("photos").index("by-projectId").getAllKeys(id);

  await Promise.all([
    ...albums.map((key) => tx.objectStore("albums").delete(key)),
    ...photos.map((key) => tx.objectStore("photos").delete(key)),
    tx.objectStore("projects").delete(id),
  ]);
  await tx.done;
}
