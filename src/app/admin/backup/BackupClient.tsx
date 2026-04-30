"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, HardDrive, Info, Upload } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { getDataBackendMode } from "@/lib/data-backend";
import {
  createBackupZipBlob,
  getBackupStats,
  restoreBackupFromZipBlob,
  type BackupStats,
} from "@/lib/db";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} בס״ב`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} ק״ב`;
  return `${(n / (1024 * 1024)).toFixed(2)} מ״ב`;
}

export function BackupClient() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCloud = getDataBackendMode() === "cloud";
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (isCloud) {
      setLoadingStats(false);
      setStats(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const s = await getBackupStats();
        if (!cancelled) setStats(s);
      } catch (e) {
        console.error(e);
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCloud]);

  async function downloadBackup() {
    try {
      setExporting(true);
      const blob = await createBackupZipBlob();
      const url = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
      const a = document.createElement("a");
      a.href = url;
      a.download = `echo-gibui-${stamp}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("קובץ הגיבוי הורד. שמרי אותו במקום בטוח.");
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "יצירת הגיבוי נכשלה — נסי שוב."
      );
    } finally {
      setExporting(false);
    }
  }

  function openRestorePicker() {
    const ok = window.confirm(
      "שחזור מקובץ ZIP ימחק את כל הנתונים בדפדפן הזה (לקוחות, פרויקטים, תמונות) ויחליף אותם בתוכן הגיבוי.\n\nלהמשיך?"
    );
    if (ok) fileInputRef.current?.click();
  }

  async function onRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("בחרי קובץ .zip של גיבוי Echo.");
      return;
    }
    try {
      setRestoring(true);
      await restoreBackupFromZipBlob(file);
      toast.success("השחזור הושלם. הדף ייטען מחדש.");
      window.setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "שחזור נכשל — בדקי שהקובץ תקין."
      );
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <div className="mb-2 flex items-center gap-2 text-eggplant">
          <HardDrive className="h-6 w-6" />
          <h1 className="font-display text-3xl font-semibold">גיבוי הסטודיו</h1>
        </div>
        <p className="text-sm text-ink-muted leading-relaxed">
          {isCloud ? (
            <>
              במצב <strong className="text-ink-soft">ענן</strong> הנתונים נשמרים
              ב־Supabase. גיבוי ZIP מהדפדפן אינו זמין — השתמשי בגיבוי/ייצוא של
              Supabase (Dashboard → Database / Storage) לפי מדיניות הארגון.
            </>
          ) : (
            <>
              כל הלקוחות, הפרויקטים, האלבומים והתמונות נשמרים{" "}
              <strong className="text-ink-soft">רק במחשב ובדפדפן הזה</strong>{" "}
              (מסד מקומי). גיבוי קבוע מגן עליך לפני עדכון macOS, מעבר דפדפן, או
              ניקוי נתונים.
            </>
          )}
        </p>
      </header>

      {!isCloud && (
        <div className="card space-y-3 p-5">
          <div className="flex gap-2 text-sm text-ink-soft">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
            <p>
              הקובץ הוא <span className="font-mono text-xs">.zip</span> עם{" "}
              <span className="font-mono text-xs">manifest.json</span> ותיקיית{" "}
              <span className="font-mono text-xs">blobs/</span> לתמונות. אפשר{" "}
              <strong>לשחזר מהממשק</strong> מאותו פורמט — השחזור מחליף את כל מה
              שיש כרגע בדפדפן.
            </p>
          </div>

          <div className="flex gap-2 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              אלבום ללקוח בקישור עובד <strong>רק באותו דפדפן</strong> שבו הוזנו
              הנתונים — במצב מקומי. הגיבוי חשוב גם ככה.
            </p>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-display text-lg font-semibold text-eggplant">
          מצב נוכחי במסד
        </h2>
        {isCloud ? (
          <p className="mt-3 text-sm text-ink-soft leading-relaxed">
            הסטטיסטיקות והורדת ZIP זמינות רק במצב מקומי. במצב ענן בדקי את לוח
            הבקרה של Supabase.
          </p>
        ) : loadingStats ? (
          <p className="mt-3 text-sm text-ink-muted">טוען…</p>
        ) : stats ? (
          <ul className="mt-3 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
            <li>
              לקוחות: <strong className="text-ink">{stats.clients}</strong>
            </li>
            <li>
              פרויקטים: <strong className="text-ink">{stats.projects}</strong>
            </li>
            <li>
              אלבומים: <strong className="text-ink">{stats.albums}</strong>
            </li>
            <li>
              תמונות: <strong className="text-ink">{stats.photos}</strong>
            </li>
            <li className="sm:col-span-2">
              הערכת גודל גלם:{" "}
              <strong className="text-ink">{formatBytes(stats.approxBytes)}</strong>{" "}
              (בערך, לפני דחיסה)
            </li>
          </ul>
        ) : (
          <p className="mt-3 text-sm text-red-600">
            לא ניתן לקרוא את המסד — רענני את הדף או פתחי בכרום/ספארי.
          </p>
        )}

        {!isCloud && (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              loading={exporting}
              onClick={downloadBackup}
              startIcon={<Download className="h-4 w-4" />}
              disabled={loadingStats || !stats || restoring}
            >
              הורדת קובץ גיבוי (ZIP)
            </Button>
            <Button
              type="button"
              variant="secondary"
              loading={restoring}
              onClick={openRestorePicker}
              startIcon={<Upload className="h-4 w-4" />}
              disabled={loadingStats || exporting}
            >
              שחזור מקובץ ZIP…
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={onRestoreFile}
            />
          </div>
        )}
      </div>
    </div>
  );
}
