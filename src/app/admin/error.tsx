"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/Button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-5 text-center">
      <p className="font-display text-xl font-semibold text-eggplant">
        משהו השתבש בלוח הניהול
      </p>
      <p className="mt-3 text-sm text-ink-soft leading-relaxed">
        אחרי עדכון לאתר, לפעמים דפדפן ישן מחזיק לגרסה ישנה של הקוד. נסי רענון
        קשיח ({" "}
        <span dir="ltr" className="font-mono text-xs">
          ⌘⇧R
        </span>{" "}
        במק) או סגירת הטאב ופתיחת האתר מחדש.
      </p>
      {error?.message && (
        <details className="mt-4 max-w-full text-right">
          <summary className="cursor-pointer text-xs text-ink-muted">
            פרטי שגיאה (לדיווח)
          </summary>
          <p
            className="mt-2 break-words rounded-lg bg-cream-200 px-3 py-2 text-xs text-ink-muted font-mono"
            dir="ltr"
            title={error.message}
          >
            {error.name && error.name !== "Error" ? `${error.name}: ` : ""}
            {error.message}
          </p>
          {error.stack && (
            <pre
              className="mt-2 max-h-40 max-w-full overflow-auto break-all rounded-lg bg-white/80 px-3 py-2 text-[10px] text-ink-muted"
              dir="ltr"
            >
              {error.stack}
            </pre>
          )}
        </details>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          נסי שוב
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => window.location.reload()}
        >
          רענון מלא
        </Button>
      </div>
    </div>
  );
}
