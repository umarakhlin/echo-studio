"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  startIcon?: ReactNode;
  endAdornment?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, startIcon, endAdornment, id, className, ...rest },
  ref
) {
  const reactId = useId();
  const inputId = id ?? reactId;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}

      <div className="relative">
        {startIcon && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-muted">
            {startIcon}
          </span>
        )}

        <input
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={cn(
            "input",
            startIcon && "pr-10",
            endAdornment && "pl-10",
            error &&
              "border-red-300 focus:border-red-400 focus:ring-red-200/60",
            className
          )}
          {...rest}
        />

        {endAdornment && (
          <span className="absolute inset-y-0 left-2 flex items-center">
            {endAdornment}
          </span>
        )}
      </div>

      {error ? (
        <p
          id={`${inputId}-error`}
          className="mt-1.5 text-xs text-red-600"
          role="alert"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
