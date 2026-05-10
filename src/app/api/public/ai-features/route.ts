import { NextResponse } from "next/server";

import { getDataBackendMode } from "@/lib/data-backend";

export const runtime = "nodejs";

/**
 * מידע לא UI (ללא סודות): האם שיפור AI באלבום הוגדר בשרת.
 */
export async function GET() {
  if (getDataBackendMode() !== "cloud") {
    return NextResponse.json({ albumAiEnhance: false });
  }
  const hf = process.env.HUGGINGFACE_API_TOKEN?.trim();
  const rep = process.env.REPLICATE_API_TOKEN?.trim();
  const configured = Boolean(rep || hf);
  return NextResponse.json({ albumAiEnhance: configured });
}
