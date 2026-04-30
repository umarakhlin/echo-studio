"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

import { Button } from "./Button";
import { cn } from "@/lib/cn";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "אישור",
  cancelLabel = "ביטול",
  destructive = false,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-up"
        onClick={onClose}
        aria-hidden
      />

      <div
        className={cn(
          "relative w-full max-w-md rounded-2xl bg-white p-6 shadow-soft border border-eggplant/10 animate-fade-up"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="confirm-title"
            className="font-display text-xl font-semibold text-eggplant"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-md p-1.5 text-ink-muted hover:bg-cream-200 hover:text-eggplant"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {description && (
          <div className="mt-3 text-sm text-ink-soft leading-relaxed">
            {description}
          </div>
        )}

        <div className="mt-6 flex justify-start gap-2">
          <Button
            variant={destructive ? "primary" : "primary"}
            loading={loading}
            onClick={onConfirm}
            className={destructive ? "bg-red-600 hover:bg-red-700" : undefined}
          >
            {confirmLabel}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
