import { v4 as uuid } from "uuid";

import { getDB } from "./schema";
import type { Client } from "./types";

export async function listClients(): Promise<Client[]> {
  const db = await getDB();
  const all = await db.getAll("clients");
  return all.sort((a, b) => a.name.localeCompare(b.name, "he"));
}

export async function getClient(id: string): Promise<Client | undefined> {
  const db = await getDB();
  return db.get("clients", id);
}

export async function createClient(
  input: Omit<Client, "id" | "createdAt" | "updatedAt">
): Promise<Client> {
  const now = Date.now();
  const client: Client = {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  const db = await getDB();
  await db.put("clients", client);
  return client;
}

export async function updateClient(
  id: string,
  patch: Partial<Omit<Client, "id" | "createdAt">>
): Promise<Client> {
  const db = await getDB();
  const existing = await db.get("clients", id);
  if (!existing) throw new Error(`Client ${id} not found`);

  const updated: Client = { ...existing, ...patch, updatedAt: Date.now() };
  await db.put("clients", updated);
  return updated;
}

export async function deleteClient(id: string): Promise<void> {
  const db = await getDB();
  // בודקים שאין פרויקטים פתוחים תחת לקוח זה
  const projects = await db.getAllFromIndex("projects", "by-clientId", id);
  if (projects.length > 0) {
    throw new Error(
      `לא ניתן למחוק את הלקוח - יש לו ${projects.length} פרויקט/ים פעילים. מחקו אותם קודם.`
    );
  }
  await db.delete("clients", id);
}
