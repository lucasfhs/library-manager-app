import { useMemo } from "react";
import { BookCheckIcon, BookOpenIcon, ClockAlertIcon } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { BookCover } from "@/components/book-cover";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState, ErrorState } from "@/components/states";
import { LoanStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LOAN_PERIOD_DAYS, MAX_OPEN_LOANS, loanStatus, type LoanStatus } from "@/lib/domain";
import { formatDate, parseDate } from "@/lib/format";
import { useCatalog, useReaderLoans } from "@/lib/queries";
import { useSession } from "@/lib/session";

type Filter = "all" | "open" | "returned";

function dueDate(loanDate: string) {
  const date = parseDate(loanDate);
  if (!date) return "—";
  date.setUTCDate(date.getUTCDate() + LOAN_PERIOD_DAYS);
  return formatDate(date.toISOString().slice(0, 10));
}

export default function ReaderLoansPage() {
  const { session } = useSession();
  const loans = useReaderLoans(session?.subject);
  const catalog = useCatalog();
  const [params, setParams] = useSearchParams();
  const filter = (params.get("status") as Filter) ?? "all";

  const rows = useMemo(() => {
    const bookIds = new Map((catalog.data ?? []).map((book) => [book.titulo, book]));
    return (loans.data ?? [])
      .map((loan) => ({
        ...loan,
        status: loanStatus(loan.emprestimo, loan.devolucao) as LoanStatus,
        book: bookIds.get(loan.livro),
      }))
      .sort((a, b) => (parseDate(b.emprestimo)?.getTime() ?? 0) - (parseDate(a.emprestimo)?.getTime() ?? 0));
  }, [loans.data, catalog.data]);

  const counts = {
    active: rows.filter((row) => row.status === "active").length,
    overdue: rows.filter((row) => row.status === "overdue").length,
    returned: rows.filter((row) => row.status === "returned").length,
  };
  const visible = rows.filter((row) =>
    filter === "all" ? true : filter === "open" ? row.status !== "returned" : row.status === "returned"
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Histórico"
        title="Meus empréstimos"
        description={`Prazo de ${LOAN_PERIOD_DAYS} dias por empréstimo e até ${MAX_OPEN_LOANS} livros ao mesmo tempo.`}
        actions={
          <Button asChild variant="outline">
            <Link to="/user">Explorar catálogo</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Em andamento"
          value={counts.active}
          hint={`${counts.active + counts.overdue} de ${MAX_OPEN_LOANS} em uso`}
          icon={<BookOpenIcon />}
          loading={loans.isPending}
        />
        <StatCard
          label="Atrasados"
          value={counts.overdue}
          hint={counts.overdue ? "Bloqueiam novos empréstimos" : "Nenhuma pendência"}
          icon={<ClockAlertIcon />}
          loading={loans.isPending}
        />
        <StatCard label="Devolvidos" value={counts.returned} icon={<BookCheckIcon />} loading={loans.isPending} />
      </div>

      <Tabs
        value={filter}
        onValueChange={(value) => setParams(value === "all" ? {} : { status: value }, { replace: true })}
      >
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="open">Em aberto</TabsTrigger>
          <TabsTrigger value="returned">Devolvidos</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {loans.isPending ? (
            <Card className="gap-0 p-0">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="flex items-center gap-4 border-b p-4 last:border-0">
                  <Skeleton className="h-12 w-8 rounded-sm" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="ml-auto h-5 w-24 rounded-full" />
                </div>
              ))}
            </Card>
          ) : loans.isError ? (
            <ErrorState error={loans.error} onRetry={() => loans.refetch()} />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<BookOpenIcon />}
              title={rows.length === 0 ? "Você ainda não fez empréstimos" : "Nada por aqui"}
              description={
                rows.length === 0
                  ? "Encontre um livro no catálogo e solicite o empréstimo na biblioteca mais próxima."
                  : "Nenhum empréstimo corresponde a este filtro."
              }
              action={
                rows.length === 0 && (
                  <Button asChild>
                    <Link to="/user">Explorar catálogo</Link>
                  </Button>
                )
              }
            />
          ) : (
            <Card className="animate-fade-in gap-0 overflow-hidden p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="pl-5">Livro</TableHead>
                    <TableHead className="hidden md:table-cell">Biblioteca</TableHead>
                    <TableHead className="hidden sm:table-cell">Retirada</TableHead>
                    <TableHead className="hidden sm:table-cell">Devolução</TableHead>
                    <TableHead className="pr-5 text-right">Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((loan) => (
                    <TableRow key={loan.emprestimo_id}>
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-3">
                          <BookCover
                            id={loan.book?.id ?? loan.emprestimo_id}
                            title={loan.livro}
                            author={loan.book?.autor ?? ""}
                            size="xs"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{loan.livro}</p>
                            <p className="truncate text-xs text-muted-foreground md:hidden">{loan.biblioteca}</p>
                            <p className="truncate text-xs text-muted-foreground sm:hidden">
                              {formatDate(loan.emprestimo)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{loan.biblioteca}</TableCell>
                      <TableCell className="hidden tabular sm:table-cell">{formatDate(loan.emprestimo)}</TableCell>
                      <TableCell className="hidden tabular sm:table-cell">
                        {loan.devolucao ? (
                          formatDate(loan.devolucao)
                        ) : (
                          <span className="text-muted-foreground">Prazo {dueDate(loan.emprestimo)}</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <LoanStatusBadge status={loan.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
