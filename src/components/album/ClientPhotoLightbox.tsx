"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";

import { useBlobUrl } from "@/lib/blob-url";
import type { Photo } from "@/lib/db/types";
import { cn } from "@/lib/cn";

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
  /** מזהה תמונה פתוחה — מקור אמת יחיד */
  activePhotoId: string | null;
  onClose: () => void;
  /** ניווט: מעביר למזהה תמונה אחרת ברשימה הנוכחית */
  onActivePhotoIdChange: (id: string) => void;
}

export function ClientPhotoLightbox({
  photos,
  activePhotoId,
  onClose,
  onActivePhotoIdChange,
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
        setZoom((z) =>
          Math.min(4, Math.round((z + 0.25) * 100) / 100)
        );
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) =>
          Math.max(1, Math.round((z - 0.25) * 100) / 100)
        );
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

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.12 : 0.12;
    setZoom((z) =>
      Math.min(4, Math.max(1, Math.round((z + delta) * 100) / 100))
    );
  }, []);

  const bumpZoom = useCallback((delta: number) => {
    setZoom((z) =>
      Math.min(4, Math.max(1, Math.round((z + delta) * 100) / 100))
    );
  }, []);

  if (!open || !photo) return null;
  if (typeof document === "undefined") return null;

  const shell = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`תצוגת תמונה ${index! + 1} מתוך ${photos.length}`}
      className="fixed inset-0 z-[200] flex flex-col bg-ink/92"
    >
      {/* שורה עליונה — כותרת + סגירה */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5 text-cream sm:px-5">
        <p className="min-w-0 truncate text-sm font-medium" dir="ltr">
          #{String(photo.serialNumber).padStart(3, "0")} · {photo.fileName}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-cream/90 hover:bg-white/10"
          aria-label="סגירה"
          title="סגירה (Esc)"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-auto overscroll-contain"
        onWheel={onWheel}
      >
        <div className="flex min-h-[50vh] items-center justify-center px-3 py-4 sm:min-h-0 sm:p-6 sm:pb-32">
          {!src ? (
            <Loader2 className="h-10 w-10 animate-spin text-cream/50" />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={src}
              alt={photo.fileName}
              className={cn(
                "block h-auto max-h-[78vh] w-full max-w-[min(96vw,1400px)] object-contain select-none transition-transform duration-150 ease-out touch-pan-y sm:max-h-[min(78vh,calc(100vh-12rem))]",
                zoom > 1 && "cursor-grab"
              )}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
              }}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
          )}
        </div>
      </div>

      {/* מטא + פס כלים קבוע */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[110] flex flex-col items-center gap-2 bg-gradient-to-t from-ink from-40% via-ink/92 to-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16 sm:pt-12">
        {(photo.estimatedDate ||
          photo.story?.trim() ||
          (photo.people && photo.people.length > 0)) && (
          <div className="pointer-events-auto max-h-[28vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-ink/55 px-3 py-2 text-center text-sm text-cream/95 backdrop-blur-sm">
            {photo.estimatedDate && (
              <p className="text-cream/80">{photo.estimatedDate}</p>
            )}
            {photo.story?.trim() && (
              <p className="mt-1 leading-relaxed">{photo.story}</p>
            )}
            {photo.people && photo.people.length > 0 && (
              <p className="mt-1 text-xs text-cream/70">
                {photo.people.join(" · ")}
              </p>
            )}
          </div>
        )}

        {/* פס כלים — כיוון LTR כדי שסדר כפתורי זום יהיה יציב */}
        <div
          dir="ltr"
          className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-2 rounded-2xl border border-white/20 bg-ink/88 px-2 py-2 shadow-2xl backdrop-blur-md sm:gap-x-2 sm:px-3"
        >
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-sm text-cream/95 hover:bg-white/10 sm:px-3"
                aria-label="התמונה הקודמת באלבום"
                title="תמונה קודמת"
              >
                <ChevronLeft className="h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">הקודמת</span>
              </button>
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-sm text-cream/95 hover:bg-white/10 sm:px-3"
                aria-label="התמונה הבאה באלבום"
                title="תמונה הבאה"
              >
                <span className="hidden sm:inline">הבאה</span>
                <ChevronRight className="h-5 w-5 shrink-0" />
              </button>
              <span
                className="mx-1 hidden h-6 w-px bg-white/20 sm:block"
                aria-hidden
              />
            </>
          )}

          <button
            type="button"
            onClick={() => bumpZoom(-0.25)}
            className="rounded-xl p-2.5 text-cream/95 hover:bg-white/10"
            aria-label="הקטנת תצוגה"
            title="הקטנה"
          >
            <Minus className="h-5 w-5" />
          </button>
          <span
            className="min-w-[3.5rem] tabular-nums text-center text-xs font-medium text-cream sm:min-w-[4rem] sm:text-sm"
            aria-live="polite"
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => bumpZoom(0.25)}
            className="rounded-xl p-2.5 text-cream/95 hover:bg-white/10"
            aria-label="הגדלת תצוגה"
            title="הגדלה"
          >
            <Plus className="h-5 w-5" />
          </button>

          <span
            className="mx-1 hidden h-6 w-px bg-white/20 sm:block"
            aria-hidden
          />

          <button
            type="button"
            onClick={() => setZoom(1)}
            className="inline-flex items-center gap-1 rounded-xl px-2 py-2 text-xs text-cream/90 hover:bg-white/10 sm:text-sm"
            aria-label="איפוס זום למסך מלא"
            title="גודל התחלתי"
          >
            <RotateCcw className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">מקור</span>
          </button>

          <span
            className="mx-1 hidden h-6 w-px bg-white/20 md:block"
            aria-hidden
          />

          <span className="px-2 text-xs text-cream/55 tabular-nums" dir="ltr">
            {index! + 1}/{photos.length}
          </span>
        </div>

        <p className="pointer-events-none text-center text-[11px] text-cream/45">
          גלגלת על התמונה לזום · + / − במקלדת · 0 לאיפוס · ← → תמונות · Esc לסגירה
        </p>
      </div>
    </div>
  );

  return createPortal(shell, document.body);
}
