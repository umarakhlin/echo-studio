import { createHmac, timingSafeEqual } from "crypto";

/** שם העוגייה — לא לשנות בלי להוציא את כל המשתמשים מהמערכת */
export const STUDIO_SESSION_COOKIE = "echo_studio_session";

const SESSION_DAYS = 7;

function sessionSecret(): string {
  return process.env.STUDIO_SESSION_SECRET ?? "";
}

function secretOk(): boolean {
  return sessionSecret().length >= 16;
}

/** a-z, 0-9, קו תחתון — תואם מפתחות STUDIO_USER_* ב-.env */
export function normalizeStudioUsername(input: string): string | null {
  const t = input.trim().toLowerCase();
  if (t.length < 2 || t.length > 64) return null;
  if (!/^[a-z0-9_]+$/.test(t)) return null;
  return t;
}

/** סיסמה כפי שמוגדרת ב-STUDIO_USER_<שם_באותיות_גדולות> */
export function getStudioPasswordForUser(normalizedUsername: string): string | null {
  const envKey = `STUDIO_USER_${normalizedUsername.toUpperCase()}`;
  const v = process.env[envKey];
  if (!v || !String(v).trim()) return null;
  return String(v);
}

export function verifyStudioCredentials(
  usernameInput: string,
  password: string
): { ok: true; username: string } | { ok: false; reason: string } {
  if (!secretOk()) {
    return {
      ok: false,
      reason: "הגדרות אבטחה חסרות בשרת — פני למנהלת המערכת.",
    };
  }

  const user = normalizeStudioUsername(usernameInput);
  if (!user) {
    return {
      ok: false,
      reason: "שם משתמש לא תקין (אותיות אנגליות קטנות, מספרים ו־_ בלבד).",
    };
  }

  const expected = getStudioPasswordForUser(user);
  if (!expected) {
    return { ok: false, reason: "שם משתמש או סיסמה שגויים." };
  }

  if (password.length < 6) {
    return { ok: false, reason: "סיסמה שגויה." };
  }

  try {
    const a = Buffer.from(password, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) {
      return { ok: false, reason: "שם משתמש או סיסמה שגויים." };
    }
    if (!timingSafeEqual(a, b)) {
      return { ok: false, reason: "שם משתמש או סיסמה שגויים." };
    }
  } catch {
    return { ok: false, reason: "שם משתמש או סיסמה שגויים." };
  }

  return { ok: true, username: user };
}

export function createStudioSessionToken(username: string): string | null {
  if (!secretOk()) return null;
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp }),
    "utf8"
  ).toString("base64url");
  const sig = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

/** מחזיר את שם המשתמש המנורמל אם הטוקן תקף */
export function verifyStudioSessionToken(token: string | undefined): string | null {
  if (!token || !secretOk()) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payload || !sig) return null;

  const expected = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");

  try {
    const ba = Buffer.from(sig, "utf8");
    const bb = Buffer.from(expected, "utf8");
    if (ba.length !== bb.length || !timingSafeEqual(ba, bb)) return null;
  } catch {
    return null;
  }

  try {
    const raw = Buffer.from(payload, "base64url").toString("utf8");
    const data = JSON.parse(raw) as { u?: unknown; exp?: unknown };
    if (typeof data.u !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    return data.u;
  } catch {
    return null;
  }
}
