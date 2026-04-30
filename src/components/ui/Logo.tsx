import { cn } from "@/lib/cn";

type Size = "sm" | "md" | "lg" | "xl";

const sizeMap: Record<Size, { wrapper: string; mark: string; text: string; ring: string }> = {
  sm: {
    wrapper: "gap-2",
    mark: "h-7 w-7",
    text: "text-lg",
    ring: "ring-1",
  },
  md: {
    wrapper: "gap-2.5",
    mark: "h-9 w-9",
    text: "text-xl",
    ring: "ring-1",
  },
  lg: {
    wrapper: "gap-3",
    mark: "h-12 w-12",
    text: "text-3xl",
    ring: "ring-2",
  },
  xl: {
    wrapper: "gap-4",
    mark: "h-16 w-16",
    text: "text-5xl",
    ring: "ring-2",
  },
};

interface LogoProps {
  size?: Size;
  showHebrew?: boolean;
  className?: string;
}

/**
 * לוגו של Echo:
 * סמליל עיגולים מהדהדים בזהב על רקע חצילי + שם המותג בלטינית ו(לבחירה) בעברית.
 */
export function Logo({ size = "md", showHebrew = true, className }: LogoProps) {
  const s = sizeMap[size];

  return (
    <div className={cn("flex items-center", s.wrapper, className)}>
      {/* סמליל - גלי הד / טבעות מהדהדות */}
      <span
        className={cn(
          "relative inline-flex items-center justify-center rounded-full bg-eggplant text-cream shadow-soft",
          s.mark,
          s.ring,
          "ring-gold-300/60"
        )}
        aria-hidden
      >
        <svg
          viewBox="0 0 40 40"
          fill="none"
          className="h-[60%] w-[60%]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="20" cy="20" r="4" fill="#C9A961" />
          <circle
            cx="20"
            cy="20"
            r="9"
            stroke="#C9A961"
            strokeWidth="1.4"
            opacity="0.8"
          />
          <circle
            cx="20"
            cy="20"
            r="14"
            stroke="#C9A961"
            strokeWidth="1.2"
            opacity="0.5"
          />
          <circle
            cx="20"
            cy="20"
            r="18.5"
            stroke="#C9A961"
            strokeWidth="1"
            opacity="0.28"
          />
        </svg>
      </span>

      <div className="flex flex-col leading-none">
        <span className={cn("font-display font-semibold text-eggplant", s.text)}>
          Echo
        </span>
        {showHebrew && (
          <span className="mt-1 text-[0.7em] tracking-[0.18em] text-gold-600">
            אקו
          </span>
        )}
      </div>
    </div>
  );
}
