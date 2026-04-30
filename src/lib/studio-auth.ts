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

/**
 * משתמשי סטודיו ממחרוזת JSON אחת (מומלץ ב-Vercel — כל שם חדש בלי שינוי קוד).
 * דוגמה: STUDIO_USERS={"uma":"הסיסמה","noa_klein":"אחרת"}
 */
function studioUsersFromJson(): Map<string, string> {
  const raw = process.env.STUDIO_USERS?.trim();
  const map = new Map<string, string>();
  if (!raw) return map;
  try {
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return map;
    for (const [k, val] of Object.entries(obj)) {
      const user = normalizeStudioUsername(k);
      if (user && typeof val === "string" && val.trim().length >= 6) {
        map.set(user, val.trim());
      }
    }
  } catch {
    /* פורמט לא תקין — מתעלמים */
  }
  return map;
}

/**
 * סיסמה לפי STUDIO_USER_<שם> ב-.env.
 * ב-Next.js גישה מסוג process.env[מפתח_דינמי] לא נטענת בפרודקשן אחרי build —
 * לכן כל משתמש legacy חייב case מפורש או STUDIO_USERS למעלה.
 */
function legacyStudioPasswordFromExplicitEnv(
  normalizedUsername: string
): string | null {
  const pick = (s: string | undefined) =>
    s != null && String(s).trim() !== "" ? String(s).trim() : null;

  switch (normalizedUsername.toUpperCase()) {
    case "UMA":
      return pick(process.env.STUDIO_USER_UMA);
    case "STUDIO":
      return pick(process.env.STUDIO_USER_STUDIO);
    case "SARA":
      return pick(process.env.STUDIO_USER_SARA);
    case "NOA":
      return pick(process.env.STUDIO_USER_NOA);
    case "NOA_KLEIN":
      return pick(process.env.STUDIO_USER_NOA_KLEIN);
    default:
      return null;
  }
}

/** סיסמה כפי שב-STUDIO_USERS או ב-STUDIO_USER_* (מפורש בקוד) */
export function getStudioPasswordForUser(normalizedUsername: string): string | null {
  const fromJson = studioUsersFromJson().get(normalizedUsername);
  if (fromJson) return fromJson;
  return legacyStudioPasswordFromExplicitEnv(normalizedUsername);
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
