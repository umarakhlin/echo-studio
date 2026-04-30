"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Math.random()).slice(2);
      setItems((prev) => [...prev, { id, message, kind }]);
      setTimeout(() => remove(id), 4200);
    },
    [remove]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (m) => show(m, "success"),
      error: (m) => show(m, "error"),
      info: (m) => show(m, "info"),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-5 left-5 z-50 flex w-[min(92vw,22rem)] flex-col gap-2"
      >
        {items.map((item) => (
          <ToastBubble key={item.id} item={item} onClose={() => remove(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastBubble({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: () => void;
}) {
  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEnter(true), 10);
    return () => clearTimeout(t);
  }, []);

  const Icon =
    item.kind === "success" ? CheckCircle2 : item.kind === "error" ? AlertTriangle : Info;

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-soft backdrop-blur-md transition-all duration-200",
        enter ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        item.kind === "success" &&
          "bg-white/95 border-green-200 text-green-900",
        item.kind === "error" && "bg-white/95 border-red-200 text-red-900",
        item.kind === "info" && "bg-white/95 border-eggplant/15 text-ink"
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          item.kind === "success" && "text-green-600",
          item.kind === "error" && "text-red-600",
          item.kind === "info" && "text-eggplant"
        )}
      />
      <p className="flex-1 text-sm leading-relaxed">{item.message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="סגירה"
        className="rounded-md p-1 text-ink-muted hover:bg-cream-200 hover:text-eggplant"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
