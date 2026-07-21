import type { LucideIcon } from "lucide-react";

// Global empty state per UI spec: centered, muted text with a Lucide icon.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 px-6 py-16 text-center">
      <Icon className="size-10 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
