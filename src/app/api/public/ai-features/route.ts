import { NextResponse } from "next/server";

import { getDataBackendMode } from "@/lib/data-backend";

export const runtime = "nodejs";

type DataBackendMode = "local" | "cloud";

/**
 * מידע ל-UI (ללא סודות): תלוי במצב ענן ובהגדרות בשכבת השרת.
 */
export async function GET() {
  const mode = getDataBackendMode() as DataBackendMode;
  const geminiKeyConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
  const hf = process.env.HUGGINGFACE_API_TOKEN?.trim();
  const rep = process.env.REPLICATE_API_TOKEN?.trim();

  const inCloud = mode === "cloud";
  const albumAiEnhance = inCloud && Boolean(rep || hf);
  const albumGeminiEdit = inCloud && geminiKeyConfigured;

  return NextResponse.json({
    dataBackend: mode,
    geminiKeyConfigured,
    albumAiEnhance,
    albumGeminiEdit,
  });
}
