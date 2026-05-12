/**
 * הצעת מסגרת פרספקטיבה למסמך/תצלום (סגנון סורק) ללא ספריות כבדות.
 * מנתח את הגבול החיצוני של אזור בהיר יחסית (דף / תמונה) ומחזיר Quad.
 */

import type { Point, Quad } from "@/lib/scanner/homography";

function clamp(p: Point, w: number, h: number): Point {
  return {
    x: Math.max(0, Math.min(w - 1, p.x)),
    y: Math.max(0, Math.min(h - 1, p.y)),
  };
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function downscaleGray(
  src: ImageData,
  maxSide: number
): { gray: Float32Array; w: number; h: number; sx: number; sy: number } {
  const sw = src.width;
  const sh = src.height;
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.max(8, Math.round(sw * scale));
  const h = Math.max(8, Math.round(sh * scale));
  const gray = new Float32Array(w * h);
  const data = src.data;
  for (let y = 0; y < h; y++) {
    const sy0 = Math.floor((y + 0.5) * (sh / h));
    for (let x = 0; x < w; x++) {
      const sx0 = Math.floor((x + 0.5) * (sw / w));
      const i = (sy0 * sw + sx0) * 4;
      gray[y * w + x] = luminance(data[i], data[i + 1], data[i + 2]);
    }
  }
  return { gray, w, h, sx: sw / w, sy: sh / h };
}

function otsuThreshold(gray: Float32Array, n: number): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    hist[Math.min(255, Math.max(0, Math.round(gray[i])))]++;
  }
  const sumAll = gray.reduce((a, v) => a + v, 0);
  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = n - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between >= maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  return threshold;
}

function largestBinaryBlob(bin: Uint8Array, w: number, h: number): Uint8Array | null {
  const visited = new Uint8Array(w * h);
  let bestMask: Uint8Array | null = null;
  let bestCount = 0;

  for (let i = 0; i < bin.length; i++) {
    if (bin[i] === 0 || visited[i]) continue;
    const stack = [i];
    const comp = new Uint8Array(w * h);
    let count = 0;
    while (stack.length) {
      const cur = stack.pop()!;
      if (visited[cur]) continue;
      visited[cur] = 1;
      if (bin[cur] === 0) continue;
      comp[cur] = 1;
      count++;
      const x = cur % w;
      const y = Math.floor(cur / w);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const j = ny * w + nx;
          if (!visited[j] && bin[j] === 1) stack.push(j);
        }
      }
    }
    if (count > bestCount) {
      bestCount = count;
      bestMask = comp;
    }
  }

  if (!bestMask || bestCount < w * h * 0.015) return null;
  return bestMask;
}

function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return [...points];
  const pts = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function centroid(pts: Point[]): Point {
  let sx = 0;
  let sy = 0;
  for (const p of pts) {
    sx += p.x;
    sy += p.y;
  }
  const n = pts.length;
  return { x: sx / n, y: sy / n };
}

function quadFromHull(hull: Point[], c: Point): Quad | null {
  if (hull.length < 4) return null;
  const buckets: Point[][] = [[], [], [], []];
  for (const p of hull) {
    const left = p.x < c.x;
    const top = p.y < c.y;
    const idx = top ? (left ? 0 : 1) : left ? 3 : 2;
    buckets[idx]!.push(p);
  }
  const corners: Point[] = [];
  for (const b of buckets) {
    if (b.length === 0) return null;
    let best = b[0]!;
    let bestD = -1;
    for (const p of b) {
      const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
    corners.push(best);
  }
  return [corners[0]!, corners[1]!, corners[2]!, corners[3]!];
}

function orderQuadTLTRBRBL(q: Quad, w: number, h: number): Quad {
  const pts = [...q];
  pts.sort((a, b) => a.y - b.y);
  const top = pts.slice(0, 2).sort((a, b) => a.x - b.x);
  const bot = pts.slice(2).sort((a, b) => a.x - b.x);
  return [
    clamp(top[0]!, w, h),
    clamp(top[1]!, w, h),
    clamp(bot[1]!, w, h),
    clamp(bot[0]!, w, h),
  ];
}

function boundaryPoints(mask: Uint8Array, w: number, h: number): Point[] {
  const out: Point[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (mask[idx] === 0) continue;
      const n =
        mask[idx - 1] +
        mask[idx + 1] +
        mask[idx - w] +
        mask[idx + w] +
        mask[idx - w - 1] +
        mask[idx - w + 1] +
        mask[idx + w - 1] +
        mask[idx + w + 1];
      if (n < 8) out.push({ x, y });
    }
  }
  if (out.length > 1200) {
    const step = Math.ceil(out.length / 1200);
    return out.filter((_, i) => i % step === 0);
  }
  return out;
}

/**
 * מחזיר Quad בקואורדינטות של **imageData המקורי** או null אם אין זיהוי סביר.
 */
export function suggestDocumentQuad(imageData: ImageData): Quad | null {
  const fullW = imageData.width;
  const fullH = imageData.height;
  const { gray, w, h, sx, sy } = downscaleGray(imageData, 520);
  const n = w * h;
  const T = otsuThreshold(gray, n);
  const bin = new Uint8Array(n);
  let hi = 0;
  for (let i = 0; i < n; i++) {
    bin[i] = gray[i]! >= T ? 1 : 0;
    hi += bin[i]!;
  }
  if (hi > n * 0.55) {
    for (let i = 0; i < n; i++) bin[i] = gray[i]! < T ? 1 : 0;
  }

  const mask = largestBinaryBlob(bin, w, h);
  if (!mask) return null;

  const bpts = boundaryPoints(mask, w, h);
  if (bpts.length < 8) return null;

  const hull = convexHull(bpts);
  if (hull.length < 4) return null;

  const c = centroid(hull);
  const raw = quadFromHull(hull, c);
  if (!raw) return null;

  const areaRatio =
    (0.5 *
      Math.abs(
        raw[0]!.x * (raw[1]!.y - raw[3]!.y) +
          raw[1]!.x * (raw[2]!.y - raw[0]!.y) +
          raw[2]!.x * (raw[3]!.y - raw[1]!.y) +
          raw[3]!.x * (raw[0]!.y - raw[2]!.y)
      )) /
    (w * h);
  if (areaRatio < 0.06 || areaRatio > 0.98) return null;

  const scaled: Quad = raw.map((p) => ({
    x: p.x * sx,
    y: p.y * sy,
  })) as Quad;

  return orderQuadTLTRBRBL(scaled, fullW, fullH);
}
