import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "gold";
export type ButtonSize = "sm" | "md" | "lg";

const variantClass: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  gold: "btn-gold",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "px-3.5 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

/** מחלקות עיצוב זהות ל-Button, לשימוש ב-`<Link>` (בלי לערבב `<a><button>`). */
export function buttonClassName(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  opts?: { fullWidth?: boolean; className?: string }
): string {
  return cn(
    variantClass[variant],
    sizeClass[size],
    opts?.fullWidth && "w-full",
    opts?.className
  );
}
