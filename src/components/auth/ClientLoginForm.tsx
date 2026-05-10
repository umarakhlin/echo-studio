"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { readLastAlbumProjectCode, writeLastAlbumProjectCode } from "@/lib/album-last-code";
import { getWhatsAppChatUrl } from "@/lib/whatsapp";
import { getProjectByCode } from "@/lib/db";

/**
 * טופס כניסת לקוח — בקובץ נפרד כדי שלא ייטען מודול IndexedDB כשלא נכנסים ממצב זה
 * (למשל כניסת סטודיו בלבד).
 */
export default function ClientLoginForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const wa = getWhatsAppChatUrl();

  useEffect(() => {
    const saved = readLastAlbumProjectCode();
    if (saved) setCode(saved);
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode.length < 4) {
      setError("קוד הפרויקט חייב להיות לפחות 4 תווים.");
      return;
    }

    try {
      setLoading(true);
      const project = await getProjectByCode(trimmedCode);
      if (!project) {
        setError(
          "הקוד אינו תואם לפרויקט קיים. בדקו את המכתב או בקשי עזרה ב-WhatsApp."
        );
        return;
      }
      writeLastAlbumProjectCode(project.code);
      router.push(`/album/${encodeURIComponent(project.code)}`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : "שגיאה בכניסה.";
      setError(message || "שגיאה בכניסה.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label="קוד הפרויקט"
        placeholder="למשל: XXXX-1234"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoComplete="off"
        startIcon={<KeyRound className="h-4 w-4" />}
        hint="נשמר אוטומטית אחרי כניסה מוצלחת במכשיר הזה. אפשר גם להעתיק מההודעה ב-WhatsApp."
        dir="ltr"
        className="font-mono tracking-wider text-center"
      />

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading} fullWidth size="lg">
        כניסה לאלבום שלי
      </Button>

      {wa ? (
        <p className="text-center text-xs text-ink-muted">
          צריכים עזרה?{" "}
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-eggplant underline-offset-4 hover:underline"
          >
            שלחי לנו הודעה ב-WhatsApp
          </a>
        </p>
      ) : null}
    </form>
  );
}
