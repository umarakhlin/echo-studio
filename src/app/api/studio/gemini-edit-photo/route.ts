import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { geminiEditImageFromUrl } from "@/lib/ai/geminiEditImage";
import * as cloud from "@/lib/cloud/supabaseRepository";
import { assertTrustedPhotoImageUrl } from "@/lib/cloud/trustedImageUrl";
import { getDataBackendMode } from "@/lib/data-backend";
import {
  STUDIO_SESSION_COOKIE,
  verifyStudioSessionToken,
} from "@/lib/studio-auth";

export const runtime = "nodejs";
export const maxDuration = 120;

async function requireStudio(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(STUDIO_SESSION_COOKIE)?.value;
  return verifyStudioSessionToken(token) != null;
}

export async function POST(req: Request) {
  if (getDataBackendMode() !== "cloud") {
    return NextResponse.json(
      { error: "עריכת Gemini זמינה במצב ענן בלבד." },
      { status: 503 }
    );
  }
  if (!(await requireStudio())) {
    return NextResponse.json({ error: "נדרשת כניסת סטודיו." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "גוף לא תקין." }, { status: 400 });
  }

  const rec = body as Record<string, unknown>;
  const photoId = typeof rec.photoId === "string" ? rec.photoId : null;
  const prompt = typeof rec.prompt === "string" ? rec.prompt : "";

  if (!photoId?.trim()) {
    return NextResponse.json({ error: "חסר מזהה תמונה." }, { status: 400 });
  }

  try {
    const photo = await cloud.cloudGetPhoto(photoId);
    if (!photo) {
      return NextResponse.json({ error: "לא נמצאה תמונה." }, { status: 404 });
    }

    const imageUrl = photo.displayUrl?.trim();
    if (!imageUrl) {
      return NextResponse.json(
        { error: "אין כתובת תצוגה מלאה לתמונה זו." },
        { status: 400 }
      );
    }

    assertTrustedPhotoImageUrl(imageUrl);

    const editedUrl = await geminiEditImageFromUrl(imageUrl, prompt);
    return NextResponse.json({ editedUrl });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "שגיאה בעריכת התמונה. נסי שוב מאוחר יותר.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
