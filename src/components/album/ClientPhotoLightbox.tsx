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
  Wand2,
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

function isValidEnhancedImageUrl(url: string | undefined): url is string {
  if (!url) return false;
  return (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("data:image/")
  );
}

/** מנקה דפי HTML/שגיאות gateway כדי שלא יוצגו בלייטבוקס כטקסט גולמי */
function formatAiEnhanceApiError(raw: string): string {
  const t = raw.trim();
  if (!t) return "השיפור נכשל.";
  if (!/<!DOCTYPE\s+html|<html[\s>]/i.test(t)) {
    return t.length > 380 ? `${t.slice(0, 380)}…` : t;
  }
  const pre = /<pre[^>]*>([\s\S]*?)<\/pre>/i.exec(t);
  if (pre?.[1] && /cannot post/i.test(pre[1])) {
    return (
      "הבקשה נשלחה לנתיב inference שלא תומך במודל הזה (בדרך כלל קוד לא מעודכן או מודל לא נתמך). " +
      "פרקי מחדש אחרי פריסה מ-Vercel, ובדקי ש־HUGGINGFACE_API_TOKEN כולל הרשאת Inference Providers."
    );
  }
  if (pre?.[1]) {
    const inner = pre[1].trim();
    return inner.length > 220 ? `${inner.slice(0, 220)}…` : inner;
  }
  return "שגיאת שירות שיפור — נסי שוב או בדקי פריסה וטוקן Hugging Face.";
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
  const [geminiPrompt, setGeminiPrompt] = useState("");
  const [geminiEditedUrl, setGeminiEditedUrl] = useState<string | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const geminiRequestForPhotoId = useRef<string | null>(null);
  const geminiPromptInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [geminiPromptPanelOpen, setGeminiPromptPanelOpen] = useState(false);
  /** null עד לתשובת השרת — לא מציגים כפתור AI כדי למנוע שגיאה אחרי לחיצה */
  const [albumAiEnhanceConfigured, setAlbumAiEnhanceConfigured] = useState<
    boolean | null
  >(null);
  const [albumGeminiConfigured, setAlbumGeminiConfigured] = useState<
    boolean | null
  >(null);
  const [aiFeaturesDataBackend, setAiFeaturesDataBackend] = useState<
    "local" | "cloud" | null
  >(null);
  const [geminiKeyOnServer, setGeminiKeyOnServer] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/ai-features", { cache: "no-store" })
      .then((r) => r.json())
      .then(
        (j: {
          albumAiEnhance?: boolean;
          albumGeminiEdit?: boolean;
          dataBackend?: string;
          geminiKeyConfigured?: boolean;
        }) => {
          if (!cancelled) {
            setAlbumAiEnhanceConfigured(Boolean(j?.albumAiEnhance));
            setAlbumGeminiConfigured(Boolean(j?.albumGeminiEdit));
            setGeminiKeyOnServer(Boolean(j?.geminiKeyConfigured));
            const db = j?.dataBackend;
            setAiFeaturesDataBackend(
              db === "cloud" || db === "local" ? db : null
            );
          }
        }
      )
      .catch(() => {
        if (!cancelled) {
          setAlbumAiEnhanceConfigured(false);
          setAlbumGeminiConfigured(false);
          setAiFeaturesDataBackend(null);
          setGeminiKeyOnServer(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasCloudPhotoUrl = Boolean(
    photo?.displayUrl?.trim()?.startsWith("https://")
  );

  const canUseAiEnhance =
    albumAiEnhanceConfigured === true && hasCloudPhotoUrl;

  /** הרצת בקשה ל-Gemini — רק כשהמפתח מוגדר בשרת */
  const canRunGeminiEdit =
    albumGeminiConfigured === true && hasCloudPhotoUrl;

  const clientBackend = getDataBackendMode();
  const showLocalBackendHint =
    clientBackend === "local" || aiFeaturesDataBackend === "local";

  /** תיבת «עריכה לפי תיאור» — תמיד במצב ענן עם תמונת Supabase, גם לפני הגדרת מפתח */
  const showGeminiByDescriptionUi =
    hasCloudPhotoUrl &&
    clientBackend === "cloud" &&
    aiFeaturesDataBackend !== "local";

  const showMissingCloudUrlHint =
    aiFeaturesDataBackend === "cloud" &&
    !hasCloudPhotoUrl &&
    (albumAiEnhanceConfigured === true || geminiKeyOnServer);

  const displayImageSrc = geminiEditedUrl ?? aiEnhancedUrl ?? src;

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
    setGeminiEditedUrl(null);
    setGeminiLoading(false);
    setGeminiError(null);
    geminiRequestForPhotoId.current = null;
    setGeminiPrompt("");
    setGeminiPromptPanelOpen(false);
  }, [photo?.id]);

  useEffect(() => {
    if (!geminiPromptPanelOpen || !geminiPromptInputRef.current) return;
    geminiPromptInputRef.current.focus();
  }, [geminiPromptPanelOpen]);

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
      if (!res.ok || !isValidEnhancedImageUrl(enhancedUrl)) {
        let msg = text || "השיפור נכשל.";
        try {
          const j = JSON.parse(text) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* */
        }
        setAiError(formatAiEnhanceApiError(msg));
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

  const runGeminiEdit = useCallback(async () => {
    if (!photo?.id || !canRunGeminiEdit) return;
    const id = String(photo.id);
    const prompt = geminiPrompt.trim();
    if (!prompt) return;
    geminiRequestForPhotoId.current = id;
    setGeminiLoading(true);
    setGeminiError(null);
    try {
      const res = await fetch(
        `/api/public/project/${encodeURIComponent(projectCode.toUpperCase())}/gemini-edit-photo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId: id, prompt }),
        }
      );
      const text = await res.text();
      let editedUrl: string | undefined;
      if (res.ok) {
        try {
          const j = JSON.parse(text) as { editedUrl?: string };
          editedUrl = j.editedUrl;
        } catch {
          /* */
        }
      }
      if (geminiRequestForPhotoId.current !== id) return;
      if (!res.ok || !isValidEnhancedImageUrl(editedUrl)) {
        let msg = text || "העריכה נכשלה.";
        try {
          const j = JSON.parse(text) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* */
        }
        setGeminiError(
          msg.length > 420 ? `${msg.slice(0, 420)}…` : msg
        );
        return;
      }
      setGeminiEditedUrl(editedUrl);
      setGeminiPromptPanelOpen(false);
      setGeminiPrompt("");
    } catch {
      if (geminiRequestForPhotoId.current === id) {
        setGeminiError("לא הצלחנו להתחבר לשירות העריכה. נסי שוב.");
      }
    } finally {
      if (geminiRequestForPhotoId.current === id) setGeminiLoading(false);
    }
  }, [photo?.id, canRunGeminiEdit, projectCode, geminiPrompt]);

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

        {showLocalBackendHint ? (
          <p className="mb-2 rounded-lg border border-gold-400/40 bg-gold-50/90 px-3 py-2 text-center text-[11px] leading-snug text-eggplant">
            שיפור איכות ועריכת Gemini זמינים כשהאתר רץ במצב{" "}
            <strong className="font-semibold">ענן</strong> (Supabase): הגדירי
            בקובץ הסביבה <code className="rounded bg-cream-200 px-1">NEXT_PUBLIC_DATA_BACKEND=cloud</code> ואת המפתחות בשרת, והפעילי מחדש את השרת.
          </p>
        ) : null}

        {showMissingCloudUrlHint ? (
          <p className="mb-2 rounded-lg border border-eggplant/15 bg-cream-100 px-3 py-2 text-center text-[11px] leading-snug text-ink-soft">
            לתמונה הזו אין כרגע קישור תצוגה HTTPS מהענן — שיפור AI ו-Gemini עובדים
            רק על תמונות שמאוחסנות ב־Supabase.
          </p>
        ) : null}

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

          {showGeminiByDescriptionUi && (
            <>
              <span
                className="mx-0.5 hidden h-6 w-px bg-eggplant/15 sm:block"
                aria-hidden
              />
              {geminiEditedUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setGeminiEditedUrl(null);
                    setGeminiError(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-eggplant hover:bg-cream-200 sm:text-sm"
                  aria-label="חזרה לתמונה לפני עריכת Gemini"
                  title="חזרה לתמונה לפני עריכת Gemini"
                >
                  <RotateCcw className="h-4 w-4 shrink-0" />
                  <span className="max-[380px]:sr-only">ללא Gemini</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setGeminiPromptPanelOpen((v) => {
                      if (!v) setGeminiError(null);
                      return !v;
                    });
                  }}
                  disabled={geminiLoading}
                  aria-expanded={geminiPromptPanelOpen}
                  aria-controls="album-lightbox-gemini-prompt"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-eggplant hover:bg-cream-200 sm:text-sm",
                    geminiLoading && "opacity-60",
                    geminiPromptPanelOpen && "bg-cream-300/80"
                  )}
                  aria-label="עריכת תמונה לפי תיאור עם Gemini"
                  title={
                    geminiPromptPanelOpen
                      ? "סגירת שדה התיאור (לחיצה נוספת)"
                      : "פתיחת שדה לכתיבת מה לשנות בתמונה"
                  }
                >
                  {geminiLoading ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 shrink-0 text-eggplant" />
                  )}
                  <span className="max-[380px]:sr-only">עריכה לפי תיאור</span>
                </button>
              )}
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

        {showGeminiByDescriptionUi &&
        geminiPromptPanelOpen &&
        !geminiEditedUrl ? (
          <div
            className="mt-2 rounded-xl border border-eggplant/10 bg-cream-100/90 px-3 py-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <label
              htmlFor="album-lightbox-gemini-prompt"
              className="mb-1.5 block text-center text-[11px] font-medium text-eggplant/85"
            >
              מה לשנות בתמונה? — לחצי Enter לשליחה
            </label>
            <textarea
              ref={geminiPromptInputRef}
              id="album-lightbox-gemini-prompt"
              dir="auto"
              rows={3}
              value={geminiPrompt}
              onChange={(e) => setGeminiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (e.shiftKey) return;
                e.preventDefault();
                if (!geminiLoading && canRunGeminiEdit && geminiPrompt.trim()) {
                  void runGeminiEdit();
                }
              }}
              placeholder="למשל: הוסיפי לתינוק כנפי דרקון שחורות…"
              className="w-full resize-y rounded-lg border border-eggplant/15 bg-cream px-2.5 py-2 text-sm text-eggplant placeholder:text-ink-muted/70 focus:border-eggplant/35 focus:outline-none focus:ring-2 focus:ring-gold-400/40"
            />
            <p className="mt-1.5 text-center text-[10px] text-ink-muted">
              Enter — שליחה · Shift+Enter — שורה חדשה
            </p>
            {albumGeminiConfigured === false ? (
              <p className="mt-2 text-center text-[11px] leading-snug text-ink-muted">
                כדי להפעיל: הוסיפי לשרת את{" "}
                <code className="rounded bg-cream-200 px-1">GEMINI_API_KEY</code>{" "}
                והפעילי מחדש את האתר (זה נפרד משיפור האיכות).
              </p>
            ) : null}
          </div>
        ) : null}

        {geminiError ? (
          <div
            className="mt-2 text-center text-[11px] leading-snug text-red-600"
            role="alert"
          >
            {geminiError}
          </div>
        ) : null}

        {aiError ? (
          <div
            className="mt-2 space-y-1.5 text-center text-[11px] leading-snug text-red-600"
            role="alert"
          >
            <p>{aiError}</p>
            {aiError.includes("אין מספיק יתרה") ? (
              <p>
                <a
                  href="https://replicate.com/account/billing#billing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-eggplant underline underline-offset-2 hover:text-eggplant/90"
                >
                  לפתיחת דף החיוב ב-Replicate
                </a>
              </p>
            ) : null}
            {aiError.includes("מגבלת השימוש ב-Hugging Face") ? (
              <p>
                <a
                  href="https://huggingface.co/settings/billing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-eggplant underline underline-offset-2 hover:text-eggplant/90"
                >
                  לפתיחת החיוב ב-Hugging Face
                </a>
              </p>
            ) : null}
          </div>
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
          · ← → לניווט · Esc לסגירה
          {albumAiEnhanceConfigured === true
            ? " · שיפור AI בפס הכלים (עד כדקה)"
            : ""}
          {showGeminiByDescriptionUi
            ? " · עריכה לפי תיאור: כפתור השרביט → כתיבה → Enter (דורש GEMINI_API_KEY בשרת)"
            : ""}
        </p>
      </footer>
    </div>
  );

  return createPortal(shell, document.body);
}
