import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { VintageDivider } from "@/components/ui/VintageDivider";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-5 py-12 text-center">
      <Logo size="lg" />

      <div className="mt-10 w-full">
        <VintageDivider label="404" />
      </div>

      <h1 className="mt-6 font-display text-4xl font-semibold text-eggplant">
        העמוד לא נמצא
      </h1>
      <p className="mt-3 text-ink-soft">
        הקישור אולי פג, או שהדף עדיין לא נבנה. נסו לחזור לדף הבית.
      </p>

      <ButtonLink href="/" className="mt-8">
        חזרה לדף הבית
      </ButtonLink>
    </main>
  );
}
