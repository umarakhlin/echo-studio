import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // לוח הצבעים של Echo — מסלול קלאסי-וינטג' (PLAN.md)
        eggplant: {
          DEFAULT: "#4A2545", // חצילי עמוק - סגול עיקרי
          50: "#F4ECF1",
          100: "#E5D4DF",
          200: "#C9A5BD",
          300: "#A8769A",
          400: "#874F76",
          500: "#6A3760",
          600: "#4A2545",
          700: "#3B1D38",
          800: "#2C162A",
          900: "#1E0F1D",
        },
        cream: {
          DEFAULT: "#FAF7F2", // קרם חמים - רקע
          50: "#FFFFFE",
          100: "#FAF7F2",
          200: "#F2EDE3",
          300: "#E6DDCB",
          400: "#D2C3A6",
          500: "#B8A37E",
        },
        ink: {
          DEFAULT: "#2A1F2D", // חום-שחור רך - טקסט
          soft: "#4B3D4F",
          muted: "#7A6B7E",
        },
        gold: {
          DEFAULT: "#C9A961", // זהב עתיק - דגשים
          50: "#FBF5E5",
          100: "#F1E4B7",
          200: "#E5D094",
          300: "#D8BB72",
          400: "#C9A961",
          500: "#B0904A",
          600: "#8B6F36",
          700: "#665023",
        },
      },
      fontFamily: {
        sans: ["var(--font-heebo)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(42, 31, 45, 0.06), 0 8px 24px rgba(42, 31, 45, 0.08)",
        glow: "0 0 0 4px rgba(201, 169, 97, 0.18)",
        inset: "inset 0 1px 0 rgba(255, 255, 255, 0.5)",
      },
      backgroundImage: {
        "vintage-paper":
          "radial-gradient(1200px 600px at 10% -10%, rgba(201,169,97,0.10), transparent 60%), radial-gradient(900px 500px at 100% 110%, rgba(74,37,69,0.08), transparent 55%)",
        "echo-grain":
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.16 0 0 0 0 0.12 0 0 0 0 0.18 0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
