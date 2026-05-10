import { NextResponse } from "next/server";

import { upscaleWithRealEsrgan } from "@/lib/ai/replicateRealEsrgan";
import * as cloud from "@/lib/cloud/supabaseRepository";
import { getDataBackendMode } from "@/lib/data-backend";

export const runtime = "nodejs";
/** Real-ESRGAN יכול לקחת עד דקה — תואם ל־Vercel Pro; בהובי אולי יספיק Partial wait + poll. */
export const maxDuration = 120;

function assertTrustedImageUrl(url: string) {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error("כתובת תמונה לא תקינה.");
  }
  if (u.protocol !== "https:") {
    throw new Error("נדרש קישור HTTPS לתמונה.");
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (base) {
    const host = new URL(base).hostname;
    if (u.hostname !== host) {
      throw new Error("התמונה אינה ממאגר הסטודיו.");
    }
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  if (getDataBackendMode() !== "cloud") {
    return NextResponse.json(
      { error: "שיפור AI זמין במצב ענן בלבד." },
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

  const photoId =
    typeof body === "object" &&
    body !== null &&
    "photoId" in body &&
    typeof (body as { photoId: unknown }).photoId === "string"
      ? (body as { photoId: string }).photoId
      : null;

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

    assertTrustedImageUrl(imageUrl);

    const enhancedUrl = await upscaleWithRealEsrgan(imageUrl);
    return NextResponse.json({ enhancedUrl });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "שגיאה בעיבוד התמונה. נסי שוב מאוחר יותר.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
