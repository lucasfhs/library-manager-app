import { useMemo, useState } from "react";
import { MoreHorizontalIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { BookCover } from "@/components/book-cover";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState } from "@/components/states";
import { AvailabilityBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { describeError } from "@/lib/api";
import { CATEGORIES } from "@/lib/domain";
import { formatCurrency, formatNumber, plural } from "@/lib/format";
import { useCatalog, useDeleteBook } from "@/lib/queries";
import type { CatalogBook } from "@/lib/types";
import { BookFormDialog } from "./book-form-dialog";

const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function BooksPage() {
  const catalog = useCatalog();
  const remove = useDeleteBook();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<CatalogBook | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CatalogBook | null>(null);

  const books = useMemo(() => {
    const term = normalize(query.trim());
    return (catalog.data ?? [])
      .filter((book) => !term || normalize(`${book.titulo} ${book.autor}`).includes(term))
      .filter((book) => category === "all" || book.categoria.includes(category))
      .sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
  }, [catalog.data, query, category]);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success("Livro removido.", { description: deleting.titulo });
      setDeleting(null);
    } catch (error) {
      toast.error("Não foi possível remover o livro", { description: describeError(error) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Acervo"
        title="Livros"
        description={catalog.data ? `${plural(catalog.data.length, "título cadastrado", "títulos cadastrados")} no catálogo.` : "Títulos disponíveis no catálogo."}
        actions={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon data-icon="inline-start" />
            Novo livro
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Buscar título ou autor"
            aria-label="Buscar título ou autor"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </InputGroup>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Categoria">
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
      </div>

      {catalog.isError ? (
        <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} />
      ) : !catalog.isPending && books.length === 0 ? (
        <EmptyState
          title={catalog.data?.length ? "Nenhum livro encontrado" : "Nenhum livro cadastrado"}
          description={catalog.data?.length ? "Ajuste a busca ou a categoria." : "Cadastre o primeiro título do acervo."}
          action={
            !catalog.data?.length && (
              <Button onClick={() => setCreating(true)}>
                <PlusIcon data-icon="inline-start" />
                Novo livro
              </Button>
            )
          }
        />
      ) : (
        <Card className="gap-0 overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-5">Livro</TableHead>
                <TableHead className="hidden lg:table-cell">Categorias</TableHead>
                <TableHead className="hidden text-right md:table-cell">Páginas</TableHead>
                <TableHead className="hidden md:table-cell">Idioma</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Preço</TableHead>
                <TableHead>Disponibilidade</TableHead>
                <TableHead className="w-12 pr-5">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalog.isPending
                ? Array.from({ length: 6 }, (_, index) => (
                    <TableRow key={index}>
                      <TableCell className="pl-5" colSpan={7}>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-[52px] w-9 rounded-sm" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-28" />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                : books.map((book) => (
                    <TableRow key={book.id} className="group">
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-3">
                          <BookCover id={book.id} title={book.titulo} author={book.autor} size="xs" />
                          <div className="min-w-0">
                            <p className="max-w-64 truncate font-medium">{book.titulo}</p>
                            <p className="max-w-64 truncate text-xs text-muted-foreground">{book.autor}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {book.categoria.map((name) => (
                            <Badge key={name} variant="secondary" className="font-normal">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-right tabular md:table-cell">{formatNumber(book.paginas)}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{book.idioma}</TableCell>
                      <TableCell className="hidden text-right tabular sm:table-cell">{formatCurrency(book.preco)}</TableCell>
                      <TableCell>
                        <AvailabilityBadge quantity={Number(book.quantidade_disponivel)} />
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${book.titulo}`}>
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setEditing(book)}>
                              <PencilIcon />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(book)}>
                              <Trash2Icon />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <BookFormDialog
        open={creating || Boolean(editing)}
        book={editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir livro?"
        description={
          <>
            <strong className="text-foreground">{deleting?.titulo}</strong> sairá do catálogo. Livros com estoque ou
            histórico de empréstimos não podem ser excluídos.
          </>
        }
        confirmLabel="Excluir"
        destructive
        pending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
