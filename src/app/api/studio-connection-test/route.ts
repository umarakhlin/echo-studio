import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import * as cloud from "@/lib/cloud/supabaseRepository";
import { getDataBackendMode } from "@/lib/data-backend";
import {
  STUDIO_SESSION_COOKIE,
  verifyStudioSessionToken,
} from "@/lib/studio-auth";

export const runtime = "nodejs";

/**
 * בדיקת חיבור ל-Supabase אחרי כניסת סטודיו — מחזירה מונה לקוחות או הודעת שגיאה מפורשת.
 */
export async function GET() {
  const jar = await cookies();
  const token = jar.get(STUDIO_SESSION_COOKIE)?.value;
  if (!verifyStudioSessionToken(token)) {
    return NextResponse.json({ error: "נדרשת כניסת סטודיו." }, { status: 401 });
  }

  const mode = getDataBackendMode();
  const rawBackend = process.env.NEXT_PUBLIC_DATA_BACKEND?.trim() ?? "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  let supabaseHost: string | null = null;
  try {
    if (url) supabaseHost = new URL(url).hostname;
  } catch {
    supabaseHost = null;
  }
  const hasKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  const base = {
    backendMode: mode,
    env: {
      nextPublicBackendRaw: rawBackend,
      supabaseHost,
      hasServiceRoleKey: hasKey,
    },
  };

  if (mode !== "cloud") {
    return NextResponse.json({
      ...base,
      database: { skipped: true as const, reason: "מצב מקומי — אין ענן." },
    });
  }

  if (!url || !hasKey) {
    return NextResponse.json({
      ...base,
      database: {
        ok: false as const,
        error:
          "חסר בשרת NEXT_PUBLIC_SUPABASE_URL או SUPABASE_SERVICE_ROLE_KEY (בדקי ב-Vercel ו-Redeploy).",
      },
    });
  }

  try {
    const clients = await cloud.cloudListClients();
    return NextResponse.json({
      ...base,
      database: { ok: true as const, clientCount: clients.length },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "שגיאה לא ידועה";
    let hint: string | undefined;
    if (/jwt|invalid.*token|malformed/i.test(msg)) {
      hint =
        "ב-Supabase → Settings → API: נסי את מפתח ה-service_role הישן (JWT שמתחיל ב-eyJ…), לא בהכרח את sb_secret_ אם יש תקלה.";
    }
    return NextResponse.json({
      ...base,
      database: { ok: false as const, error: msg, hint },
    });
  }
}
