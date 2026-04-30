import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-eggplant/20 bg-white/40 px-6 py-14 text-center",
        className
      )}
    >
      {Icon && (
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-cream-200 text-gold-500">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <h3 className="font-display text-lg font-semibold text-eggplant">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-ink-muted leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
