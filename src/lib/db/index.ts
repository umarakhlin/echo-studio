/**
 * נקודת כניסה לשכבת הנתונים — מקומי (IndexedDB) או ענן (Supabase דרך API).
 */

export * from "./types";
export * from "./schema";

export {
  fetchPublicAlbumPage,
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
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
  listAlbumsByProject,
  getAlbum,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  ensureDefaultAlbum,
  listPhotosByAlbum,
  listPhotosByProject,
  getPhoto,
  addPhotoToAlbum,
  addPhotoToAlbumFromBlob,
  updatePhoto,
  toggleStarPhoto,
  deletePhoto,
  reorderPhotos,
  getDashboardStats,
} from "./store";

export {
  createBackupZipBlob,
  getBackupStats,
  restoreBackupFromZipBlob,
  type BackupPhotoEntry,
  type BackupStats,
  type EchoBackupManifest,
  ECHO_BACKUP_FORMAT_VERSION,
} from "./backup";
