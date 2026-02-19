import type { LucideIcon } from "lucide-react";

type ProjectPageHeaderProps = {
  icon?: LucideIcon | null;
  label: string;
};

export function ProjectPageHeader({ icon: Icon, label }: ProjectPageHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      )}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{label}</h1>
        <p className="text-sm text-muted-foreground">Project workspace</p>
      </div>
    </div>
  );
}
