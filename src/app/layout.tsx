import type { Metadata, Viewport } from "next";
import { Heebo, Playfair_Display } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Echo — אקו · סטודיו לשימור זיכרונות משפחתיים",
    template: "%s · Echo",
  },
  description:
    "Echo / אקו — סטודיו לדיגיטציה ושיקום אלבומי משפחה. סורקים, משחזרים ומספרים את הסיפור המשפחתי שלכם.",
  keywords: [
    "Echo",
    "אקו",
    "דיגיטציה",
    "אלבום משפחה",
    "סריקת תמונות",
    "שחזור תמונות",
    "חיפה",
  ],
  authors: [{ name: "Echo Studio" }],
  openGraph: {
    title: "Echo — אקו",
    description: "הזיכרונות ממשיכים להדהד.",
    locale: "he_IL",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF7F2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${playfair.variable}`}>
      {/*
        גיבוי inline: אם Tailwind/CSS לא נטען (למשל cache שבור), בלי זה הדף נראה "רק לבן" ללא קונטקסט
      */}
      <body
        className="min-h-screen antialiased bg-cream text-ink"
        style={{ backgroundColor: "#FAF7F2", color: "#2A1F2D" }}
      >
        {children}
      </body>
    </html>
  );
}
