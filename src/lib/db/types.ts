/**
 * סכמת הנתונים של Echo (אבן דרך 1).
 *
 * הסכימה שומרת על תאימות עתידית עם Supabase Postgres:
 *   clients ──< projects ──< albums ──< photos
 *                              └─< (parentAlbumId) // היררכיה דו-שכבתית, V2
 */

export type ProjectStatus =
  | "intake" // איסוף
  | "scanning" // סורק
  | "editing" // בעריכה
  | "ready" // מוכן
  | "delivered"; // נמסר

export const projectStatusLabels: Record<ProjectStatus, string> = {
  intake: "איסוף",
  scanning: "סריקה",
  editing: "בעריכה",
  ready: "מוכן",
  delivered: "נמסר",
};

export const projectStatusOrder: ProjectStatus[] = [
  "intake",
  "scanning",
  "editing",
  "ready",
  "delivered",
];

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  clientId: string;
  /** קוד קצר לכניסת לקוח, למשל "COHEN-1962" */
  code: string;
  /** סיסמה (פלייין-טקסט במצב מקומי; ב-Supabase יוחלף ב-hash) */
  password: string;
  title: string;
  status: ProjectStatus;
  /** תאריך תחילת עבודה בפועל — YYYY-MM-DD (לוח שנה מקומי) */
  startDate?: string;
  /** תאריך סיום משוער — YYYY-MM-DD; יעד לצוות */
  targetEndDate?: string;
  estimatedPhotos?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Album {
  id: string;
  projectId: string;
  parentAlbumId?: string | null;
  title: string;
  description?: string;
  coverPhotoId?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Photo {
  id: string;
  albumId: string;
  projectId: string;
  /** מספר עוקב 1..N בתוך אלבום */
  serialNumber: number;
  fileName: string;
  mimeType: string;
  /** התמונה המקורית */
  blob: Blob;
  /** תמונה ממוזערת ~512px לרוחב לטעינה מהירה */
  thumbnailBlob?: Blob;
  width?: number;
  height?: number;
  starred: boolean;
  /** תאריך משוער של התמונה (מחרוזת חופשית: "1962", "קיץ 1985", "12.3.1990") */
  estimatedDate?: string;
  story?: string;
  people?: string[];
  createdAt: number;
  updatedAt: number;
}

/** דוח מצב לדשבורד */
export interface DashboardStats {
  clientsCount: number;
  projectsCount: number;
  activeProjects: number;
  photosCount: number;
  starredCount: number;
  byStatus: Record<ProjectStatus, number>;
}
