import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  loading?: boolean;
  className?: string;
};

export function StatCard({ label, value, hint, icon, loading, className }: StatCardProps) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <CardContent className="flex items-start justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-semibold tracking-tight tabular sm:text-3xl">{value}</p>
          )}
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className="hidden size-9 shrink-0 place-items-center rounded-lg bg-accent text-brand-ink sm:grid [&_svg]:size-4.5">
          {icon}
        </span>
      </CardContent>
    </Card>
  );
}
