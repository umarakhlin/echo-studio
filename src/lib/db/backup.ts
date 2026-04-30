import JSZip from "jszip";

import { getDataBackendMode } from "@/lib/data-backend";

import { getDB, resetEchoDatabase } from "./schema";
import type { Album, Client, Photo, Project } from "./types";

export const ECHO_BACKUP_FORMAT_VERSION = 1;

/** מטא־דאטה של תמונה בקובץ הגיבוי (ללא Blob בתוך ה־JSON) */
export interface BackupPhotoEntry {
  id: string;
  albumId: string;
  projectId: string;
  serialNumber: number;
  fileName: string;
  mimeType: string;
  width?: number;
  height?: number;
  starred: boolean;
  estimatedDate?: string;
  story?: string;
  people?: string[];
  createdAt: number;
  updatedAt: number;
  /** נתיב בתוך ה־ZIP לקובץ הבינארי */
  blobPath: string;
  thumbnailPath?: string;
}

export interface EchoBackupManifest {
  formatVersion: number;
  exportedAt: string;
  appId: "echo-studio";
  clients: Client[];
  projects: Project[];
  albums: Album[];
  photos: BackupPhotoEntry[];
}

export interface BackupStats {
  clients: number;
  projects: number;
  albums: number;
  photos: number;
  approxBytes: number;
}

function mimeToFileSuffix(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("png")) return ".png";
  if (m.includes("webp")) return ".webp";
  if (m.includes("gif")) return ".gif";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  return ".bin";
}

function assertLocalZipBackup(): void {
  if (getDataBackendMode() === "cloud") {
    throw new Error(
      "גיבוי ZIP מקומי לא זמין במצב ענן — הנתונים ב־Supabase. השתמשי בגיבוי/ייצוא של Supabase או במסמכי הענן שלכם."
    );
  }
}

function isEchoBackupManifest(v: unknown): v is EchoBackupManifest {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  return (
    m.formatVersion === ECHO_BACKUP_FORMAT_VERSION &&
    m.appId === "echo-studio" &&
    Array.isArray(m.clients) &&
    Array.isArray(m.projects) &&
    Array.isArray(m.albums) &&
    Array.isArray(m.photos)
  );
}

function backupEntryToPhoto(
  entry: BackupPhotoEntry,
  blob: Blob,
  thumbnailBlob?: Blob
): Photo {
  return {
    id: entry.id,
    albumId: entry.albumId,
    projectId: entry.projectId,
    serialNumber: entry.serialNumber,
    fileName: entry.fileName,
    mimeType: entry.mimeType,
    blob,
    thumbnailBlob,
    width: entry.width,
    height: entry.height,
    starred: entry.starred,
    estimatedDate: entry.estimatedDate,
    story: entry.story,
    people: entry.people,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function photoToEntry(p: Photo, blobPath: string, thumbnailPath?: string): BackupPhotoEntry {
  return {
    id: p.id,
    albumId: p.albumId,
    projectId: p.projectId,
    serialNumber: p.serialNumber,
    fileName: p.fileName,
    mimeType: p.mimeType,
    width: p.width,
    height: p.height,
    starred: p.starred,
    estimatedDate: p.estimatedDate,
    story: p.story,
    people: p.people,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    blobPath,
    thumbnailPath,
  };
}

/**
 * יוצר קובץ ZIP עם manifest.json + קבצי תמונות.
 * מיועד ל־גיבוי ידני מהסטודיו (IndexedDB מקומי).
 */
export async function createBackupZipBlob(): Promise<Blob> {
  assertLocalZipBackup();
  const db = await getDB();
  const [clients, projects, albums, photos] = await Promise.all([
    db.getAll("clients"),
    db.getAll("projects"),
    db.getAll("albums"),
    db.getAll("photos"),
  ]);

  const zip = new JSZip();
  const photoEntries: BackupPhotoEntry[] = [];

  for (const p of photos) {
    const suffix = mimeToFileSuffix(p.mimeType);
    const blobPath = `blobs/photos/${p.id}${suffix}`;
    zip.file(blobPath, await p.blob.arrayBuffer());

    let thumbnailPath: string | undefined;
    if (p.thumbnailBlob && p.thumbnailBlob.size > 0) {
      thumbnailPath = `blobs/thumbnails/${p.id}.jpg`;
      zip.file(thumbnailPath, await p.thumbnailBlob.arrayBuffer());
    }

    photoEntries.push(photoToEntry(p, blobPath, thumbnailPath));
  }

  const manifest: EchoBackupManifest = {
    formatVersion: ECHO_BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appId: "echo-studio",
    clients,
    projects,
    albums,
    photos: photoEntries,
  };

  zip.file(
    "manifest.json",
    JSON.stringify(manifest, null, 2),
    { compression: "DEFLATE" }
  );

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

/**
 * ממלא מחדש את IndexedDB מתוך קובץ ZIP שחוזר מ־createBackupZipBlob.
 * מוחק את כל הנתונים הקיימים באותו דפדפן לפני הכתיבה.
 */
export async function restoreBackupFromZipBlob(zipBlob: Blob): Promise<void> {
  assertLocalZipBackup();
  const zip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
  const manifestNode = zip.file("manifest.json");
  if (!manifestNode) {
    throw new Error('בקובץ אין manifest.json — וודאי שזה גיבוי Echo (.zip מהסטודיו).');
  }
  const raw = JSON.parse(await manifestNode.async("string")) as unknown;
  if (!isEchoBackupManifest(raw)) {
    throw new Error("פורמט גיבוי לא נתמך או קובץ פגום.");
  }
  const manifest = raw;
  const clients = manifest.clients as Client[];
  const projects = manifest.projects as Project[];
  const albums = manifest.albums as Album[];

  const photos: Photo[] = [];
  for (const entry of manifest.photos) {
    const path = entry.blobPath.replace(/^\//, "");
    const zf = zip.file(path);
    if (!zf) {
      throw new Error(`בגיבוי חסר קובץ תמונה: ${entry.blobPath}`);
    }
    const rawBuf = await zf.async("arraybuffer");
    const blob = new Blob([rawBuf], { type: entry.mimeType });
    let thumbnailBlob: Blob | undefined;
    if (entry.thumbnailPath) {
      const tp = entry.thumbnailPath.replace(/^\//, "");
      const tz = zip.file(tp);
      if (tz) {
        const tbuf = await tz.async("arraybuffer");
        thumbnailBlob = new Blob([tbuf], { type: "image/jpeg" });
      }
    }
    photos.push(backupEntryToPhoto(entry, blob, thumbnailBlob));
  }

  await resetEchoDatabase();
  const db = await getDB();
  const tx = db.transaction(["clients", "projects", "albums", "photos"], "readwrite");

  for (const c of clients) tx.objectStore("clients").put(c);
  for (const p of projects) tx.objectStore("projects").put(p);
  for (const a of albums) tx.objectStore("albums").put(a);
  for (const ph of photos) tx.objectStore("photos").put(ph);

  await tx.done;
}

export async function getBackupStats(): Promise<BackupStats> {
  assertLocalZipBackup();
  const db = await getDB();
  const [clients, projects, albums, photos] = await Promise.all([
    db.getAll("clients"),
    db.getAll("projects"),
    db.getAll("albums"),
    db.getAll("photos"),
  ]);

  let approxBytes = 0;
  for (const p of photos) {
    approxBytes += p.blob.size;
    approxBytes += p.thumbnailBlob?.size ?? 0;
  }
  approxBytes += JSON.stringify({ clients, projects, albums, photos: photos.map((x) => x.id) }).length * 2;

  return {
    clients: clients.length,
    projects: projects.length,
    albums: albums.length,
    photos: photos.length,
    approxBytes,
  };
}
