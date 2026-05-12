"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ImagePlus,
  Loader2,
  Move,
  RefreshCw,
  Save,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  addPhotoToAlbumFromBlob,
  getPhoto,
  replacePhotoFromBlob,
} from "@/lib/db/store";
import { cn } from "@/lib/cn";
import { suggestDocumentQuad } from "@/lib/scanner/documentQuad";
import {
  imageDataToBlob,
  scaleQuadAboutCentroid,
  suggestedOutputSize,
  warpQuadToRect,
  type Point,
  type Quad,
} from "@/lib/scanner/homography";

const WORK_MAX_EDGE = 2048;
const PREVIEW_DEBOUNCE_MS = 350;
const SAVE_MAX_LONG_EDGE = 2600;
/** הרחבה/כיווץ מסגרת בכל לחיצה (סביב מרכז המרובע) */
const FRAME_SCALE_STEP = 1.07;

async function fileToScaledImageData(
  file: File,
  maxEdge: number
): Promise<ImageData> {
  const bmp = await createImageBitmap(file);
  const w = bmp.width;
  const h = bmp.height;
  const s = Math.min(1, maxEdge / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * s));
  const ch = Math.max(1, Math.round(h * s));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d");
  ctx.drawImage(bmp, 0, 0, cw, ch);
  bmp.close?.();
  return ctx.getImageData(0, 0, cw, ch);
}

function fullImageQuad(w: number, h: number): Quad {
  return [
    { x: 0, y: 0 },
    { x: w - 1, y: 0 },
    { x: w - 1, y: h - 1 },
    { x: 0, y: h - 1 },
  ];
}

function quadForImage(idata: ImageData): Quad {
  const suggested = suggestDocumentQuad(idata);
  return suggested ?? fullImageQuad(idata.width, idata.height);
}

/**
 * קואורדינטות viewport → יחידות viewBox (0…W, 0…H) עם יישור xMidYMid meet
 * כמו ש־preserveAspectRatio="xMidYMid meet" מצייר — בלי inverse() שעלול לזרוק.
 */
function clientToViewBoxMeet(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  vbW: number,
  vbH: number
): Point {
  const rect = svg.getBoundingClientRect();
  if (vbW <= 0 || vbH <= 0 || rect.width <= 0 || rect.height <= 0) {
    return { x: 0, y: 0 };
  }
  const scale = Math.min(rect.width / vbW, rect.height / vbH);
  const dispW = vbW * scale;
  const dispH = vbH * scale;
  const ox = rect.left + (rect.width - dispW) / 2;
  const oy = rect.top + (rect.height - dispH) / 2;
  return {
    x: (clientX - ox) / scale,
    y: (clientY - oy) / scale,
  };
}

interface Props {
  albumId: string;
  projectId: string;
  /** כשנשלח — טוענים תמונה קיימת לסורק ומעדכנים אותה בשמירה (במקום יצירת כפילות) */
  editPhotoId?: string | null;
  onSaved?: () => void | Promise<void>;
}

export function ScannerWorkspace({
  albumId,
  projectId,
  editPhotoId,
  onSaved,
}: Props) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);
  const framePanRef = useRef<{
    pointerId: number;
    startVb: Point;
    startQuad: Quad;
  } | null>(null);

  const [sourceName, setSourceName] = useState<string | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [quad, setQuad] = useState<Quad | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    id: string;
    defaultFileName: string;
  } | null>(null);
  const [loadingEditSource, setLoadingEditSource] = useState(false);

  const W = imageData?.width ?? 0;
  const H = imageData?.height ?? 0;

  useEffect(() => {
    const c = baseCanvasRef.current;
    if (!c || !imageData) return;
    c.width = imageData.width;
    c.height = imageData.height;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(imageData, 0, 0);
  }, [imageData]);

  const clampToImage = useCallback(
    (p: Point): Point => ({
      x: Math.max(0, Math.min(W - 1, p.x)),
      y: Math.max(0, Math.min(H - 1, p.y)),
    }),
    [W, H]
  );

  const runPreview = useCallback(async () => {
    if (!imageData || !quad) return;
    setPreviewBusy(true);
    try {
      let { width: ow, height: oh } = suggestedOutputSize(quad);
      const maxDim = Math.max(ow, oh);
      const cap = 900;
      if (maxDim > cap) {
        const r = cap / maxDim;
        ow = Math.max(16, Math.round(ow * r));
        oh = Math.max(16, Math.round(oh * r));
      }
      const out = warpQuadToRect(imageData, quad, ow, oh);
      const blob = await imageDataToBlob(out, "image/jpeg", 0.88);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "לא ניתן ליישר — בדקי את הפינות."
      );
    } finally {
      setPreviewBusy(false);
    }
  }, [imageData, quad, toast]);

  useEffect(() => {
    if (!imageData || !quad) return;
    const t = window.setTimeout(() => {
      void runPreview();
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [imageData, quad, runPreview]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!editPhotoId?.trim()) {
      setEditTarget(null);
      return;
    }
    const id = editPhotoId.trim();
    let cancelled = false;
    setLoadingEditSource(true);
    (async () => {
      try {
        const ph = await getPhoto(id);
        if (cancelled) return;
        if (!ph) {
          toast.error("התמונה לא נמצאה.");
          return;
        }
        if (ph.albumId !== albumId || ph.projectId !== projectId) {
          toast.error("התמונה לא שייכת לאלבום הזה.");
          return;
        }
        let file: File | null = null;
        if (ph.blob instanceof Blob && ph.blob.size > 0) {
          file = new File([ph.blob], ph.fileName, { type: ph.mimeType });
        } else if (ph.displayUrl?.trim()) {
          const res = await fetch(ph.displayUrl);
          if (!res.ok) {
            throw new Error("לא ניתן להוריד את התמונה — בדקי את החיבור לענן.");
          }
          const b = await res.blob();
          file = new File([b], ph.fileName, {
            type: b.type || ph.mimeType || "image/jpeg",
          });
        } else {
          toast.error(
            "אין גישה לקובץ המקורי. במצב מקומי פתחי מהמחשב שבו נשמרה התמונה."
          );
          return;
        }
        const idata = await fileToScaledImageData(file, WORK_MAX_EDGE);
        if (cancelled) return;
        setEditTarget({ id: ph.id, defaultFileName: ph.fileName });
        setSourceName(`${ph.fileName} · עריכת יישור`);
        setImageData(idata);
        setQuad(quadForImage(idata));
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          toast.error(
            e instanceof Error ? e.message : "טעינת התמונה לעריכה נכשלה."
          );
        }
      } finally {
        if (!cancelled) setLoadingEditSource(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editPhotoId, albumId, projectId]);

  async function onPickFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("נא לבחור קובץ תמונה.");
      return;
    }
    try {
      const idata = await fileToScaledImageData(file, WORK_MAX_EDGE);
      setSourceName(file.name);
      setImageData(idata);
      setQuad(quadForImage(idata));
      setEditTarget(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (e) {
      console.error(e);
      toast.error("טעינת התמונה נכשלה.");
    }
  }

  function onPointerDownCorner(
    e: ReactPointerEvent<SVGCircleElement>,
    index: number
  ) {
    e.preventDefault();
    (e.target as SVGCircleElement).setPointerCapture(e.pointerId);
    setDragIndex(index);
  }

  function onPointerMoveCorner(
    e: ReactPointerEvent<SVGCircleElement>,
    index: number
  ) {
    if (dragIndex !== index || !overlayRef.current || !quad || !W) return;
    const p = clientToViewBoxMeet(
      overlayRef.current,
      e.clientX,
      e.clientY,
      W,
      H
    );
    const q = [...quad] as Quad;
    q[index] = clampToImage({ x: p.x, y: p.y });
    setQuad(q);
  }

  function onPointerUpOverlay(e: ReactPointerEvent<SVGCircleElement>) {
    try {
      (e.target as SVGCircleElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setDragIndex(null);
  }

  function onFrameBgPointerDown(e: ReactPointerEvent<SVGRectElement>) {
    if (!quad || !overlayRef.current || !W) return;
    if (e.button !== 0 && e.pointerType !== "touch") return;
    e.preventDefault();
    const startVb = clientToViewBoxMeet(
      overlayRef.current,
      e.clientX,
      e.clientY,
      W,
      H
    );
    framePanRef.current = {
      pointerId: e.pointerId,
      startVb,
      startQuad: [...quad] as Quad,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onFrameBgPointerMove(e: ReactPointerEvent<SVGRectElement>) {
    const st = framePanRef.current;
    if (!st || st.pointerId !== e.pointerId || !overlayRef.current) return;
    const vb = clientToViewBoxMeet(
      overlayRef.current,
      e.clientX,
      e.clientY,
      W,
      H
    );
    const dx = vb.x - st.startVb.x;
    const dy = vb.y - st.startVb.y;
    const q = st.startQuad.map((p) =>
      clampToImage({ x: p.x + dx, y: p.y + dy })
    ) as Quad;
    setQuad(q);
  }

  function onFrameBgPointerEnd(e: ReactPointerEvent<SVGRectElement>) {
    const st = framePanRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    framePanRef.current = null;
  }

  function expandFrame() {
    if (!quad) return;
    setQuad(scaleQuadAboutCentroid(quad, FRAME_SCALE_STEP, clampToImage));
  }

  function shrinkFrame() {
    if (!quad) return;
    setQuad(scaleQuadAboutCentroid(quad, 1 / FRAME_SCALE_STEP, clampToImage));
  }

  async function onSave() {
    if (!imageData || !quad) return;
    setSaveBusy(true);
    try {
      let { width: ow, height: oh } = suggestedOutputSize(quad);
      const maxDim = Math.max(ow, oh);
      if (maxDim > SAVE_MAX_LONG_EDGE) {
        const r = SAVE_MAX_LONG_EDGE / maxDim;
        ow = Math.max(32, Math.round(ow * r));
        oh = Math.max(32, Math.round(oh * r));
      }
      const out = warpQuadToRect(imageData, quad, ow, oh);
      const blob = await imageDataToBlob(out, "image/jpeg", 0.93);
      const baseFromName = (name: string) => name.replace(/\.[^.]+$/, "");
      const base = editTarget
        ? baseFromName(editTarget.defaultFileName)
        : baseFromName(sourceName ?? "") || "scan";

      if (editTarget) {
        const fileName = `${base}.jpg`;
        await replacePhotoFromBlob({
          photoId: editTarget.id,
          blob,
          fileName,
          mimeType: "image/jpeg",
        });
        toast.success("התמונה באלבום עודכנה — היישור החדש נשמר.");
      } else {
        const fileName = `${base}-${Date.now()}.jpg`;
        await addPhotoToAlbumFromBlob({
          albumId,
          projectId,
          blob,
          fileName,
          mimeType: "image/jpeg",
        });
        toast.success("התמונה המיושרת נשמרה באלבום.");
      }
      await onSaved?.();
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "השמירה נכשלה — נסי שוב."
      );
    } finally {
      setSaveBusy(false);
    }
  }

  function resetCorners() {
    if (!imageData) return;
    setQuad(fullImageQuad(imageData.width, imageData.height));
  }

  function autoDetectFrame() {
    if (!imageData) return;
    const suggested = suggestDocumentQuad(imageData);
    if (suggested) {
      setQuad(suggested);
      toast.success("מסגרת זוהתה אוטומטית — ניתן לדייק ידנית.");
    } else {
      toast.error(
        "לא זוהתה מסגרת ברורה — גררו את הפינות או השתמשו באיפוס לתמונה מלאה."
      );
    }
  }

  return (
    <div className="space-y-6">
      {loadingEditSource && editPhotoId ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-eggplant/15 bg-white/60 py-16 text-sm text-ink-muted">
          <Loader2 className="h-7 w-7 shrink-0 animate-spin text-eggplant/50" />
          טוענים את התמונה לעריכת יישור…
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void onPickFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          startIcon={<ImagePlus className="h-4 w-4" />}
          onClick={() => inputRef.current?.click()}
        >
          בחירת תמונה
        </Button>
        {sourceName && (
          <span className="text-xs text-ink-muted truncate max-w-[14rem]">
            {sourceName}
            <span className="mx-1.5 text-ink-soft">·</span>
            עבודה עד {WORK_MAX_EDGE}px לצלע הארוכה
          </span>
        )}
      </div>

      {!loadingEditSource && (!imageData || !quad) ? (
        <div className="rounded-2xl border border-dashed border-eggplant/20 bg-white/50 p-10 text-center text-sm text-ink-muted leading-relaxed">
          <Wand2 className="mx-auto mb-3 h-8 w-8 text-eggplant/40" />
          <p>
            העלו צילום של דף או אלבום. אם המצלמה בטלפון חתכה אוטומטית — אל
            דאגה: אחרי הטעינה אפשר להרחיב, להזיז או לדייק את הפינות לפני שמירה.
          </p>
        </div>
      ) : !loadingEditSource && imageData && quad ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(200px,320px)]">
          <div className="space-y-3">
            {editTarget ? (
              <p className="rounded-xl border border-gold-400/45 bg-gold-50/90 px-4 py-3 text-sm text-eggplant leading-relaxed">
                עורכים תמונה שכבר נשמרה באלבום. לחיצה על &quot;עדכון&quot;
                תחליף את קובץ התמונה (אותו מספר עוקב ואותם פרטים).
              </p>
            ) : null}
            <div className="relative w-full rounded-2xl border border-eggplant/15 bg-ink/5 p-2">
              <div className="relative w-full leading-[0]">
                <canvas
                  ref={baseCanvasRef}
                  className="block h-auto w-full rounded-xl shadow-inner"
                />
                <svg
                  ref={overlayRef}
                  role="presentation"
                  className="absolute inset-0 h-full w-full touch-none rounded-xl select-none"
                  viewBox={`0 0 ${W} ${H}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  <rect
                    x={0}
                    y={0}
                    width={W}
                    height={H}
                    fill="transparent"
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={onFrameBgPointerDown}
                    onPointerMove={onFrameBgPointerMove}
                    onPointerUp={onFrameBgPointerEnd}
                    onPointerCancel={onFrameBgPointerEnd}
                  />
                  <polygon
                    points={quad.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="rgba(212, 175, 55, 0.12)"
                    stroke="var(--gold-500, #c9a227)"
                    strokeWidth={Math.max(2, W / 400)}
                    pointerEvents="none"
                  />
                  {quad.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={Math.max(14, W / 65)}
                      className="cursor-grab active:cursor-grabbing fill-white stroke-eggplant"
                      strokeWidth={Math.max(2, W / 500)}
                      onPointerDown={(e) => onPointerDownCorner(e, i)}
                      onPointerMove={(e) => onPointerMoveCorner(e, i)}
                      onPointerUp={onPointerUpOverlay}
                      onPointerCancel={onPointerUpOverlay}
                      style={{ pointerEvents: "auto" }}
                    />
                  ))}
                </svg>
              </div>
            </div>
            <div className="space-y-2 text-xs text-ink-muted">
              <p className="flex items-start gap-2 leading-relaxed">
                <Move className="h-4 w-4 shrink-0 text-gold-700 mt-0.5" />
                <span>
                  <span className="font-medium text-ink-soft">
                    הזזת המסגרת:
                  </span>{" "}
                  גררו מתוך התמונה (לא על העיגולים) כדי להזיז את כל האזור
                  שנשמר.
                </span>
              </p>
              <p>
                <span className="font-medium text-ink-soft">פינות:</span>{" "}
                שמאל-עליון → ימין-עליון → ימין-תחתון → שמאל-תחתון — ליישור
                פרספקטיבה של העמוד.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                startIcon={<ZoomOut className="h-4 w-4" />}
                onClick={shrinkFrame}
                title="מצמצם את המסגרת סביב המרכז"
              >
                מיקוד צר יותר
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                startIcon={<ZoomIn className="h-4 w-4" />}
                onClick={expandFrame}
                title="מרחיב את המסגרת — מראה יותר מהתמונה מסביב"
              >
                יותר שוליים
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                startIcon={<Wand2 className="h-4 w-4" />}
                onClick={autoDetectFrame}
                title="ניסיון לזות את קצה המסמך (כמו תצוגה מקדימה)"
              >
                זיהוי מסגרת אוטומטי
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                startIcon={<RefreshCw className="h-4 w-4" />}
                onClick={resetCorners}
              >
                איפוס לתמונה מלאה
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                loading={previewBusy}
                onClick={() => void runPreview()}
              >
                תצוגה מקדימה
              </Button>
              <Button
                type="button"
                size="sm"
                loading={saveBusy}
                startIcon={<Save className="h-4 w-4" />}
                onClick={() => void onSave()}
              >
                {editTarget ? "עדכון תמונה באלבום" : "שמירה לאלבום"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-eggplant">אחרי יישור</h3>
            <div
              className={cn(
                "relative flex min-h-[180px] items-center justify-center overflow-hidden rounded-2xl border border-eggplant/15 bg-white/70",
                !previewUrl && !previewBusy && "border-dashed"
              )}
            >
              {previewBusy && (
                <Loader2 className="h-8 w-8 animate-spin text-eggplant/40" />
              )}
              {!previewBusy && previewUrl && (
                <img
                  src={previewUrl}
                  alt="תצוגה מקדימה של היישור"
                  className="max-h-[420px] w-full object-contain"
                />
              )}
              {!previewUrl && !previewBusy && (
                <span className="px-4 text-center text-xs text-ink-muted">
                  התצוגה המקדימה תתעדכן לאחר סידור הפינות
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
