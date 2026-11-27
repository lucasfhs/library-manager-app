import { CheckCircle2Icon, CreditCardIcon, LockIcon, ReceiptTextIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { describeError } from "@/lib/api";
import { LOAN_PERIOD_DAYS } from "@/lib/domain";
import { formatCurrency, formatDate, plural } from "@/lib/format";
import { useStartFinePayment } from "@/lib/queries";
import type { FineSummary } from "@/lib/types";

const cents = (value: number) => formatCurrency(value / 100);

type FinesPanelProps = { cpfUser: string; fines: FineSummary | undefined; loading: boolean };

export function FinesPanel({ cpfUser, fines, loading }: FinesPanelProps) {
  const startPayment = useStartFinePayment();

  if (loading) {
    return (
      <Card className="gap-0 p-0">
        <div className="space-y-3 p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    );
  }
  if (!fines || fines.loans.length === 0) return null;

  const due = fines.totalDueCents;
  const busy = startPayment.isPending || startPayment.isSuccess;

  async function pay() {
    try {
      const { result } = await startPayment.mutateAsync(cpfUser);
      // Stripe Checkout is a hosted page; the reader comes back to /loan afterwards.
      window.location.assign(result.url);
    } catch (error) {
      toast.error("Não foi possível iniciar o pagamento", { description: describeError(error) });
    }
  }

  return (
    <Card role="region" aria-labelledby="fines-title" className="animate-fade-in gap-0 overflow-hidden p-0">
      <CardHeader className="gap-1 border-b px-5 py-4">
        <CardTitle id="fines-title" className="flex items-center gap-2 text-base">
          <ReceiptTextIcon className="size-4 text-brand-ink" aria-hidden="true" />
          Multas por atraso
        </CardTitle>
        <CardDescription>
          {cents(fines.finePerDayCents)} por dia após o prazo de {LOAN_PERIOD_DAYS} dias, limitada ao preço do livro.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <ul className="divide-y">
          {fines.loans.map((loan) => {
            const paid = loan.dueCents === 0;
            return (
              <li key={loan.loanId} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{loan.book}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {plural(loan.daysLate, "dia", "dias")} de atraso · {loan.library} · prazo {formatDate(loan.dueDate)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {paid ? (
                    <Badge
                      variant="outline"
                      className="gap-1.5 border-0 bg-success/12 text-success ring-1 ring-success/25 ring-inset"
                    >
                      <CheckCircle2Icon aria-hidden="true" />
                      Paga
                    </Badge>
                  ) : loan.paidCents > 0 ? (
                    <span className="text-xs text-muted-foreground">{cents(loan.paidCents)} pagos</span>
                  ) : null}
                  <span className={paid ? "text-muted-foreground tabular line-through" : "font-semibold tabular"}>
                    {cents(paid ? loan.fineCents : loan.dueCents)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>

      <CardFooter className="flex flex-col items-stretch gap-3 border-t bg-muted/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        {due > 0 ? (
          <>
            <div>
              <p className="text-sm text-muted-foreground">Total em aberto</p>
              <p className="text-2xl font-semibold tracking-tight tabular">{cents(due)}</p>
            </div>
            <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
              <Button size="lg" onClick={pay} disabled={busy}>
                {busy ? <Spinner /> : <CreditCardIcon />}
                {busy ? "Abrindo pagamento…" : `Pagar ${cents(due)}`}
              </Button>
              <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <LockIcon className="size-3" aria-hidden="true" />
                Pagamento seguro processado pela Stripe
              </p>
            </div>
          </>
        ) : (
          <p className="flex items-center gap-2 text-sm font-medium text-success">
            <CheckCircle2Icon className="size-4" aria-hidden="true" />
            Todas as multas estão pagas. Obrigado!
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
