"use client";

/**
 * תפיסת שגיאות ברמת השורש (כש-error.tsx של עמוד לא מספיק).
 * מכיל <html> ו־<body> — נדרש לפי Next.js.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#FAF7F2",
          color: "#2A1F2D",
        }}
      >
        <div style={{ textAlign: "center", padding: 24, maxWidth: 400 }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: 12 }}>Echo — שגיאה קריטית</h1>
          <p style={{ fontSize: 14, opacity: 0.85, marginBottom: 20 }}>
            {error.message || "אירעה שגיאה. נסי לרענן את הדף."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              background: "#4A2545",
              color: "#FAF7F2",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            נסי שוב
          </button>
        </div>
      </body>
    </html>
  );
}
