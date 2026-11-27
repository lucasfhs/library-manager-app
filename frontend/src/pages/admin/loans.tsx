import { useMemo, useState } from "react";
import { PlusIcon, SearchIcon, UndoDotIcon } from "lucide-react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { BookCover } from "@/components/book-cover";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState } from "@/components/states";
import { LoanStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { describeError } from "@/lib/api";
import { LOAN_PERIOD_DAYS, type LoanStatus } from "@/lib/domain";
import { daysSince, formatCpf, formatDate, today } from "@/lib/format";
import { useReturnLoan } from "@/lib/queries";
import { useLoanRows, type LoanRow } from "@/lib/use-loan-rows";
import { LoanFormDialog } from "./loan-form-dialog";

const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const filters: { value: "all" | LoanStatus; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Em andamento" },
  { value: "overdue", label: "Atrasados" },
  { value: "returned", label: "Devolvidos" },
];

export default function LoansPage() {
  const { rows, isPending, error, refetch } = useLoanRows();
  const returnLoan = useReturnLoan();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [returning, setReturning] = useState<LoanRow | null>(null);
  const status = (params.get("status") as (typeof filters)[number]["value"]) ?? "all";
  const creating = params.get("novo") === "1";

  const setParam = (key: string, value: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true }
    );

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: rows.length, active: 0, overdue: 0, returned: 0 };
    rows.forEach((row) => (result[row.status] += 1));
    return result;
  }, [rows]);

  const visible = useMemo(() => {
    const term = normalize(query.trim());
    return rows
      .filter((row) => status === "all" || row.status === status)
      .filter(
        (row) =>
          !term ||
          normalize(`${row.book?.titulo ?? ""} ${row.reader?.nome ?? ""} ${row.loan.cpfUsuario} ${row.library?.nome ?? ""}`).includes(term)
      );
  }, [rows, status, query]);

  const confirmReturn = async () => {
    if (!returning) return;
    try {
      await returnLoan.mutateAsync({ loan: returning.loan, returnDate: today() });
      toast.success("Devolução registrada.", {
        description: `${returning.book?.titulo ?? "Livro"} voltou ao estoque da ${returning.library?.nome ?? "biblioteca"}.`,
      });
      setReturning(null);
    } catch (err) {
      toast.error("Não foi possível registrar a devolução", { description: describeError(err) });
      setReturning(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Circulação"
        title="Empréstimos"
        description={`Prazo de ${LOAN_PERIOD_DAYS} dias. Leitores com atraso não conseguem novos empréstimos até devolver.`}
        actions={
          <Button onClick={() => setParam("novo", "1")}>
            <PlusIcon data-icon="inline-start" />
            Novo empréstimo
          </Button>
        }
      />

      <Tabs value={status} onValueChange={(value) => setParam("status", value === "all" ? null : value)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList>
            {filters.map((filter) => (
              <TabsTrigger key={filter.value} value={filter.value} className="gap-1.5">
                {filter.label}
                {!isPending && (
                  <span className="rounded-full bg-background/70 px-1.5 text-[11px] text-muted-foreground tabular group-data-[state=active]:text-foreground">
                    {counts[filter.value]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        <InputGroup className="lg:max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Buscar livro, leitor ou CPF"
            aria-label="Buscar livro, leitor ou CPF"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </InputGroup>
      </div>

      <TabsContent value={status} className="mt-6">
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !isPending && visible.length === 0 ? (
        <EmptyState title="Nenhum empréstimo encontrado" description="Altere o filtro ou registre um novo empréstimo." />
      ) : (
        <Card className="gap-0 overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-5">Livro</TableHead>
                <TableHead className="hidden md:table-cell">Leitor</TableHead>
                <TableHead className="hidden xl:table-cell">Biblioteca</TableHead>
                <TableHead className="hidden sm:table-cell">Retirada</TableHead>
                <TableHead className="hidden lg:table-cell">Devolução</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="pr-5 text-right">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending
                ? Array.from({ length: 6 }, (_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={7} className="pl-5">
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : visible.map((row) => {
                    const { loan, book, reader, library } = row;
                    const days = daysSince(loan.dataEmprestimo);
                    return (
                      <TableRow key={loan.id}>
                        <TableCell className="pl-5">
                          <div className="flex items-center gap-3">
                            <BookCover id={loan.idLivro} title={book?.titulo ?? ""} author={book?.autor ?? ""} size="xs" />
                            <div className="min-w-0">
                              <p className="max-w-56 truncate font-medium">{book?.titulo ?? `Livro #${loan.idLivro}`}</p>
                              <p className="max-w-56 truncate text-xs text-muted-foreground md:hidden">
                                {reader?.nome ?? formatCpf(loan.cpfUsuario)}
                              </p>
                              <p className="text-xs text-muted-foreground tabular">#{loan.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <p className="max-w-48 truncate">{reader?.nome ?? "—"}</p>
                          <p className="text-xs text-muted-foreground tabular">{formatCpf(loan.cpfUsuario)}</p>
                        </TableCell>
                        <TableCell className="hidden max-w-48 truncate text-muted-foreground xl:table-cell">
                          {library?.nome}
                        </TableCell>
                        <TableCell className="hidden tabular sm:table-cell">{formatDate(loan.dataEmprestimo)}</TableCell>
                        <TableCell className="hidden tabular lg:table-cell">
                          {loan.dataDevolucao ? (
                            formatDate(loan.dataDevolucao)
                          ) : (
                            <span className={row.status === "overdue" ? "text-destructive" : "text-muted-foreground"}>
                              {row.status === "overdue"
                                ? `${days - LOAN_PERIOD_DAYS} dias de atraso`
                                : `${LOAN_PERIOD_DAYS - days} dias restantes`}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <LoanStatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="pr-5 text-right">
                          {!loan.dataDevolucao && (
                            <Button size="sm" variant="outline" onClick={() => setReturning(row)}>
                              <UndoDotIcon data-icon="inline-start" />
                              Devolver
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </Card>
      )}
      </TabsContent>
      </Tabs>

      <LoanFormDialog open={creating} onOpenChange={(open) => setParam("novo", open ? "1" : null)} />
      <ConfirmDialog
        open={Boolean(returning)}
        onOpenChange={(open) => !open && setReturning(null)}
        title="Registrar devolução?"
        description={
          <>
            <strong className="text-foreground">{returning?.book?.titulo}</strong>, emprestado a{" "}
            {returning?.reader?.nome ?? "leitor"}, volta ao estoque da {returning?.library?.nome} com data de hoje.
          </>
        }
        confirmLabel="Registrar devolução"
        pending={returnLoan.isPending}
        onConfirm={confirmReturn}
      />
    </div>
  );
}
