import Link from "next/link";
import {
  ArrowLeft,
  ScanLine,
  Sparkles,
  Link2,
  Layers,
  Heart,
  Truck,
} from "lucide-react";

import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { VintageDivider } from "@/components/ui/VintageDivider";
import { getWhatsAppChatUrl } from "@/lib/whatsapp";

export default function HomePage() {
  const whatsappHref = getWhatsAppChatUrl();

  return (
    <main className="relative overflow-hidden">
      <BackdropArt />
      <SiteHeader whatsappHref={whatsappHref} />
      <Hero />
      <Process />
      <Features />
      <Closing whatsappHref={whatsappHref} />
      <SiteFooter />
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  כותרת / ניווט                                                             */
/* -------------------------------------------------------------------------- */

function SiteHeader({ whatsappHref }: { whatsappHref: string | null }) {
  return (
    <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
      <Link href="/" aria-label="Echo - דף הבית">
        <Logo size="md" />
      </Link>

      <nav className="flex items-center gap-4 sm:gap-5" aria-label="ניווט ראשי">
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-ink-soft hover:text-eggplant transition-colors"
          >
            צור קשר
          </a>
        ) : (
          <span className="text-sm text-ink-muted" title="יוגדר ב-.env.local">
            צור קשר
          </span>
        )}
        <ButtonLink
          href="/login"
          variant="primary"
          size="sm"
          endIcon={<ArrowLeft className="h-4 w-4" />}
        >
          כניסה לאלבום שלי
        </ButtonLink>
      </nav>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero                                                                      */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative mx-auto max-w-6xl px-5 pt-10 pb-20 sm:pt-16 sm:pb-28">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-cream-200 border border-eggplant/10 px-3 py-1 text-xs text-eggplant">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            סטודיו פרטי לזיכרונות משפחתיים · חיפה
          </span>

          <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight text-eggplant">
            הזיכרונות
            <br />
            ממשיכים <em className="text-gold-500">להדהד</em>.
          </h1>

          <p className="mt-5 max-w-lg text-lg text-ink-soft leading-relaxed">
            אנחנו הופכים את הקופסאות הישנות, האלבומים המאובקים והתמונות הדהויות
            לאלבום משפחתי דיגיטלי — מסודר, יפה ובטוח. כל תמונה מקבלת מספר, סיפור
            ומקום.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink
              href="/login"
              size="lg"
              endIcon={<ArrowLeft className="h-5 w-5" />}
            >
              כניסה לאלבום שלי
            </ButtonLink>
          </div>

          <p className="mt-5 text-xs text-ink-muted">
            איסוף ביתי באזור הצפון · משלוח דואר רשום · תשלום ב-Bit / העברה / מזומן
          </p>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto h-[26rem] w-full max-w-md">
      {/* כרטיס תמונה ראשי */}
      <div className="absolute right-0 top-2 h-72 w-56 rotate-[-6deg] rounded-2xl bg-white p-3 shadow-soft border border-eggplant/10">
        <div className="h-full w-full rounded-lg bg-gradient-to-br from-cream-300 via-gold-200 to-eggplant/30" />
        <p className="mt-2 text-center text-[10px] font-mono text-ink-muted">
          #001 · 1962
        </p>
      </div>

      {/* כרטיס שני */}
      <div className="absolute left-2 top-12 h-72 w-56 rotate-[5deg] rounded-2xl bg-white p-3 shadow-soft border border-eggplant/10">
        <div className="h-full w-full rounded-lg bg-gradient-to-tl from-eggplant/20 via-cream-300 to-gold-100" />
        <p className="mt-2 text-center text-[10px] font-mono text-ink-muted">
          #042 · חתונה 1985
        </p>
      </div>

      {/* תג זהב */}
      <div className="absolute -bottom-4 right-8 rounded-full bg-eggplant text-cream px-4 py-2 shadow-soft text-xs font-medium border border-gold-300/40">
        <span className="font-display text-gold-200">★</span>{" "}
        מסומן כסיפור משפחתי
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  התהליך                                                                    */
/* -------------------------------------------------------------------------- */

function Process() {
  const steps = [
    { n: "01", title: "איסוף", desc: "אוספים את התמונות מהבית או בדואר רשום." },
    { n: "02", title: "סריקה", desc: "סריקה באיכות גבוהה, מספור עוקב וסידור." },
    { n: "03", title: "סיפור", desc: "מוסיפים שמות, תאריכים והסיפורים שמאחורי כל תמונה." },
    { n: "04", title: "אלבום דיגיטלי", desc: "גלריה אישית מוגנת סיסמה, להורדה ולשיתוף." },
  ];

  return (
    <section className="relative bg-white/60 py-20 border-y border-eggplant/10">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-10 max-w-2xl">
          <VintageDivider label="איך זה עובד" />
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-semibold text-eggplant">
            ארבעה שלבים פשוטים, חוויה אחת בלתי נשכחת.
          </h2>
        </div>

        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li
              key={s.n}
              className="card p-6 hover:shadow-md transition-shadow"
            >
              <span className="font-display text-3xl text-gold-500">{s.n}</span>
              <h3 className="mt-3 text-lg font-semibold text-eggplant">
                {s.title}
              </h3>
              <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">
                {s.desc}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  פיצ'רים                                                                   */
/* -------------------------------------------------------------------------- */

function Features() {
  const features = [
    {
      icon: ScanLine,
      title: "סורק חכם",
      desc: "חיתוך 4 פינות, יישור פרספקטיבה, ושמירה מסודרת באלבום.",
    },
    {
      icon: Sparkles,
      title: "שחזור AI",
      desc: "תמונות פגומות, שרוטות או דהויות חוזרות לחיים בעדינות.",
    },
    {
      icon: Layers,
      title: "פלשקרדס",
      desc: "תמונה בצד אחד, סיפור ושמות בצד השני - חוויה אינטראקטיבית.",
    },
    {
      icon: Link2,
      title: "קישור אישי",
      desc: "כל אלבום זמין בקישור ייחודי עם קוד — רק מי שמקבל את הקישור נכנס.",
    },
    {
      icon: Heart,
      title: "סיפור משפחתי",
      desc: "מספור עוקב, שמות, תאריכים - אלבום מסודר עם רוח של ספר.",
    },
    {
      icon: Truck,
      title: "לוגיסטיקה דואגת",
      desc: "איסוף בבית או דואר רשום עם ביטוח, החזרה בטוחה של המקור.",
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="mb-10 max-w-2xl">
        <VintageDivider label="מה אנחנו עושים" />
        <h2 className="mt-4 font-display text-3xl sm:text-4xl font-semibold text-eggplant">
          לא רק סריקה — אלבום שמרגיש כמו סיפור.
        </h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <article
            key={title}
            className="card p-6 hover:shadow-md transition-shadow"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-eggplant/10 text-eggplant">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-eggplant">{title}</h3>
            <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">{desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  סיום                                                                      */
/* -------------------------------------------------------------------------- */

function Closing({ whatsappHref }: { whatsappHref: string | null }) {
  return (
    <section className="relative">
      <div className="mx-auto max-w-4xl px-5 py-20 text-center">
        <VintageDivider />
        <h2 className="mt-6 font-display text-3xl sm:text-4xl font-semibold text-eggplant">
          מוכנים להתחיל?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-soft leading-relaxed">
          אם כבר יש לכם קוד פרויקט — הכניסו אותו בכניסה לאלבום. רוצים לשמור
          זיכרונות דרכנו? שלחו הודעה.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink
            href="/login"
            size="lg"
            endIcon={<ArrowLeft className="h-5 w-5" />}
          >
            כניסה לאלבום שלי
          </ButtonLink>
          {whatsappHref ? (
            <ButtonLink
              href={whatsappHref}
              variant="gold"
              size="lg"
              target="_blank"
              rel="noreferrer"
            >
              שלחו הודעה ב-WhatsApp
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  פוטר                                                                      */
/* -------------------------------------------------------------------------- */

function SiteFooter() {
  return (
    <footer className="border-t border-eggplant/10 bg-cream-200/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-8">
        <div className="flex w-full flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo size="sm" />
          <p className="text-xs text-ink-muted text-center sm:text-left">
            © {new Date().getFullYear()} Echo Studio · חיפה · כל הזכויות שמורות.
          </p>
        </div>
        <div className="w-full border-t border-eggplant/5 pt-4 text-center">
          <Link
            href="/login?studio=1"
            className="text-[10px] tracking-wide text-ink-muted/50 hover:text-ink-muted/70 transition-colors"
          >
            כניסת סטודיו
          </Link>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*  רקע                                                                        */
/* -------------------------------------------------------------------------- */

function BackdropArt() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-0 h-[36rem] w-[36rem] rounded-full bg-gold-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[40rem] -left-40 h-[40rem] w-[40rem] rounded-full bg-eggplant/10 blur-3xl"
      />
    </>
  );
}
