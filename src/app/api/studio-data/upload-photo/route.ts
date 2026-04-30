import { NextResponse } from "next/server";

import * as cloud from "@/lib/cloud/supabaseRepository";
import { getDataBackendMode } from "@/lib/data-backend";
import {
  STUDIO_SESSION_COOKIE,
  verifyStudioSessionToken,
} from "@/lib/studio-auth";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (getDataBackendMode() !== "cloud") {
    return NextResponse.json({ error: "מצב הענן לא פעיל." }, { status: 400 });
  }
  const jar = await cookies();
  const token = jar.get(STUDIO_SESSION_COOKIE)?.value;
  if (!verifyStudioSessionToken(token)) {
    return NextResponse.json({ error: "נדרשת כניסת סטודיו." }, { status: 401 });
  }

  const form = await req.formData();
  const replacePhotoId = form.get("replacePhotoId") as string | null;
  if (replacePhotoId?.trim()) {
    const file = form.get("file") as File | null;
    if (!file?.size) {
      return NextResponse.json({ error: "חסר קובץ להחלפה." }, { status: 400 });
    }
    try {
      const photo = await cloud.cloudReplacePhotoImage({
        photoId: replacePhotoId.trim(),
        file,
      });
      return NextResponse.json(photo);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "החלפה נכשלה.";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  const albumId = form.get("albumId") as string;
  const projectId = form.get("projectId") as string;
  const file = form.get("file") as File | null;
  if (!albumId || !projectId || !file?.size) {
    return NextResponse.json({ error: "חסרים albumId, projectId או קובץ." }, { status: 400 });
  }

  try {
    const photo = await cloud.cloudUploadPhoto({ albumId, projectId, file });
    return NextResponse.json(photo);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "העלאה נכשלה.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
