import { useMemo, useState } from "react";
import { MinusIcon, PlusIcon, RotateCcwIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { BookCover } from "@/components/book-cover";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState } from "@/components/states";
import { AvailabilityBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { describeError } from "@/lib/api";
import { formatNumber, plural } from "@/lib/format";
import { useBooks, useDeleteStock, useLibraries, useSaveStock, useStock } from "@/lib/queries";
import type { StockEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StockFormDialog } from "./stock-form-dialog";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

function QuantityEditor({ entry, title }: { entry: StockEntry; title: string }) {
  const save = useSaveStock();
  const [draft, setDraft] = useState<number | null>(null);
  const value = draft ?? entry.quantidadeDisponivel;
  const dirty = draft !== null && draft !== entry.quantidadeDisponivel;

  const commit = async () => {
    try {
      await save.mutateAsync({
        id: entry.id,
        input: { idBook: entry.idLivro, idLibrary: entry.idBiblioteca, amount: value },
      });
      setDraft(null);
      toast.success("Quantidade atualizada.", { description: `${title}: ${plural(value, "exemplar", "exemplares")}` });
    } catch (error) {
      toast.error("Não foi possível salvar", { description: describeError(error) });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex items-center rounded-lg border bg-background transition-shadow",
          dirty && "border-brand-ink/50 ring-3 ring-brand/20"
        )}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Diminuir exemplares de ${title}`}
          disabled={value <= 0 || save.isPending}
          onClick={() => setDraft(Math.max(0, value - 1))}
        >
          <MinusIcon />
        </Button>
        <Input
          aria-label={`Exemplares de ${title}`}
          value={value}
          inputMode="numeric"
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value.replace(/\D/g, ""), 10);
            setDraft(Number.isNaN(parsed) ? 0 : parsed);
          }}
          onKeyDown={(event) => event.key === "Enter" && dirty && commit()}
          className="h-7 w-12 border-0 bg-transparent px-0 text-center font-medium tabular shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Aumentar exemplares de ${title}`}
          disabled={save.isPending}
          onClick={() => setDraft(value + 1)}
        >
          <PlusIcon />
        </Button>
      </div>
      {dirty && (
        <div className="flex animate-fade-in items-center gap-1">
          <Button size="sm" onClick={commit} disabled={save.isPending}>
            {save.isPending && <Spinner data-icon="inline-start" />}
            Salvar
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Desfazer"
                onClick={() => setDraft(null)}
                disabled={save.isPending}
              >
                <RotateCcwIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Desfazer</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

export default function InventoryPage() {
  const stock = useStock();
  const books = useBooks();
  const libraries = useLibraries();
  const remove = useDeleteStock();
  const [query, setQuery] = useState("");
  const [library, setLibrary] = useState("all");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<{ entry: StockEntry; title: string; library: string } | null>(null);

  const rows = useMemo(() => {
    const bookById = new Map((books.data ?? []).map((book) => [book.id, book]));
    const libraryById = new Map((libraries.data ?? []).map((item) => [item.id, item]));
    const term = normalize(query.trim());
    return (stock.data ?? [])
      .map((entry) => ({ entry, book: bookById.get(entry.idLivro), library: libraryById.get(entry.idBiblioteca) }))
      .filter((row) => library === "all" || String(row.entry.idBiblioteca) === library)
      .filter((row) => !term || normalize(`${row.book?.titulo ?? ""} ${row.library?.nome ?? ""}`).includes(term))
      .sort(
        (a, b) =>
          (a.library?.nome ?? "").localeCompare(b.library?.nome ?? "", "pt-BR") ||
          (a.book?.titulo ?? "").localeCompare(b.book?.titulo ?? "", "pt-BR")
      );
  }, [stock.data, books.data, libraries.data, query, library]);

  const pending = stock.isPending || books.isPending || libraries.isPending;
  const error = stock.error ?? books.error ?? libraries.error;
  const total = rows.reduce((sum, row) => sum + row.entry.quantidadeDisponivel, 0);

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await remove.mutateAsync(removing.entry.id);
      toast.success("Vínculo removido.", { description: `${removing.title} · ${removing.library}` });
      setRemoving(null);
    } catch (err) {
      toast.error("Não foi possível remover", { description: describeError(err) });
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Acervo"
        title="Estoque por biblioteca"
        description="Exemplares disponíveis de cada livro em cada unidade. Empréstimos e devoluções atualizam estes números automaticamente."
        actions={
          <Button onClick={() => setAdding(true)}>
            <PlusIcon data-icon="inline-start" />
            Adicionar ao estoque
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Buscar livro ou biblioteca"
            aria-label="Buscar livro ou biblioteca"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </InputGroup>
        <Select value={library} onValueChange={setLibrary}>
          <SelectTrigger className="w-full sm:w-60" aria-label="Biblioteca">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as bibliotecas</SelectItem>
            {(libraries.data ?? []).map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!pending && (
          <p className="text-sm text-muted-foreground sm:ml-auto">
            {plural(rows.length, "vínculo", "vínculos")} · {formatNumber(total)} exemplares
          </p>
        )}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => [stock, books, libraries].forEach((q) => q.refetch())} />
      ) : !pending && rows.length === 0 ? (
        <EmptyState
          title="Nenhum exemplar encontrado"
          description="Adicione um livro ao estoque de uma biblioteca ou ajuste os filtros."
        />
      ) : (
        <Card className="gap-0 overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-5">Livro</TableHead>
                <TableHead className="hidden md:table-cell">Biblioteca</TableHead>
                <TableHead>Exemplares</TableHead>
                <TableHead className="hidden lg:table-cell">Situação</TableHead>
                <TableHead className="w-12 pr-5">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending
                ? Array.from({ length: 6 }, (_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={5} className="pl-5">
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : rows.map(({ entry, book, library: unit }) => {
                    const title = book?.titulo ?? `Livro #${entry.idLivro}`;
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="pl-5">
                          <div className="flex items-center gap-3">
                            <BookCover id={entry.idLivro} title={title} author={book?.autor ?? ""} size="xs" />
                            <div className="min-w-0">
                              <p className="max-w-64 truncate font-medium">{title}</p>
                              <p className="max-w-64 truncate text-xs text-muted-foreground md:hidden">{unit?.nome}</p>
                              <p className="hidden max-w-64 truncate text-xs text-muted-foreground md:block">
                                {book?.autor}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <p>{unit?.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {unit ? `${unit.endereco.cidade} · ${unit.endereco.estado}` : ""}
                          </p>
                        </TableCell>
                        <TableCell>
                          <QuantityEditor key={entry.quantidadeDisponivel} entry={entry} title={title} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <AvailabilityBadge quantity={entry.quantidadeDisponivel} />
                        </TableCell>
                        <TableCell className="pr-5 text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Remover ${title} de ${unit?.nome ?? "biblioteca"}`}
                                onClick={() => setRemoving({ entry, title, library: unit?.nome ?? "" })}
                              >
                                <Trash2Icon />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remover da biblioteca</TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </Card>
      )}

      <StockFormDialog open={adding} onOpenChange={setAdding} />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remover da biblioteca?"
        description={
          <>
            <strong className="text-foreground">{removing?.title}</strong> deixará de constar no estoque da{" "}
            {removing?.library}. O histórico de empréstimos é mantido.
          </>
        }
        confirmLabel="Remover"
        destructive
        pending={remove.isPending}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
