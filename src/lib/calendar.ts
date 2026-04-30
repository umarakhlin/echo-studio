import type { ProjectStatus } from "./db/types";

/**
 * ערכי תאריך ל־<input type="date"> ולתצוגה בעברית (שעון מקומי).
 */

export function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** תצוגה קצרה בעברית; מחזיר null אם אין ערך תקין */
export function formatISODateHe(iso: string | undefined | null): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** יעד סיום חלף (לצורך הדגשה בממשק) */
export function isProjectTargetOverdue(
  targetEndDate: string | undefined,
  status: ProjectStatus
): boolean {
  if (!targetEndDate || status === "delivered") return false;
  return targetEndDate < todayLocalISODate();
}
