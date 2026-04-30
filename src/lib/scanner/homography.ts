/**
 * יישור פרספקטיבה: ארבע פינות במקור → מלבן ביעד (הומוגרפיה + דגימה בילינארית).
 * ללא תלות חיצונית — מתאים לסורק Echo (אבן דרך 2, MVP).
 */

export interface Point {
  x: number;
  y: number;
}

/** p0=שמאל-עליון, p1=ימין-עליון, p2=ימין-תחתון, p3=שמאל-תחתון (y למטה כמו ב-canvas). */
export type Quad = [Point, Point, Point, Point];

/**
 * הומוגרפיה 3×3 (שורה רציפה) כך ש-src[i] ממופה ל-dst[i]:
 * λ * [xd, yd, 1]^T = H * [xs, ys, 1]^T
 */
export function getHomography(src: Quad, dst: Quad): number[] {
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: X, y: Y } = dst[i];

    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]);
    b.push(X);
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]);
    b.push(Y);
  }

  const h = solveLinearSystem8(A, b);
  return [
    h[0], h[1], h[2],
    h[3], h[4], h[5],
    h[6], h[7], 1,
  ];
}

function solveLinearSystem8(A: number[][], b: number[]): number[] {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) {
      throw new Error("הפינות כמעט קולינאריות — נסי להרחיק מעט את הפינות.");
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const div = M[col][col];
    for (let c = col; c <= n; c++) M[col][c] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (Math.abs(f) < 1e-15) continue;
      for (let c = col; c <= n; c++) {
        M[r][c] -= f * M[col][c];
      }
    }
  }

  return M.map((row) => row[n]);
}

export function invertHomography(H: number[]): number[] {
  const a = H[0],
    b = H[1],
    c = H[2];
  const d = H[3],
    e = H[4],
    f = H[5];
  const g = H[6],
    h = H[7],
    i = H[8];

  const A = e * i - f * h;
  const B = f * g - d * i;
  const C = d * h - e * g;
  const D = c * h - b * i;
  const E = a * i - c * g;
  const F = b * g - a * h;
  const G = b * f - c * e;
  const H2 = c * d - a * f;
  const I2 = a * e - b * d;

  let det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) throw new Error("מטריצה סינגולרית — בדקי את הפינות.");
  det = 1 / det;

  return [
    A * det,
    D * det,
    G * det,
    B * det,
    E * det,
    H2 * det,
    C * det,
    F * det,
    I2 * det,
  ];
}

export function applyHomography(H: number[], x: number, y: number): Point {
  const w = H[6] * x + H[7] * y + H[8];
  if (Math.abs(w) < 1e-12) return { x: NaN, y: NaN };
  return {
    x: (H[0] * x + H[1] * y + H[2]) / w,
    y: (H[3] * x + H[4] * y + H[5]) / w,
  };
}

function bilinearSample(
  data: ImageData,
  width: number,
  height: number,
  x: number,
  y: number
): [number, number, number, number] {
  if (x < 0 || y < 0 || x >= width - 1 || y >= height - 1) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return [0, 0, 0, 255];
    }
  }

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  const dx = x - x0;
  const dy = y - y0;

  const idx = (xi: number, yi: number) => (yi * width + xi) * 4;

  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (let ch = 0; ch < 4; ch++) {
    const v00 = data.data[idx(x0, y0) + ch];
    const v10 = data.data[idx(x1, y0) + ch];
    const v01 = data.data[idx(x0, y1) + ch];
    const v11 = data.data[idx(x1, y1) + ch];
    const v0 = v00 * (1 - dx) + v10 * dx;
    const v1 = v01 * (1 - dx) + v11 * dx;
    out[ch] = Math.round(v0 * (1 - dy) + v1 * dy);
  }
  return out;
}

export function warpQuadToRect(
  imageData: ImageData,
  srcQuad: Quad,
  outW: number,
  outH: number
): ImageData {
  const sw = imageData.width;
  const sh = imageData.height;

  const dst: Quad = [
    { x: 0, y: 0 },
    { x: outW - 1, y: 0 },
    { x: outW - 1, y: outH - 1 },
    { x: 0, y: outH - 1 },
  ];

  const H = getHomography(srcQuad, dst);
  const invH = invertHomography(H);

  const out = new ImageData(outW, outH);

  for (let yd = 0; yd < outH; yd++) {
    for (let xd = 0; xd < outW; xd++) {
      const p = applyHomography(invH, xd, yd);
      const o = (yd * outW + xd) * 4;
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        out.data[o + 3] = 0;
        continue;
      }
      const [r, g, b, a] = bilinearSample(imageData, sw, sh, p.x, p.y);
      out.data[o] = r;
      out.data[o + 1] = g;
      out.data[o + 2] = b;
      out.data[o + 3] = a;
    }
  }

  return out;
}

export function suggestedOutputSize(quad: Quad): { width: number; height: number } {
  const [p0, p1, p2, p3] = quad;
  const top = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const bottom = Math.hypot(p2.x - p3.x, p2.y - p3.y);
  const left = Math.hypot(p3.x - p0.x, p3.y - p0.y);
  const right = Math.hypot(p2.x - p1.x, p2.y - p1.y);

  let width = Math.round((top + bottom) / 2);
  let height = Math.round((left + right) / 2);

  width = Math.max(32, Math.min(width, 8000));
  height = Math.max(32, Math.min(height, 8000));

  return { width, height };
}

/** מרכז גיאומטרי של המסגרת (ממוצע פינות). */
export function quadCentroid(q: Quad): Point {
  return {
    x: (q[0].x + q[1].x + q[2].x + q[3].x) / 4,
    y: (q[0].y + q[1].y + q[2].y + q[3].y) / 4,
  };
}

/**
 * מרחיבה או מכווצת את המסגרת סביב המרכז (שומרת זווית/פרספקטיבה).
 * factor > 1 — "הראי יותר" מהסביבה; factor < 1 — מיקוד צפוף יותר.
 */
export function scaleQuadAboutCentroid(
  q: Quad,
  factor: number,
  clamp: (p: Point) => Point
): Quad {
  const c = quadCentroid(q);
  return [
    clamp({
      x: c.x + (q[0].x - c.x) * factor,
      y: c.y + (q[0].y - c.y) * factor,
    }),
    clamp({
      x: c.x + (q[1].x - c.x) * factor,
      y: c.y + (q[1].y - c.y) * factor,
    }),
    clamp({
      x: c.x + (q[2].x - c.x) * factor,
      y: c.y + (q[2].y - c.y) * factor,
    }),
    clamp({
      x: c.x + (q[3].x - c.x) * factor,
      y: c.y + (q[3].y - c.y) * factor,
    }),
  ] as Quad;
}

export function imageDataToBlob(
  idata: ImageData,
  mime: "image/jpeg" | "image/png" = "image/jpeg",
  quality = 0.92
): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = idata.width;
  c.height = idata.height;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2d context");
  ctx.putImageData(idata, 0, 0);
  return new Promise((resolve, reject) => {
    c.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      mime,
      mime === "image/jpeg" ? quality : undefined
    );
  });
}
