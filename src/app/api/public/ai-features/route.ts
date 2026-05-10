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
  const configured = Boolean(
    process.env.HUGGINGFACE_API_TOKEN?.trim() ||
      process.env.REPLICATE_API_TOKEN?.trim()
  );
  return NextResponse.json({ albumAiEnhance: configured });
}
