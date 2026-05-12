import { NextResponse } from "next/server";

import { geminiEditImageFromUrl } from "@/lib/ai/geminiEditImage";
import * as cloud from "@/lib/cloud/supabaseRepository";
import { assertTrustedPhotoImageUrl } from "@/lib/cloud/trustedImageUrl";
import { getDataBackendMode } from "@/lib/data-backend";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  if (getDataBackendMode() !== "cloud") {
    return NextResponse.json(
      { error: "עריכת Gemini זמינה במצב ענן בלבד." },
      { status: 503 }
    );
  }

  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

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
    const project = await cloud.cloudGetProjectByCode(code);
    if (!project) {
      return NextResponse.json({ error: "לא נמצא." }, { status: 404 });
    }

    const photo = await cloud.cloudGetPhoto(photoId);
    if (!photo || photo.projectId !== project.id) {
      return NextResponse.json({ error: "אסור." }, { status: 403 });
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
