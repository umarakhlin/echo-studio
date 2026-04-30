import { NextResponse } from "next/server";

import {
  createStudioSessionToken,
  STUDIO_SESSION_COOKIE,
  verifyStudioCredentials,
} from "@/lib/studio-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "בקשה לא תקינה." },
      { status: 400 }
    );
  }

  const username =
    typeof body === "object" &&
    body !== null &&
    "username" in body &&
    typeof (body as { username: unknown }).username === "string"
      ? (body as { username: string }).username
      : "";
  const password =
    typeof body === "object" &&
    body !== null &&
    "password" in body &&
    typeof (body as { password: unknown }).password === "string"
      ? (body as { password: string }).password
      : "";

  const auth = verifyStudioCredentials(username, password);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const token = createStudioSessionToken(auth.username);
  if (!token) {
    return NextResponse.json(
      { error: "שגיאת שרת — חסר מפתח סשן (STUDIO_SESSION_SECRET)." },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ ok: true });
  const maxAge = 7 * 24 * 60 * 60;
  res.cookies.set(STUDIO_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}
