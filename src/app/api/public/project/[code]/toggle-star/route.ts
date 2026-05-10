import { NextResponse } from "next/server";

import * as cloud from "@/lib/cloud/supabaseRepository";
import { formatCloudRouteError } from "@/lib/cloud/routeErrors";
import { getDataBackendMode } from "@/lib/data-backend";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  if (getDataBackendMode() !== "cloud") {
    return NextResponse.json(
      { error: "מצב ענן לא פעיל." },
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

    const updated = await cloud.cloudToggleStarPhoto(photoId);
    return NextResponse.json({
      photo: {
        id: updated.id,
        starred: updated.starred,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (e) {
    const msg = formatCloudRouteError(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
