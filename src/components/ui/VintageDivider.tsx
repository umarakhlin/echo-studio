import { cn } from "@/lib/cn";

interface VintageDividerProps {
  label?: string;
  className?: string;
}

/** קו זהוב מנוקד עם תוכן באמצע - מוטיב וינטג' חוזר במסכי Echo. */
export function VintageDivider({ label, className }: VintageDividerProps) {
  return (
    <div className={cn("vintage-divider", className)}>
      {label && (
        <span className="text-xs uppercase tracking-[0.25em] text-gold-600">
          {label}
        </span>
      )}
    </div>
  );
}
