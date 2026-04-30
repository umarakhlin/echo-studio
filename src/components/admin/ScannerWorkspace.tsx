"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ImagePlus, Loader2, RefreshCw, Save, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { addPhotoToAlbumFromBlob } from "@/lib/db";
import { cn } from "@/lib/cn";
import {
  imageDataToBlob,
  suggestedOutputSize,
  warpQuadToRect,
  type Point,
  type Quad,
} from "@/lib/scanner/homography";

const WORK_MAX_EDGE = 2048;
const PREVIEW_DEBOUNCE_MS = 350;
const SAVE_MAX_LONG_EDGE = 2600;

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
  onSaved?: () => void | Promise<void>;
}

export function ScannerWorkspace({ albumId, projectId, onSaved }: Props) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);

  const [sourceName, setSourceName] = useState<string | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [quad, setQuad] = useState<Quad | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

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

  async function onPickFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("נא לבחור קובץ תמונה.");
      return;
    }
    try {
      const idata = await fileToScaledImageData(file, WORK_MAX_EDGE);
      setSourceName(file.name);
      setImageData(idata);
      setQuad(fullImageQuad(idata.width, idata.height));
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
      const base =
        sourceName?.replace(/\.[^.]+$/, "") ?? "scan";
      const fileName = `${base}-${Date.now()}.jpg`;
      await addPhotoToAlbumFromBlob({
        albumId,
        projectId,
        blob,
        fileName,
        mimeType: "image/jpeg",
      });
      toast.success("התמונה המיושרת נשמרה באלבום.");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
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

      {!imageData || !quad ? (
        <div className="rounded-2xl border border-dashed border-eggplant/20 bg-white/50 p-10 text-center text-sm text-ink-muted">
          <Wand2 className="mx-auto mb-3 h-8 w-8 text-eggplant/40" />
          העלו צילום של דף או אלבום, ואז גררו את ארבע הפינות כך שיתאימו לפינות
          המסמך.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(200px,320px)]">
          <div className="space-y-3">
            <div className="relative w-full rounded-2xl border border-eggplant/15 bg-ink/5 p-2">
              <div className="relative w-full leading-[0]">
                <canvas
                  ref={baseCanvasRef}
                  className="block h-auto w-full rounded-xl shadow-inner"
                />
                <svg
                  ref={overlayRef}
                  role="presentation"
                  className="absolute inset-0 h-full w-full touch-none rounded-xl"
                  viewBox={`0 0 ${W} ${H}`}
                  preserveAspectRatio="xMidYMid meet"
                >
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
                      r={Math.max(10, W / 80)}
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
            <p className="text-xs text-ink-muted">
              פינות: שמאל-עליון → ימין-עליון → ימין-תחתון → שמאל-תחתון.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                startIcon={<RefreshCw className="h-4 w-4" />}
                onClick={resetCorners}
              >
                איפוס פינות
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
                שמירה לאלבום
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
      )}
    </div>
  );
}
