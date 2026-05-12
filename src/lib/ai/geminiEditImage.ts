import "server-only";

/** מודל תמונה נתמך; ניתן לדרוס ב-GEMINI_IMAGE_MODEL */
const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

type InlineBlob = {
  mimeType?: string;
  mime_type?: string;
  data?: string;
};

type Part = {
  text?: string;
  inlineData?: InlineBlob;
  /** שם השדה ב-REST הרשמי של Google */
  inline_data?: InlineBlob;
};

type GenContentResponse = {
  candidates?: Array<{
    content?: { parts?: Part[] };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number };
};

function firstImageFromParts(parts: Part[] | undefined): {
  mime: string;
  data: string;
} | null {
  if (!parts?.length) return null;
  for (const part of parts) {
    const raw = part.inlineData ?? part.inline_data;
    if (!raw?.data) continue;
    const mime = (raw.mimeType ?? raw.mime_type ?? "image/png").split(";")[0]!;
    return { mime, data: raw.data };
  }
  return null;
}

function humanizeGeminiErr(t: string): string {
  const s = t.trim();
  if (!s) return "שגיאה מ-Gemini.";
  if (/API key|PERMISSION_DENIED|401|403/i.test(s)) {
    return "מפתח Gemini לא תקין או חסר הרשאה — בדקי GEMINI_API_KEY.";
  }
  if (/quota|RESOURCE_EXHAUSTED|429|billing/i.test(s)) {
    return "מכסת Gemini נגמרה או נדרש חיוב — בדקי billing ב-Google AI Studio.";
  }
  if (s.length > 280) return `${s.slice(0, 280)}…`;
  return s;
}

/**
 * עריכת תמונה לפי טקסט (Gemini image) — מחזיר data URL להצגה / שמירה.
 */
export async function geminiEditImageFromUrl(
  imageUrl: string,
  userPrompt: string
): Promise<string> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY חסר בהגדרות השרת.");
  }

  const model =
    process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_GEMINI_IMAGE_MODEL;
  const prompt = userPrompt.trim();
  if (!prompt) {
    throw new Error("נדרשת הנחיה לעריכת התמונה.");
  }

  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    throw new Error("לא ניתן להוריד את התמונה לעריכה.");
  }

  const mime =
    imageRes.headers.get("content-type")?.split(";")[0]?.trim() ||
    "image/jpeg";
  if (!mime.startsWith("image/")) {
    throw new Error("הקישור אינו מצביע לתמונה.");
  }

  const buf = Buffer.from(await imageRes.arrayBuffer());
  const base64 = buf.toString("base64");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const partImage = { inline_data: { mime_type: mime, data: base64 } };
  const partImageCamel = {
    inlineData: { mimeType: mime, data: base64 },
  };

  const buildBody = (imagePart: typeof partImage | typeof partImageCamel) => ({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${prompt}\n\nEdit this image faithfully according to the instruction. Preserve people and main composition unless asked to change them.`,
          },
          imagePart,
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  let res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify(buildBody(partImage)),
  });

  if (!res.ok) {
    const retry = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify(buildBody(partImageCamel)),
    });
    if (retry.ok) {
      res = retry;
    }
  }

  const json = (await res.json()) as GenContentResponse;
  if (!res.ok) {
    const msg =
      json.error?.message ||
      (typeof json === "object"
        ? JSON.stringify(json).slice(0, 400)
        : "Gemini request failed");
    throw new Error(humanizeGeminiErr(msg));
  }

  const cand = json.candidates?.[0];
  const reason = cand?.finishReason ?? "";
  if (/SAFETY|RECITATION|BLOCKLIST|PROHIBITED/i.test(reason)) {
    throw new Error(
      "התוכן נחסם על ידי Gemini (מדיניות בטיחות) — נסי הנחיה אחרת."
    );
  }

  const parts = cand?.content?.parts;
  const img = firstImageFromParts(parts);
  if (img) {
    return `data:${img.mime};base64,${img.data}`;
  }

  throw new Error(
    "Gemini החזיר תשובה בלי תמונה — נסי מודל תמונה (למשל gemini-2.5-flash-image או gemini-3-pro-image-preview ב-GEMINI_IMAGE_MODEL), או הנחיה ברורה יותר."
  );
}
