import { ArrowRightIcon, ArrowLeftRightIcon, BookOpenTextIcon, PackageIcon, UsersIcon } from "lucide-react";
import { Link } from "react-router";
import { BarList } from "@/components/bar-list";
import { BookCover } from "@/components/book-cover";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState, ErrorState } from "@/components/states";
import { LoanStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, plural, today } from "@/lib/format";
import { useBooks, useBooksByCategory, useCatalog, useReaders, useStock, useTopLibraries } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { useLoanRows } from "@/lib/use-loan-rows";

const longToday = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
}).format(new Date(`${today()}T00:00:00Z`));

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-9 w-full" />
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const { session } = useSession();
  const books = useBooks();
  const stock = useStock();
  const readers = useReaders();
  const catalog = useCatalog();
  const categories = useBooksByCategory();
  const topLibraries = useTopLibraries();
  const loans = useLoanRows();

  const copies = (stock.data ?? []).reduce((total, entry) => total + entry.quantidadeDisponivel, 0);
  const open = loans.rows.filter((row) => row.status !== "returned");
  const overdue = open.filter((row) => row.status === "overdue").length;
  const unavailable = (catalog.data ?? []).filter((book) => Number(book.quantidade_disponivel) === 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={longToday}
        title={`Olá, ${session?.subject ?? "operador"}`}
        description="Um resumo do acervo, do estoque e da circulação nas bibliotecas."
        actions={
          <Button asChild>
            <Link to="/admin/loans?novo=1">
              <ArrowLeftRightIcon data-icon="inline-start" />
              Registrar empréstimo
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Títulos no acervo"
          value={books.data?.length ?? 0}
          icon={<BookOpenTextIcon />}
          loading={books.isPending}
          hint={`${plural(unavailable.length, "sem exemplares", "sem exemplares")}`}
        />
        <StatCard
          label="Exemplares disponíveis"
          value={copies}
          icon={<PackageIcon />}
          loading={stock.isPending}
          hint={`em ${plural(stock.data?.length ?? 0, "vínculo", "vínculos")} livro-biblioteca`}
        />
        <StatCard
          label="Empréstimos em aberto"
          value={open.length}
          icon={<ArrowLeftRightIcon />}
          loading={loans.isPending}
          hint={overdue ? `${plural(overdue, "atrasado", "atrasados")}` : "Nenhum atraso"}
        />
        <StatCard
          label="Leitores cadastrados"
          value={readers.data?.length ?? 0}
          icon={<UsersIcon />}
          loading={readers.isPending}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Empréstimos recentes</CardTitle>
            <CardDescription>Últimas retiradas registradas em todas as unidades.</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/loans">
                  Ver todos
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {loans.isPending ? (
              <ListSkeleton />
            ) : loans.error ? (
              <ErrorState error={loans.error} onRetry={loans.refetch} />
            ) : loans.rows.length === 0 ? (
              <EmptyState title="Nenhum empréstimo ainda" description="Os empréstimos registrados aparecerão aqui." />
            ) : (
              <ul className="-mx-2 divide-y">
                {loans.rows.slice(0, 6).map(({ loan, book, library, reader, status }) => (
                  <li key={loan.id} className="flex items-center gap-3 px-2 py-3">
                    <BookCover id={loan.idLivro} title={book?.titulo ?? ""} author={book?.autor ?? ""} size="xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{book?.titulo ?? `Livro #${loan.idLivro}`}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {reader?.nome ?? loan.cpfUsuario} · {library?.nome ?? `Biblioteca #${loan.idBiblioteca}`}
                      </p>
                    </div>
                    <div className="hidden text-right text-xs text-muted-foreground tabular sm:block">
                      {formatDate(loan.dataEmprestimo)}
                    </div>
                    <LoanStatusBadge status={status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Acervo por categoria</CardTitle>
            <CardDescription>Títulos em cada categoria; um livro pode ter várias.</CardDescription>
          </CardHeader>
          <CardContent>
            {categories.isPending ? (
              <ListSkeleton />
            ) : categories.isError ? (
              <ErrorState error={categories.error} onRetry={() => categories.refetch()} />
            ) : (
              <BarList
                ariaLabel="Títulos por categoria"
                unit="títulos"
                items={(categories.data ?? []).slice(0, 7).map((row) => ({
                  label: row.categoria,
                  value: Number(row.quantidade_livros),
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bibliotecas com mais exemplares</CardTitle>
            <CardDescription>Unidades com mais de 5 exemplares disponíveis.</CardDescription>
          </CardHeader>
          <CardContent>
            {topLibraries.isPending ? (
              <ListSkeleton rows={3} />
            ) : topLibraries.isError ? (
              <ErrorState error={topLibraries.error} onRetry={() => topLibraries.refetch()} />
            ) : topLibraries.data?.length ? (
              <BarList
                ariaLabel="Exemplares disponíveis por biblioteca"
                unit="exemplares"
                items={topLibraries.data.map((row) => ({
                  label: row.biblioteca,
                  value: Number(row.total_livros_disponiveis),
                }))}
              />
            ) : (
              <EmptyState title="Nenhuma unidade acima de 5 exemplares" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sem exemplares disponíveis</CardTitle>
            <CardDescription>Títulos que os leitores não conseguem retirar agora.</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link to="/library">
                  Ajustar estoque
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {catalog.isPending ? (
              <ListSkeleton rows={3} />
            ) : unavailable.length === 0 ? (
              <EmptyState title="Todos os títulos têm exemplares" />
            ) : (
              <ul className="flex flex-wrap gap-2">
                {unavailable.map((book) => (
                  <li
                    key={book.id}
                    className="flex items-center gap-2 rounded-lg border bg-muted/40 py-1.5 pr-3 pl-1.5 text-sm"
                  >
                    <BookCover id={book.id} title={book.titulo} author={book.autor} size="xs" className="w-6" />
                    {book.titulo}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
