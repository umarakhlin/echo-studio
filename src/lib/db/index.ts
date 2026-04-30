/**
 * נקודת כניסה אחת לשכבת הנתונים של Echo.
 * מאחורי הקלעים: IndexedDB (בעזרת idb).
 *
 * החלפה ל-Supabase בעתיד תיעשה ב-`src/lib/db/*` בלבד -
 * הקריאות מהקומפוננטות נשארות זהות.
 */

export * from "./types";
export * from "./schema";

export {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
} from "./clients";

export {
  listProjects,
  listProjectsByClient,
  getProject,
  getProjectByCode,
  createProject,
  updateProject,
  setProjectStatus,
  deleteProject,
  generateProjectCode,
  generatePassword,
} from "./projects";

export {
  listAlbumsByProject,
  getAlbum,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  ensureDefaultAlbum,
} from "./albums";

export {
  listPhotosByAlbum,
  listPhotosByProject,
  getPhoto,
  addPhotoToAlbum,
  addPhotoToAlbumFromBlob,
  updatePhoto,
  toggleStarPhoto,
  deletePhoto,
  reorderPhotos,
} from "./photos";

export { getDashboardStats } from "./stats";

export {
  createBackupZipBlob,
  getBackupStats,
  restoreBackupFromZipBlob,
  type BackupPhotoEntry,
  type BackupStats,
  type EchoBackupManifest,
  ECHO_BACKUP_FORMAT_VERSION,
} from "./backup";
