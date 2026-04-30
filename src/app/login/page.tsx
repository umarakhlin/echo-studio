import type { Metadata } from "next";
import Link from "next/link";
import { LoginCard } from "@/components/auth/LoginCard";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = {
  title: "התחברות",
  description: "כניסה ל-Echo — סטודיו לשימור זיכרונות משפחתיים.",
};

interface LoginPageProps {
  searchParams: Promise<{ studio?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { studio } = await searchParams;
  const initialStudio = studio === "1";

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* רקע וינטג': זוהר זהב + כתם חצילי + טקסטורה עדינה */}
      <BackdropArt />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-5 py-12">
        <header className="mb-10 flex flex-col items-center text-center">
          <Link
            href="/"
            className="mb-6 transition-transform duration-300 hover:scale-[1.02]"
            aria-label="חזרה לעמוד הבית של Echo"
          >
            <Logo size="lg" />
          </Link>
          <p className="font-display italic text-ink-soft">
            הזיכרונות ממשיכים להדהד
          </p>
        </header>

        <LoginCard initialStudio={initialStudio} />

        <footer className="mt-10 text-center text-xs text-ink-muted">
          <p>
            עדיין אין לך אלבום?{" "}
            <Link
              href="/"
              className="font-medium text-eggplant underline-offset-4 hover:underline"
            >
              גלו את השירות שלנו
            </Link>
          </p>
          <p className="mt-2">© Echo Studio · חיפה</p>
        </footer>
      </div>
    </main>
  );
}

function BackdropArt() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-gold-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 h-[32rem] w-[32rem] rounded-full bg-eggplant/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-echo-grain opacity-50 mix-blend-multiply"
      />
    </>
  );
}
