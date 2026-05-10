import { NextResponse } from "next/server";

import * as cloud from "@/lib/cloud/supabaseRepository";
import { formatCloudRouteError } from "@/lib/cloud/routeErrors";
import { getDataBackendMode } from "@/lib/data-backend";
import {
  STUDIO_SESSION_COOKIE,
  verifyStudioSessionToken,
} from "@/lib/studio-auth";
import { cookies } from "next/headers";

export const runtime = "nodejs";

async function requireStudio(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(STUDIO_SESSION_COOKIE)?.value;
  return verifyStudioSessionToken(token) != null;
}

export async function POST(req: Request) {
  if (getDataBackendMode() !== "cloud") {
    return NextResponse.json({ error: "מצב הענן לא פעיל." }, { status: 400 });
  }
  if (!(await requireStudio())) {
    return NextResponse.json({ error: "נדרשת כניסת סטודיו." }, { status: 401 });
  }

  let body: { op?: string; payload?: unknown };
  try {
    body = (await req.json()) as { op?: string; payload?: unknown };
  } catch {
    return NextResponse.json({ error: "גוף לא תקין." }, { status: 400 });
  }
  const op = body.op;
  const p = (body.payload ?? {}) as Record<string, unknown>;

  try {
    switch (op) {
      case "listClients":
        return NextResponse.json(await cloud.cloudListClients());
      case "getClient":
        return NextResponse.json(await cloud.cloudGetClient(p.id as string));
      case "createClient":
        return NextResponse.json(
          await cloud.cloudCreateClient(p.input as Parameters<typeof cloud.cloudCreateClient>[0])
        );
      case "updateClient":
        return NextResponse.json(
          await cloud.cloudUpdateClient(p.id as string, p.patch as Record<string, unknown>)
        );
      case "deleteClient":
        await cloud.cloudDeleteClient(p.id as string);
        return NextResponse.json({ ok: true });

      case "listProjects":
        return NextResponse.json(await cloud.cloudListProjects());
      case "listProjectsByClient":
        return NextResponse.json(
          await cloud.cloudListProjectsByClient(p.clientId as string)
        );
      case "getProject":
        return NextResponse.json(await cloud.cloudGetProject(p.id as string));
      case "createProject":
        return NextResponse.json(
          await cloud.cloudCreateProject(
            p.input as Parameters<typeof cloud.cloudCreateProject>[0]
          )
        );
      case "updateProject":
        return NextResponse.json(
          await cloud.cloudUpdateProject(p.id as string, p.patch as Record<string, unknown>)
        );
      case "setProjectStatus":
        return NextResponse.json(
          await cloud.cloudSetProjectStatus(p.id as string, p.status as Parameters<typeof cloud.cloudSetProjectStatus>[1])
        );
      case "deleteProject":
        await cloud.cloudDeleteProject(p.id as string);
        return NextResponse.json({ ok: true });

      case "listAlbumsByProject":
        return NextResponse.json(
          await cloud.cloudListAlbumsByProject(p.projectId as string)
        );
      case "getAlbum":
        return NextResponse.json(await cloud.cloudGetAlbum(p.id as string));
      case "createAlbum":
        return NextResponse.json(
          await cloud.cloudCreateAlbum(
            p.input as Parameters<typeof cloud.cloudCreateAlbum>[0]
          )
        );
      case "updateAlbum":
        return NextResponse.json(
          await cloud.cloudUpdateAlbum(p.id as string, p.patch as Record<string, unknown>)
        );
      case "deleteAlbum":
        await cloud.cloudDeleteAlbum(p.id as string);
        return NextResponse.json({ ok: true });
      case "ensureDefaultAlbum":
        return NextResponse.json(
          await cloud.cloudEnsureDefaultAlbum(p.projectId as string)
        );

      case "listPhotosByAlbum":
        return NextResponse.json(
          await cloud.cloudListPhotosByAlbum(p.albumId as string)
        );
      case "listPhotosByProject":
        return NextResponse.json(
          await cloud.cloudListPhotosByProject(p.projectId as string)
        );
      case "getPhoto":
        return NextResponse.json(await cloud.cloudGetPhoto(p.id as string));
      case "updatePhoto":
        return NextResponse.json(
          await cloud.cloudUpdatePhoto(p.id as string, p.patch as Record<string, unknown>)
        );
      case "toggleStarPhoto":
        return NextResponse.json(await cloud.cloudToggleStarPhoto(p.id as string));
      case "deletePhoto":
        await cloud.cloudDeletePhoto(p.id as string);
        return NextResponse.json({ ok: true });
      case "reorderPhotos":
        await cloud.cloudReorderPhotos(
          p.albumId as string,
          p.orderedIds as string[]
        );
        return NextResponse.json({ ok: true });

      case "getDashboardStats":
        return NextResponse.json(await cloud.cloudGetDashboardStats());

      default:
        return NextResponse.json({ error: `op לא ידוע: ${op}` }, { status: 400 });
    }
  } catch (e) {
    const msg = formatCloudRouteError(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
