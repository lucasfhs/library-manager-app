import { Badge } from "@/components/ui/badge";
import { availabilityTone, type LoanStatus } from "@/lib/domain";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";

const tones = {
  good: "bg-success/12 text-success ring-success/25",
  low: "bg-warning/14 text-warning ring-warning/30",
  none: "bg-muted text-muted-foreground ring-border",
};

export function AvailabilityBadge({ quantity, className }: { quantity: number; className?: string }) {
  const tone = availabilityTone(quantity);
  return (
    <Badge variant="outline" className={cn("gap-1.5 border-0 tabular ring-1 ring-inset", tones[tone], className)}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {quantity > 0 ? plural(quantity, "disponível", "disponíveis") : "Indisponível"}
    </Badge>
  );
}

const loanStyles: Record<LoanStatus, { label: string; className: string }> = {
  active: { label: "Em andamento", className: "bg-brand/15 text-brand-ink ring-brand/35" },
  overdue: { label: "Atrasado", className: "bg-destructive/10 text-destructive ring-destructive/25" },
  returned: { label: "Devolvido", className: "bg-muted text-muted-foreground ring-border" },
};

export function LoanStatusBadge({ status, className }: { status: LoanStatus; className?: string }) {
  const style = loanStyles[status];
  return (
    <Badge variant="outline" className={cn("gap-1.5 border-0 ring-1 ring-inset", style.className, className)}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {style.label}
    </Badge>
  );
}
