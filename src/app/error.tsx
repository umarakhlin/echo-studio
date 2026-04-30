"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";

/**
 * מסך שגיאה — מונע "דף לבן" ללא הודעה כשקריסה בצד הלקוח.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Echo app error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-5 py-12 text-center">
      <h1 className="font-display text-2xl font-semibold text-eggplant">משהו השתבש</h1>
      <p className="text-sm text-ink-soft">
        {error.message || "אירעה שגיאה בטעינת העמוד. נסי לרענן או לחזור לדף הבית."}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={() => reset()}>
          נסי שוב
        </Button>
        <ButtonLink href="/" variant="secondary">
          לדף הבית
        </ButtonLink>
      </div>
    </div>
  );
}
