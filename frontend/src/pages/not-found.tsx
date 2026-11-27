import { ArrowLeftIcon } from "lucide-react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  const error = useRouteError();
  const notFound = !error || (isRouteErrorResponse(error) && error.status === 404);
  return (
    <main className="grid min-h-svh place-items-center bg-background px-6">
      <div className="max-w-md animate-fade-up text-center">
        <BrandLogo className="text-2xl" />
        <p className="mt-10 font-heading text-7xl font-semibold tracking-tight text-brand-ink">
          {notFound ? "404" : "Ops"}
        </p>
        <h1 className="mt-3 font-heading text-2xl font-semibold">
          {notFound ? "Esta página saiu da estante" : "Algo deu errado"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {notFound
            ? "O endereço pode ter mudado ou a página não existe mais."
            : "Recarregue a página. Se o problema continuar, volte ao início."}
        </p>
        <Button asChild className="mt-8">
          <Link to="/">
            <ArrowLeftIcon data-icon="inline-start" />
            Voltar ao início
          </Link>
        </Button>
      </div>
    </main>
  );
}
