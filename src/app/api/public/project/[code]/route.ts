import { NextResponse } from "next/server";

import * as cloud from "@/lib/cloud/supabaseRepository";
import { formatCloudRouteError } from "@/lib/cloud/routeErrors";
import { getDataBackendMode } from "@/lib/data-backend";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  if (getDataBackendMode() !== "cloud") {
    return NextResponse.json({ error: "מצב ענן לא פעיל." }, { status: 503 });
  }
  const { code } = await params;
  const c = code.toUpperCase();
  try {
    const project = await cloud.cloudGetProjectByCode(c);
    if (!project) {
      return NextResponse.json({ error: "לא נמצא." }, { status: 404 });
    }
    const [albums, photos] = await Promise.all([
      cloud.cloudListAlbumsByProject(project.id),
      cloud.cloudListPhotosByProject(project.id),
    ]);
    return NextResponse.json({ project, albums, photos });
  } catch (e) {
    const msg = formatCloudRouteError(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
