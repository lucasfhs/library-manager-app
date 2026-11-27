import type { ReactNode } from "react";
import { AlertTriangleIcon, RotateCwIcon, SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { describeError } from "@/lib/api";
import { cn } from "@/lib/utils";

type StateProps = {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon = <SearchXIcon />, title, description, action, className }: StateProps) {
  return (
    <Empty className={cn("animate-fade-in border border-dashed bg-card/60", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle className="font-heading text-lg">{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      className={cn("border-destructive/30", className)}
      icon={<AlertTriangleIcon className="text-destructive" />}
      title="Não foi possível carregar os dados"
      description={describeError(error)}
      action={
        onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RotateCwIcon data-icon="inline-start" />
            Tentar novamente
          </Button>
        )
      }
    />
  );
}
