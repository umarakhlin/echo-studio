import "server-only";

import {
  type InferenceProviderOrPolicy,
  InferenceClient,
} from "@huggingface/inference";

/** מודל עם Inference Providers (Fal / Replicate / …) — עובד עם טוקן HF בלבד */
const DEFAULT_MODEL = "Qwen/Qwen-Image-Edit";

const DEFAULT_PROMPT =
  "Enhance image quality: reduce compression artifacts, improve sharpness and clarity, natural colors and lighting, photorealistic, keep the same scene, people, and composition.";

function extractErrorFromBody(raw: string): string {
  const t = raw.trim();
  const pre = /<pre[^>]*>([\s\S]*?)<\/pre>/i.exec(t);
  if (pre?.[1]) return pre[1].trim();
  if (/^<!DOCTYPE /i.test(t) || /<html[\s>]/i.test(t)) {
    if (/cannot post\s+\//i.test(t)) {
      return (
        "המודל או נתיב ה-inference לא זמינים. נסי מודל אחר ב-HUGGINGFACE_IMAGE_UPSCALE_MODEL " +
        "או הגדירי HUGGINGFACE_IMAGE_INFERENCE_PROVIDER (למשל fal-ai)."
      );
    }
    return "תשובת שגיאה בפורמט HTML — בדקי מודל והרשאות טוקן.";
  }
  return t;
}

function humanizeHfError(raw: string): string {
  let t = raw.trim();
  if (!t) return "שגיאה מ-Hugging Face.";
  if (/<!DOCTYPE\s+html|<html[\s>]/i.test(t)) {
    t = extractErrorFromBody(t);
  }
  if (
    /insufficient|quota|exceeded|paid plan|upgrade|billing|deplet\w*\s+your\s+.*credits|included credits|pre-paid credits|subscribe to PRO|Inference Providers/i.test(
      t
    )
  ) {
    return (
      "נגמרו קרדיטי Inference ב-Hugging Face לחודש (או אין מספיק כלל). " +
      "אפשר לרכוש קרדיטים מראש או Pro ב-huggingface.co/settings/billing, " +
      "או להשתמש בשירות אחר לשיפור תמונה (למשל Replicate עם טוקן נפרד אם מוגדר)."
    );
  }
  if (
    /cannot post\s+\/|not supported for task|no inference provider|We have not been able to find inference provider|Task ['\w-]+ ['\w-]+ not supported for provider/i.test(
      t
    )
  ) {
    return (
      "שירות השיפור לא מצליח עם המודל או הספק הנוכחי. " +
      "עדכני את HUGGINGFACE_IMAGE_UPSCALE_MODEL או הוסיפי HUGGINGFACE_IMAGE_INFERENCE_PROVIDER=replicate (או fal-ai)."
    );
  }
  if (/invalid username|invalid token|401|unauthorized|not authenticated/i.test(t)) {
    return "טוקן Hugging Face לא תקין או חסרות הרשאות — בדקי את HUGGINGFACE_API_TOKEN.";
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

function parseProvider(
  raw: string | undefined
): InferenceProviderOrPolicy | null {
  const t = raw?.trim();
  if (!t || t === "auto") return null;
  return t as InferenceProviderOrPolicy;
}

const PROVIDER_FALLBACK_ORDER: InferenceProviderOrPolicy[] = [
  "fal-ai",
  "replicate",
  "wavespeed",
];

/**
 * שיפור איכות תמונה דרך Hugging Face Inference Providers (למשל Fal מאחורי router),
 * עם טוקן HF בלבד. מחזיר data URL ל-<img src>.
 */
export async function upscaleWithHuggingFace(imageUrl: string): Promise<string> {
  const token = process.env.HUGGINGFACE_API_TOKEN?.trim();
  if (!token) {
    throw new Error("HUGGINGFACE_API_TOKEN חסר.");
  }

  const model =
    process.env.HUGGINGFACE_IMAGE_UPSCALE_MODEL?.trim() || DEFAULT_MODEL;
  const prompt =
    process.env.HUGGINGFACE_IMAGE_EDIT_PROMPT?.trim() || DEFAULT_PROMPT;
  const provider = parseProvider(
    process.env.HUGGINGFACE_IMAGE_INFERENCE_PROVIDER
  );
  const providerCandidates: InferenceProviderOrPolicy[] = provider
    ? [provider]
    : PROVIDER_FALLBACK_ORDER;

  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    throw new Error("לא ניתן להוריד את התמונה לשיפור.");
  }

  const inputMime =
    imageRes.headers.get("content-type")?.split(";")[0]?.trim() ||
    "image/jpeg";
  const buf = await imageRes.arrayBuffer();
  const blob = new Blob([buf], { type: inputMime });

  const client = new InferenceClient(token);

  let lastRaw = "";
  for (const p of providerCandidates) {
    try {
      const outBlob = await client.imageToImage({
        model,
        inputs: blob,
        parameters: { prompt },
        provider: p,
      });
      const outBuf = Buffer.from(await outBlob.arrayBuffer());
      const mime =
        outBlob.type && outBlob.type !== "application/octet-stream"
          ? outBlob.type
          : "image/png";
      const dataUrl = bufferToDataUrl(outBuf, mime);
      if (!dataUrl) {
        throw new Error("לא התקבלה תמונה תקינה מ-Hugging Face.");
      }
      return dataUrl;
    } catch (e) {
      lastRaw = e instanceof Error ? e.message : String(e);
      console.warn(
        `[huggingfaceUpscale] provider ${p} failed:`,
        lastRaw.slice(0, 500)
      );
    }
  }

  throw new Error(humanizeHfError(lastRaw));
}
