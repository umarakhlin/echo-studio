import { cn } from "@/lib/cn";
import { projectStatusLabels, projectStatusOrder, type ProjectStatus } from "@/lib/db/types";

const styles: Record<ProjectStatus, string> = {
  intake: "bg-cream-300 text-ink-soft border-eggplant/15",
  scanning: "bg-gold-100 text-gold-700 border-gold-300",
  editing: "bg-eggplant/10 text-eggplant border-eggplant/20",
  ready: "bg-green-50 text-green-700 border-green-200",
  delivered: "bg-eggplant text-cream border-eggplant",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const safe: ProjectStatus = (projectStatusOrder as readonly string[]).includes(
    status
  )
    ? status
    : "intake";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[safe],
        className
      )}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {projectStatusLabels[safe]}
    </span>
  );
}
