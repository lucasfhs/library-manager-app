import { BuildingIcon, CheckIcon, LibraryBigIcon } from "lucide-react";
import { toast } from "sonner";
import { BookCover } from "@/components/book-cover";
import { AvailabilityBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { describeError } from "@/lib/api";
import { LOAN_PERIOD_DAYS, MAX_OPEN_LOANS } from "@/lib/domain";
import { formatCurrency, formatDate, formatNumber, today } from "@/lib/format";
import { useAvailability, useCreateLoan } from "@/lib/queries";
import type { CatalogBook } from "@/lib/types";

type BookSheetProps = {
  book: CatalogBook | null;
  cpf: string;
  openLoans: string[];
  blockedReason: string | null;
  onOpenChange: (open: boolean) => void;
};

function dueDate() {
  const date = new Date(`${today()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + LOAN_PERIOD_DAYS);
  return formatDate(date.toISOString().slice(0, 10));
}

export function BookSheet({ book, cpf, openLoans, blockedReason, onOpenChange }: BookSheetProps) {
  const availability = useAvailability(book?.id);
  const createLoan = useCreateLoan();
  const alreadyBorrowed = book ? openLoans.includes(book.titulo) : false;

  const borrow = async (libraryId: number, libraryName: string) => {
    if (!book) return;
    try {
      await createLoan.mutateAsync({
        cpfUser: cpf,
        idBook: book.id,
        idLibrary: libraryId,
        dateLoan: today(),
        dateReturn: null,
      });
      toast.success("Empréstimo registrado", {
        description: `Retire “${book.titulo}” na ${libraryName}. Devolução até ${dueDate()}.`,
      });
    } catch (error) {
      toast.error("Não foi possível registrar o empréstimo", { description: describeError(error) });
    }
  };

  const notice = alreadyBorrowed
    ? "Você já está com um exemplar deste livro."
    : blockedReason;

  return (
    <Sheet open={Boolean(book)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {book && (
          <>
            <SheetHeader className="gap-0 p-6 pb-0">
              <div className="flex gap-5">
                <BookCover
                  id={book.id}
                  title={book.titulo}
                  author={book.autor}
                  category={book.categoria[0]}
                  size="md"
                  className="w-28"
                />
                <div className="min-w-0 pt-1">
                  <SheetTitle className="font-heading text-2xl leading-tight font-semibold">{book.titulo}</SheetTitle>
                  <SheetDescription className="mt-1.5">{book.autor}</SheetDescription>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {book.categoria.map((category) => (
                      <Badge key={category} variant="secondary">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </SheetHeader>
            <dl className="mx-6 mt-6 grid grid-cols-3 divide-x rounded-lg border text-center">
              {[
                ["Páginas", formatNumber(book.paginas)],
                ["Idioma", book.idioma],
                ["Preço", formatCurrency(book.preco)],
              ].map(([term, detail]) => (
                <div key={term} className="px-2 py-3">
                  <dt className="text-xs text-muted-foreground">{term}</dt>
                  <dd className="mt-0.5 truncate text-sm font-semibold tabular">{detail}</dd>
                </div>
              ))}
            </dl>
            <Separator className="my-6" />
            <section aria-labelledby="availability-title" className="px-6 pb-8">
              <div className="flex items-center justify-between gap-4">
                <h3 id="availability-title" className="font-semibold">
                  Onde retirar
                </h3>
                <AvailabilityBadge quantity={Number(book.quantidade_disponivel)} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Prazo de {LOAN_PERIOD_DAYS} dias · até {MAX_OPEN_LOANS} empréstimos simultâneos.
              </p>
              {notice && (
                <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-brand-ink" />
                  {notice}
                </p>
              )}
              <ul className="mt-4 space-y-2">
                {availability.isPending &&
                  Array.from({ length: 2 }, (_, index) => <Skeleton key={index} className="h-16 rounded-lg" />)}
                {availability.isError && (
                  <li className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    {describeError(availability.error)}
                  </li>
                )}
                {availability.data?.length === 0 && (
                  <li className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    <LibraryBigIcon className="size-5" />
                    Nenhuma biblioteca possui este título no momento.
                  </li>
                )}
                {availability.data?.map((entry) => {
                  const pending =
                    createLoan.isPending && createLoan.variables?.idLibrary === entry.id;
                  return (
                    <li
                      key={entry.id}
                      className="flex animate-fade-in items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-foreground/15"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                        <BuildingIcon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{entry.biblioteca}</p>
                        <AvailabilityBadge quantity={entry.quantidade} className="mt-1" />
                      </div>
                      <Button
                        size="sm"
                        variant={entry.quantidade > 0 && !notice ? "default" : "outline"}
                        disabled={entry.quantidade <= 0 || Boolean(notice) || createLoan.isPending}
                        onClick={() => borrow(entry.id, entry.biblioteca)}
                      >
                        {pending && <Spinner data-icon="inline-start" />}
                        Solicitar
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
