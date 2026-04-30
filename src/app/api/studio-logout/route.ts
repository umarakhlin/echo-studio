import { NextResponse } from "next/server";

import { STUDIO_SESSION_COOKIE } from "@/lib/studio-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const base = `${u.protocol}//${u.host}`;
  const res = NextResponse.redirect(new URL("/login?studio=1", base));
  res.cookies.set(STUDIO_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
