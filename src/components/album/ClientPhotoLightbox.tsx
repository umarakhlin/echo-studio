"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Star,
  X,
} from "lucide-react";

import { albumDisplayNameStorageKey } from "@/lib/album-client-labels";
import { useBlobUrl } from "@/lib/blob-url";
import type { Photo } from "@/lib/db/types";
import { cn } from "@/lib/cn";
import { getDataBackendMode } from "@/lib/data-backend";

/** זום בתצוגת לקוח — מתחת ל-100% כדי לראות את כל התמונה בתוך המסך. */
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
}

function pickFullImageUrl(
  photo: Photo,
  fallbackBlobUrl: string | null
): string | null {
  if (photo.displayUrl?.trim()) return photo.displayUrl;
  if (photo.thumbnailDisplayUrl?.trim()) return photo.thumbnailDisplayUrl;
  return fallbackBlobUrl;
}

function pickPreviewBlob(photo: Photo | null): Blob | null {
  if (!photo) return null;
  const full = photo.blob;
  if (full instanceof Blob && full.size > 0) return full;
  const thumb = photo.thumbnailBlob;
  if (thumb instanceof Blob && thumb.size > 0) return thumb;
  return null;
}

interface Props {
  photos: Photo[];
  activePhotoId: string | null;
  projectCode: string;
  onClose: () => void;
  onActivePhotoIdChange: (id: string) => void;
  showCustomLabels: boolean;
  onShowCustomLabelsChange: (value: boolean) => void;
  onToggleStar: (photoId: string) => void | Promise<void>;
  onDisplayLabelSaved?: () => void;
}

export function ClientPhotoLightbox({
  photos,
  activePhotoId,
  projectCode,
  onClose,
  onActivePhotoIdChange,
  showCustomLabels,
  onShowCustomLabelsChange,
  onToggleStar,
  onDisplayLabelSaved,
}: Props) {
  const index = useMemo(() => {
    if (!activePhotoId) return null;
    const id = String(activePhotoId);
    const i = photos.findIndex((p) => String(p.id) === id);
    return i >= 0 ? i : null;
  }, [activePhotoId, photos]);

  const open = index !== null;
  const photo = open ? photos[index!] : null;
  const previewBlob = useMemo(() => pickPreviewBlob(photo), [photo]);
  const blobSrc = useBlobUrl(previewBlob);
  const src = photo ? pickFullImageUrl(photo, blobSrc) : null;

  const [zoom, setZoom] = useState(1);
  const [displayLabel, setDisplayLabel] = useState("");
  const [aiEnhancedUrl, setAiEnhancedUrl] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiRequestForPhotoId = useRef<string | null>(null);

  const canUseAiEnhance =
    getDataBackendMode() === "cloud" &&
    Boolean(photo?.displayUrl?.trim()?.startsWith("https://"));

  const displayImageSrc = aiEnhancedUrl ?? src;

  useEffect(() => {
    if (!photo?.id || typeof window === "undefined") {
      setDisplayLabel("");
      return;
    }
    setDisplayLabel(
      localStorage.getItem(albumDisplayNameStorageKey(String(photo.id))) ?? ""
    );
  }, [photo?.id]);

  useEffect(() => {
    setAiEnhancedUrl(null);
    setAiLoading(false);
    setAiError(null);
    aiRequestForPhotoId.current = null;
  }, [photo?.id]);

  const persistDisplayLabel = useCallback(
    (raw: string) => {
      if (!photo?.id || typeof window === "undefined") return;
      const t = raw.trim();
      const key = albumDisplayNameStorageKey(String(photo.id));
      if (t) localStorage.setItem(key, t);
      else localStorage.removeItem(key);
      setDisplayLabel(t);
      onDisplayLabelSaved?.();
    },
    [photo?.id, onDisplayLabelSaved]
  );

  const goPrev = useCallback(() => {
    if (index === null || photos.length < 2) return;
    const nextIdx = index <= 0 ? photos.length - 1 : index - 1;
    onActivePhotoIdChange(String(photos[nextIdx].id));
  }, [index, photos, onActivePhotoIdChange]);

  const goNext = useCallback(() => {
    if (index === null || photos.length < 2) return;
    const nextIdx = index >= photos.length - 1 ? 0 : index + 1;
    onActivePhotoIdChange(String(photos[nextIdx].id));
  }, [index, photos, onActivePhotoIdChange]);

  useEffect(() => {
    if (!open) return;
    setZoom(1);
  }, [open, photo?.id]);

  useEffect(() => {
    if (!open) return;
    const rtl =
      typeof document !== "undefined" &&
      document.documentElement.getAttribute("dir") === "rtl";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") rtl ? goPrev() : goNext();
      if (e.key === "ArrowLeft") rtl ? goNext() : goPrev();
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => clampZoom(z + ZOOM_STEP));
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) => clampZoom(z - ZOOM_STEP));
      }
      if (e.key === "0") {
        e.preventDefault();
        setZoom(1);
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, goPrev, goNext, onClose]);

  const bumpZoom = useCallback((delta: number) => {
    setZoom((z) => clampZoom(z + delta));
  }, []);

  const runAiEnhance = useCallback(async () => {
    if (!photo?.id || !canUseAiEnhance) return;
    const id = String(photo.id);
    aiRequestForPhotoId.current = id;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch(
        `/api/public/project/${encodeURIComponent(projectCode.toUpperCase())}/enhance-photo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId: id }),
        }
      );
      const text = await res.text();
      let enhancedUrl: string | undefined;
      if (res.ok) {
        try {
          const j = JSON.parse(text) as { enhancedUrl?: string };
          enhancedUrl = j.enhancedUrl;
        } catch {
          /* */
        }
      }
      if (aiRequestForPhotoId.current !== id) return;
      if (!res.ok || !enhancedUrl?.startsWith("http")) {
        let msg = text || "השיפור נכשל.";
        try {
          const j = JSON.parse(text) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* */
        }
        setAiError(msg);
        return;
      }
      setAiEnhancedUrl(enhancedUrl);
    } catch {
      if (aiRequestForPhotoId.current === id) {
        setAiError("לא הצלחנו להתחבר לשירות השיפור. נסי שוב.");
      }
    } finally {
      if (aiRequestForPhotoId.current === id) setAiLoading(false);
    }
  }, [photo?.id, canUseAiEnhance, projectCode]);

  if (!open || !photo) return null;
  if (typeof document === "undefined") return null;

  const shell = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`תצוגת תמונה ${index! + 1} מתוך ${photos.length}`}
      aria-describedby="album-lightbox-toolbar-hint"
      className="fixed inset-0 z-[200] flex max-h-[100dvh] flex-col bg-cream text-ink"
    >
      {/* פס עליון — חלבי מלא, בלי שכבת fade על התמונה */}
      <header
        className="flex shrink-0 flex-col gap-2 border-b border-eggplant/12 bg-cream-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-[11px] text-ink-muted">
            #{String(photo.serialNumber).padStart(3, "0")}
            <span className="mx-1 text-eggplant/40">·</span>
            <span dir="ltr" className="font-mono text-[11px] text-ink-soft">
              {photo.fileName}
            </span>
          </p>
          {showCustomLabels && displayLabel.trim() ? (
            <p className="truncate text-sm font-medium text-eggplant" dir="auto">
              {displayLabel.trim()}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 self-end rounded-lg p-2 text-eggplant hover:bg-cream-300 sm:self-center"
          aria-label="סגירה"
          title="סגירה (Esc)"
        >
          <X className="h-6 w-6" />
        </button>
      </header>

      {/* אזור תמונה: לחיצה על הרקע החלבי סוגרת */}
      <div
        className="min-h-0 flex-1 overflow-auto overscroll-contain bg-cream-100"
        onClick={onClose}
      >
        <div className="pointer-events-none flex min-h-full items-center justify-center p-4 sm:p-6">
          <div className="pointer-events-auto max-h-full max-w-full">
            {!displayImageSrc ? (
              <Loader2 className="h-10 w-10 animate-spin text-eggplant/35" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={displayImageSrc}
                alt={
                  showCustomLabels && displayLabel.trim()
                    ? displayLabel.trim()
                    : photo.fileName
                }
                className={cn(
                  "block max-h-[calc(100dvh-12.5rem)] max-w-[min(100vw-2rem,1400px)] object-contain select-none sm:max-h-[calc(100vh-13rem)]"
                )}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                }}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      </div>

      {/* פס תחתון — חלבי מלא, ללא גרדיאנט מעל התמונה */}
      <footer
        className="shrink-0 border-t border-eggplant/12 bg-cream-200 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pb-3 sm:pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        {(photo.estimatedDate ||
          photo.story?.trim() ||
          (photo.people && photo.people.length > 0)) && (
          <div className="mb-2 max-h-[22vh] w-full overflow-y-auto rounded-lg border border-eggplant/10 bg-cream-100/90 px-3 py-2 text-center text-sm text-ink-soft">
            {photo.estimatedDate && (
              <p className="text-ink-muted">{photo.estimatedDate}</p>
            )}
            {photo.story?.trim() && (
              <p className="mt-1 leading-relaxed text-ink">{photo.story}</p>
            )}
            {photo.people && photo.people.length > 0 && (
              <p className="mt-1 text-xs text-ink-muted">
                {photo.people.join(" · ")}
              </p>
            )}
          </div>
        )}

        <p
          id="album-lightbox-toolbar-hint"
          className="mb-1.5 text-center text-[11px] font-medium text-eggplant/80"
        >
          פס כלים · לחיצה מחוץ לתמונה — חזרה לגלריה
        </p>

        <div
          dir="ltr"
          className="flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-2 rounded-xl border border-eggplant/12 bg-cream-100 px-2 py-2 sm:gap-x-2 sm:px-3"
        >
          <button
            type="button"
            onClick={() => void onToggleStar(String(photo.id))}
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-eggplant hover:bg-cream-200",
              photo.starred && "text-gold-600"
            )}
            aria-label={photo.starred ? "הסרת כוכב" : "סימון בכוכב"}
            aria-pressed={photo.starred}
            title={photo.starred ? "הסרת כוכב" : "סימון בכוכב"}
          >
            <Star
              className={cn("h-5 w-5", photo.starred && "fill-current")}
            />
          </button>

          {canUseAiEnhance && (
            <>
              <span
                className="mx-0.5 hidden h-6 w-px bg-eggplant/15 sm:block"
                aria-hidden
              />
              {aiEnhancedUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setAiEnhancedUrl(null);
                    setAiError(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-eggplant hover:bg-cream-200 sm:text-sm"
                  aria-label="חזרה לתמונת המקור מהסטודיו"
                  title="חזרה לתמונת המקור מהסטודיו"
                >
                  <RotateCcw className="h-4 w-4 shrink-0" />
                  <span className="max-[380px]:sr-only">ללא שיפור</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void runAiEnhance()}
                  disabled={aiLoading}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-eggplant hover:bg-cream-200 sm:text-sm",
                    aiLoading && "opacity-60"
                  )}
                  aria-label="שיפור איכות תמונה עם AI"
                  title="שיפור איכות (AI) — עלול לקחת כ־דקה"
                >
                  {aiLoading ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 shrink-0 text-gold-600" />
                  )}
                  <span className="max-[380px]:sr-only">שיפור AI</span>
                </button>
              )}
              {photos.length < 2 ? (
                <span
                  className="mx-0.5 hidden h-6 w-px bg-eggplant/15 sm:block"
                  aria-hidden
                />
              ) : null}
            </>
          )}

          {photos.length > 1 && (
            <span
              className="mx-0.5 hidden h-6 w-px bg-eggplant/15 sm:block"
              aria-hidden
            />
          )}

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm text-eggplant hover:bg-cream-200 sm:px-3"
                aria-label="התמונה הקודמת באלבום"
              >
                <ChevronLeft className="h-5 w-5 shrink-0" />
                <span className="hidden min-[420px]:inline sm:inline">
                  הקודמת
                </span>
              </button>
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm text-eggplant hover:bg-cream-200 sm:px-3"
                aria-label="התמונה הבאה באלבום"
              >
                <span className="hidden min-[420px]:inline sm:inline">
                  הבאה
                </span>
                <ChevronRight className="h-5 w-5 shrink-0" />
              </button>
              <span
                className="mx-1 hidden h-6 w-px bg-eggplant/15 sm:block"
                aria-hidden
              />
            </>
          )}

          <button
            type="button"
            onClick={() => bumpZoom(-0.25)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-eggplant hover:bg-cream-200 sm:px-2.5"
            aria-label="הקטנת תצוגה"
          >
            <Minus className="h-5 w-5 shrink-0" />
            <span className="text-[11px] font-medium sm:text-xs">קטן</span>
          </button>
          <span className="min-w-[3.5rem] tabular-nums text-center text-xs font-semibold text-eggplant sm:min-w-[4rem] sm:text-sm">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => bumpZoom(0.25)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-eggplant hover:bg-cream-200 sm:px-2.5"
            aria-label="הגדלת תצוגה"
          >
            <span className="text-[11px] font-medium sm:text-xs">גדול</span>
            <Plus className="h-5 w-5 shrink-0" />
          </button>

          <span
            className="mx-1 hidden h-6 w-px bg-eggplant/15 sm:block"
            aria-hidden
          />

          <button
            type="button"
            onClick={() => setZoom(1)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-eggplant hover:bg-cream-200 sm:text-sm"
            aria-label="איפוס זום"
          >
            <RotateCcw className="h-4 w-4 shrink-0" />
            <span className="text-[11px] sm:text-sm">מקור</span>
          </button>

          <span
            className="mx-1 hidden h-6 w-px bg-eggplant/15 md:block"
            aria-hidden
          />

          <span className="px-2 text-xs tabular-nums text-ink-muted" dir="ltr">
            {index! + 1}/{photos.length}
          </span>
        </div>

        {aiError ? (
          <p
            className="mt-2 text-center text-[11px] leading-snug text-red-600"
            role="alert"
          >
            {aiError}
          </p>
        ) : null}

        <div
          className="mt-3 space-y-2 rounded-xl border border-eggplant/10 bg-cream-100/80 px-3 py-2.5 text-right"
          onClick={(e) => e.stopPropagation()}
        >
          <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-soft">
            <span className="min-w-0 flex-1 leading-snug">
              להציג בגלריה ובחלון את השם שמילאתי למטה
            </span>
            <input
              type="checkbox"
              checked={showCustomLabels}
              onChange={(e) => onShowCustomLabelsChange(e.target.checked)}
              className="h-3.5 w-3.5 shrink-0 rounded border-eggplant/25 text-eggplant focus:ring-gold-400/50"
            />
          </label>
          <div>
            <label className="sr-only" htmlFor="album-lightbox-display-name">
              כינוי לתמונה (נשמר במכשיר)
            </label>
            <input
              id="album-lightbox-display-name"
              type="text"
              value={displayLabel}
              onChange={(e) => setDisplayLabel(e.target.value)}
              onBlur={() => persistDisplayLabel(displayLabel)}
              placeholder="כינוי לתמונה (רק במכשיר הזה)"
              dir="auto"
              className="w-full rounded-lg border border-eggplant/15 bg-cream px-2.5 py-1.5 text-sm text-eggplant placeholder:text-ink-muted/70 focus:border-eggplant/35 focus:outline-none focus:ring-2 focus:ring-gold-400/40"
            />
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-ink-muted">
          זום: כפתורים / מקשי +/−/0 (איפוס ל־100%) / מגע — בין 25% ל־400%, בלי גלגלת עכבר
          · ← → לניווט · Esc לסגירה · במצב ענן: שיפור AI בפס הכלים (ייתכן עיכוב של
          עד כדקה)
        </p>
      </footer>
    </div>
  );

  return createPortal(shell, document.body);
}
