"use client";

import { useEffect } from "react";

function isDomEventLike(reason: unknown): boolean {
  if (reason instanceof Event) return true;
  return (
    typeof reason === "object" &&
    reason !== null &&
    Object.prototype.toString.call(reason) === "[object Event]"
  );
}

/**
 * תצוגות מובנות / iframe (כמו Simple Browser ב-Cursor) לעיתים מפיקות דחיות הבטחה
 * שסיבתן Event ולא Error — Next Dev Overlay מציג אז `[object Event]` בלי קשר לקוד האפליקציה.
 * ב-dev בלבד: מונעים דיווח ברירת מחדל ומדפיסים אזהרה, כדי שהלוח יישאר שמיש.
 */
export function AdminRejectionGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isDomEventLike(event.reason)) return;
      event.preventDefault();
      console.warn(
        "[Echo] נבלעה דחייה מסוג Event (לרוב תצוגה מוגבלת). לחוויה מלאה פתחי localhost ב-Chrome או Safari.",
        event.reason
      );
    };

    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  return null;
}
