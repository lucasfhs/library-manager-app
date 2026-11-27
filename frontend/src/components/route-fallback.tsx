import { Spinner } from "@/components/ui/spinner";

export function RouteFallback() {
  return (
    <div className="grid min-h-svh place-items-center" role="status" aria-label="Carregando">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}
