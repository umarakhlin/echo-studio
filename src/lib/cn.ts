import clsx, { type ClassValue } from "clsx";

/** איחוד מחלקות Tailwind בצורה בטוחה (wrapper דק ל-clsx). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
