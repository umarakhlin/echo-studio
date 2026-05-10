import "server-only";

const FALLBACK_MODEL = "caidas/swin2SR-classical-sr-x2-64";
const MAX_ATTEMPTS = 12;
const BASE_WAIT_MS = 3000;

function humanizeHfError(raw: string): string {
  const t = raw.trim();
  if (!t) return "שגיאה מ-Hugging Face.";
  if (/insufficient|quota|exceeded|paid plan|upgrade|billing/i.test(t)) {
    return (
      "מגבלת השימוש ב-Hugging Face נגמרה או נדרשת תוכנית בתשלום. " +
      "בדקי billing ב-huggingface.co — או שהמערכת תנסה שוב עם Replicate אם הוגדר."
    );
  }
  if (/loading|initializing|warm|starting|unavailable|queue/i.test(t)) {
    return "המודל נטען — נסי שוב בעוד רגע.";
  }
  if (t.length > 320) return `${t.slice(0, 320)}…`;
  return t;
}

function bufferToDataUrl(out: Buffer, mimeFromHeader: string): string | null {
  const ct = mimeFromHeader.split(";")[0].trim().toLowerCase();
  if (ct.startsWith("image/")) {
    return `data:${ct};base64,${out.toString("base64")}`;
  }
  if (out[0] === 0xff && out[1] === 0xd8) {
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  }
  if (out[0] === 0x89 && out[1] === 0x50) {
    return `data:image/png;base64,${out.toString("base64")}`;
  }
  return null;
}

/**
 * שיפור/הגדלה (בערך x2) דרך Inference API של Hugging Face.
 * מחזיר data URL לשימוש ב-<img src>.
 */
export async function upscaleWithHuggingFace(imageUrl: string): Promise<string> {
  const token = process.env.HUGGINGFACE_API_TOKEN?.trim();
  if (!token) {
    throw new Error("HUGGINGFACE_API_TOKEN חסר.");
  }

  const model =
    process.env.HUGGINGFACE_IMAGE_UPSCALE_MODEL?.trim() || FALLBACK_MODEL;

  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    throw new Error("לא ניתן להוריד את התמונה לשיפור.");
  }

  const inputMime =
    imageRes.headers.get("content-type")?.split(";")[0]?.trim() ||
    "image/jpeg";
  const buf = Buffer.from(await imageRes.arrayBuffer());

  const apiUrl = `https://api-inference.huggingface.co/models/${model}`;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const hfRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept:
          "image/png, image/jpeg, image/webp, application/json;q=0.8,*/*;q=0.1",
        "Content-Type": inputMime,
      },
      body: buf,
    });

    const ctHeader = hfRes.headers.get("content-type") || "";
    const out = Buffer.from(await hfRes.arrayBuffer());

    if (ctHeader.toLowerCase().includes("application/json")) {
      let j: { error?: string; estimated_time?: number };
      try {
        j = JSON.parse(out.toString("utf8")) as {
          error?: string;
          estimated_time?: number;
        };
      } catch {
        throw new Error(humanizeHfError(out.toString("utf8", 0, 800)));
      }

      const err = j.error || "";

      if (
        hfRes.status === 503 ||
        /loading|initializing|warm|starting|unavailable|queue|still/i.test(err)
      ) {
        const waitMs = Math.min(
          15_000,
          Math.max(
            BASE_WAIT_MS,
            Math.round((j.estimated_time ?? 0) * 1000) || BASE_WAIT_MS
          )
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!hfRes.ok) {
        throw new Error(humanizeHfError(err || `HTTP ${hfRes.status}`));
      }

      throw new Error(
        humanizeHfError(
          "תשובה לא צפויה מהמודל. נסי מודל אחר ב-HUGGINGFACE_IMAGE_UPSCALE_MODEL."
        )
      );
    }

    const dataUrl = bufferToDataUrl(out, ctHeader);
    if (hfRes.ok && dataUrl) {
      return dataUrl;
    }

    if (hfRes.ok) {
      throw new Error(
        humanizeHfError(
          "לא התקבלה תמונה מהמודל. נסי להגדיר מודל אחר ב-HUGGINGFACE_IMAGE_UPSCALE_MODEL."
        )
      );
    }

    if (hfRes.status === 503) {
      await new Promise((r) => setTimeout(r, BASE_WAIT_MS));
      continue;
    }

    throw new Error(humanizeHfError(out.toString("utf8", 0, 800)));
  }

  throw new Error("Hugging Face לא החזיר תמונה בזמן — נסי שוב.");
}
