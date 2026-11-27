import { useMemo, useState } from "react";
import { AlertTriangleIcon, SearchIcon, XIcon } from "lucide-react";
import { useSearchParams } from "react-router";
import { BookCover } from "@/components/book-cover";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState } from "@/components/states";
import { AvailabilityBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import { CATEGORIES, MAX_OPEN_LOANS, loanStatus } from "@/lib/domain";
import { plural } from "@/lib/format";
import { useCatalog, useLibraries, useReaderLoans } from "@/lib/queries";
import { useSession } from "@/lib/session";
import type { CatalogBook } from "@/lib/types";
import { BookSheet } from "./book-sheet";

const sorters: Record<string, { label: string; compare: (a: CatalogBook, b: CatalogBook) => number }> = {
  titulo: { label: "Título (A–Z)", compare: (a, b) => a.titulo.localeCompare(b.titulo, "pt-BR") },
  autor: { label: "Autor (A–Z)", compare: (a, b) => a.autor.localeCompare(b.autor, "pt-BR") },
  disponiveis: {
    label: "Mais exemplares",
    compare: (a, b) => Number(b.quantidade_disponivel) - Number(a.quantidade_disponivel),
  },
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export default function CatalogPage() {
  const { session } = useSession();
  const cpf = session?.subject ?? "";
  const catalog = useCatalog();
  const libraries = useLibraries();
  const loans = useReaderLoans(cpf);
  const [params, setParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = catalog.data?.find((book) => book.id === selectedId) ?? null;

  const query = params.get("q") ?? "";
  const category = params.get("categoria") ?? "all";
  const onlyAvailable = params.get("disponiveis") === "1";
  const sort = params.get("ordem") ?? "titulo";

  const update = (key: string, value: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true }
    );

  const books = useMemo(() => {
    const term = normalize(query.trim());
    return (catalog.data ?? [])
      .filter((book) => !term || normalize(`${book.titulo} ${book.autor}`).includes(term))
      .filter((book) => category === "all" || book.categoria.includes(category))
      .filter((book) => !onlyAvailable || Number(book.quantidade_disponivel) > 0)
      .sort(sorters[sort]?.compare ?? sorters.titulo.compare);
  }, [catalog.data, query, category, onlyAvailable, sort]);

  const openLoans = (loans.data ?? []).filter((loan) => !loan.devolucao);
  const overdue = openLoans.some((loan) => loanStatus(loan.emprestimo, loan.devolucao) === "overdue");
  const blockedReason = overdue
    ? "Há um empréstimo atrasado na sua conta. Devolva-o para solicitar novos livros."
    : openLoans.length >= MAX_OPEN_LOANS
      ? `Você atingiu o limite de ${MAX_OPEN_LOANS} empréstimos simultâneos.`
      : null;
  const filtered = Boolean(query) || category !== "all" || onlyAvailable;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catálogo"
        title="Encontre seu próximo livro"
        description={
          catalog.data && libraries.data
            ? `${plural(catalog.data.length, "título", "títulos")} em ${plural(libraries.data.length, "biblioteca", "bibliotecas")}.`
            : "Pesquise o acervo de todas as bibliotecas."
        }
      />

      {blockedReason && (
        <div
          role="status"
          className="flex animate-fade-in items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
        >
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>{blockedReason}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <InputGroup className="h-10 md:max-w-sm">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Buscar por título ou autor"
            aria-label="Buscar por título ou autor"
            value={query}
            onChange={(event) => update("q", event.target.value || null)}
          />
          {query && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" aria-label="Limpar busca" onClick={() => update("q", null)}>
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={category} onValueChange={(value) => update("categoria", value === "all" ? null : value)}>
            <SelectTrigger className="h-10! w-48" aria-label="Categoria">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {CATEGORIES.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => update("ordem", value === "titulo" ? null : value)}>
            <SelectTrigger className="h-10! w-44" aria-label="Ordenar por">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(sorters).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Toggle
            variant="outline"
            className="h-10 px-3"
            pressed={onlyAvailable}
            onPressedChange={(pressed) => update("disponiveis", pressed ? "1" : null)}
          >
            Somente disponíveis
          </Toggle>
        </div>
      </div>

      {catalog.isPending ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="aspect-[2/3] w-full rounded-md" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : catalog.isError ? (
        <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} />
      ) : books.length === 0 ? (
        <EmptyState
          title={filtered ? "Nenhum livro encontrado" : "O catálogo está vazio"}
          description={
            filtered
              ? "Tente outro termo de busca ou remova alguns filtros."
              : "Os livros cadastrados pelos operadores aparecerão aqui."
          }
          action={
            filtered && (
              <Button variant="outline" onClick={() => setParams({}, { replace: true })}>
                Limpar filtros
              </Button>
            )
          }
        />
      ) : (
        <>
          {filtered && (
            <p className="-mt-4 text-sm text-muted-foreground" aria-live="polite">
              {plural(books.length, "resultado", "resultados")}
            </p>
          )}
          <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {books.map((book, index) => (
              <li key={book.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}>
                <button
                  type="button"
                  onClick={() => setSelectedId(book.id)}
                  className="group block w-full rounded-lg text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-4 focus-visible:ring-offset-background focus-visible:outline-none"
                >
                  <BookCover
                    id={book.id}
                    title={book.titulo}
                    author={book.autor}
                    category={book.categoria[0]}
                    className="transition-[transform,box-shadow] duration-300 ease-out group-hover:-translate-y-1.5 group-hover:shadow-[0_2px_4px_rgb(0_0_0/0.1),0_18px_30px_-12px_rgb(13_19_33/0.45)]"
                  />
                  <p className="mt-3 line-clamp-2 leading-snug font-semibold">{book.titulo}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{book.autor}</p>
                  <AvailabilityBadge quantity={Number(book.quantidade_disponivel)} className="mt-2" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <BookSheet
        book={selected}
        cpf={cpf}
        openLoans={openLoans.map((loan) => loan.livro)}
        blockedReason={blockedReason}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}
