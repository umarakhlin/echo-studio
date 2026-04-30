import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { Album, Client, Photo, Project } from "./types";

export const DB_NAME = "echo-studio";
export const DB_VERSION = 1;

export interface EchoDB extends DBSchema {
  clients: {
    key: string;
    value: Client;
    indexes: {
      "by-name": string;
      "by-createdAt": number;
    };
  };
  projects: {
    key: string;
    value: Project;
    indexes: {
      "by-clientId": string;
      "by-code": string;
      "by-status": string;
      "by-updatedAt": number;
    };
  };
  albums: {
    key: string;
    value: Album;
    indexes: {
      "by-projectId": string;
      "by-parentAlbumId": string;
    };
  };
  photos: {
    key: string;
    value: Photo;
    indexes: {
      "by-albumId": string;
      "by-projectId": string;
      "by-serial": [string, number];
    };
  };
}

let dbPromise: Promise<IDBPDatabase<EchoDB>> | null = null;

function normalizeDbOpenError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (typeof DOMException !== "undefined" && e instanceof DOMException) {
    return new Error(e.message);
  }
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === "string" && m.trim()) return new Error(m);
  }
  return new Error(
    "מסד הנתונים המקומי (IndexedDB) לא זמין בדפדפן הזה. פתחי את האתר ב-Chrome או ב-Safari — לא בתצוגה מובנית."
  );
}

/**
 * פתיחה עצלה של מסד הנתונים. מובטחת חד-פעמית בכל ה-tab.
 * נקראת רק בצד הלקוח - שגיאה אם מנסים מצד שרת.
 */
export function getDB(): Promise<IDBPDatabase<EchoDB>> {
  if (typeof window === "undefined") {
    throw new Error("getDB() can only be called on the client.");
  }

  if (!dbPromise) {
    dbPromise = openDB<EchoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("clients")) {
          const store = db.createObjectStore("clients", { keyPath: "id" });
          store.createIndex("by-name", "name");
          store.createIndex("by-createdAt", "createdAt");
        }

        if (!db.objectStoreNames.contains("projects")) {
          const store = db.createObjectStore("projects", { keyPath: "id" });
          store.createIndex("by-clientId", "clientId");
          store.createIndex("by-code", "code", { unique: true });
          store.createIndex("by-status", "status");
          store.createIndex("by-updatedAt", "updatedAt");
        }

        if (!db.objectStoreNames.contains("albums")) {
          const store = db.createObjectStore("albums", { keyPath: "id" });
          store.createIndex("by-projectId", "projectId");
          store.createIndex("by-parentAlbumId", "parentAlbumId");
        }

        if (!db.objectStoreNames.contains("photos")) {
          const store = db.createObjectStore("photos", { keyPath: "id" });
          store.createIndex("by-albumId", "albumId");
          store.createIndex("by-projectId", "projectId");
          // סטאר מסומן כבוליאני; בכמויות MVP נסנן ב-RAM.
          store.createIndex("by-serial", ["albumId", "serialNumber"], {
            unique: true,
          });
        }
      },
    }).catch((e) => {
      dbPromise = null;
      throw normalizeDbOpenError(e);
    });
  }

  return dbPromise;
}

/**
 * סוגר את החיבור ומוחק את מסד echo-studio (לשחזור מלא מגיבוי).
 * לאחר מכן קריאה ל־getDB() תיצור מסד ריק מחדש.
 */
export async function resetEchoDatabase(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("resetEchoDatabase() can only be called on the client.");
  }
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      /* empty */
    }
    dbPromise = null;
  }
  await deleteDB(DB_NAME);
}
