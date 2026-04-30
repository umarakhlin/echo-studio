"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserRound } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardHeader,
  CardSubtitle,
  CardTitle,
} from "@/components/ui/Card";
import { VintageDivider } from "@/components/ui/VintageDivider";

const ClientLoginForm = dynamic(
  () => import("./ClientLoginForm"),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center py-10 text-sm text-ink-muted">
        טוען טופס…
      </div>
    ),
  }
);

type Mode = "client" | "admin";

interface LoginCardProps {
  /** כניסת סטודיו — מגיע מ-`?studio=1` */
  initialStudio?: boolean;
}

/**
 * כניסת לקוח: רק קוד פרויקט (הקישור כולל את הקוד בנתיב `/album/CODE`).
 * כניסת סטודיו: דרך `?studio=1` או קישור דיסקרטי בתחתית הכרטיס.
 */
export function LoginCard({ initialStudio = false }: LoginCardProps) {
  const [mode, setMode] = useState<Mode>(initialStudio ? "admin" : "client");

  useEffect(() => {
    setMode(initialStudio ? "admin" : "client");
  }, [initialStudio]);

  return (
    <Card className="w-full max-w-md p-7 sm:p-8 animate-fade-up">
      <CardHeader className="items-center text-center">
        <CardTitle>
          {mode === "client" ? "כניסה לאלבום" : "כניסת סטודיו"}
        </CardTitle>
        <CardSubtitle>
          {mode === "client"
            ? "הזיני את קוד הפרויקט שקיבלת מ-Echo"
            : "גישה ללוח הניהול (לצוות הסטודיו בלבד)"}
        </CardSubtitle>
      </CardHeader>

      <div className="mt-6">
        {mode === "client" ? <ClientLoginForm /> : <AdminLoginForm />}
      </div>

      <div className="mt-7">
        <VintageDivider label="Echo · אקו" />
      </div>

      {mode === "client" ? (
        <p className="mt-6 text-center text-xs text-ink-muted leading-relaxed">
          הקוד מזהה את האלבום שלכם — שמרו על הקישור אישי.
        </p>
      ) : (
        <p className="mt-6 text-center text-xs text-ink-muted leading-relaxed">
          כניסה לצוות שקיבל שם משתמש וסיסמה מהסטודיו. אותו לוח ניהול לכולם.
        </p>
      )}

      <div className="mt-6 flex flex-col items-center gap-2 border-t border-eggplant/10 pt-5">
        {mode === "client" ? (
          <Link
            href="/login?studio=1"
            className="text-[11px] text-ink-muted/80 hover:text-eggplant transition-colors"
          >
            כניסת סטודיו
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted/80 hover:text-eggplant transition-colors"
          >
            <UserRound className="h-3 w-3" />
            כניסה לאלבום (לקוחות)
          </Link>
        )}
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  טופס אדמין                                                                */
/* -------------------------------------------------------------------------- */

function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const user = username.trim();
    if (user.length < 2) {
      setError("שם המשתמש חייב להיות לפחות 2 תווים.");
      return;
    }
    if (password.length < 6) {
      setError("הסיסמה חייבת להיות באורך 6 תווים לפחות.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/studio-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "הכניסה נכשלה.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("שגיאת רשת — נסי שוב.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="mb-1 flex items-center justify-center gap-2 text-ink-muted">
        <ShieldCheck className="h-4 w-4" />
        <span className="text-xs">למורשי סטודיו בלבד</span>
      </div>
      <Input
        label="שם משתמש"
        type="text"
        placeholder="למשל: sara"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        startIcon={<UserRound className="h-4 w-4" />}
        hint="אנגלית קטנה, מספרים או _ — כפי שניתן לך מהסטודיו."
        dir="ltr"
      />

      <Input
        label="סיסמה"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        dir="ltr"
      />

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading} fullWidth size="lg" variant="primary">
        כניסה ללוח הניהול
      </Button>
    </form>
  );
}
