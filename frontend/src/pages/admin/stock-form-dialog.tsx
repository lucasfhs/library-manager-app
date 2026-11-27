import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Combobox } from "@/components/combobox";
import { FormAlert } from "@/components/form-alert";
import { TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { describeError } from "@/lib/api";
import { useBooks, useLibraries, useSaveStock, useStock } from "@/lib/queries";

const schema = z.object({
  book: z.string().min(1, "Selecione o livro."),
  library: z.string().min(1, "Selecione a biblioteca."),
  amount: z.string().refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0, "Informe um número inteiro."),
});

type Values = z.infer<typeof schema>;

export function StockFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const books = useBooks();
  const libraries = useLibraries();
  const stock = useStock();
  const save = useSaveStock();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { book: "", library: "", amount: "1" } });
  const { reset } = form;

  useEffect(() => {
    if (open) {
      save.reset();
      reset({ book: "", library: "", amount: "1" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const onSubmit = form.handleSubmit(async (values) => {
    const exists = stock.data?.some(
      (entry) => entry.idLivro === Number(values.book) && entry.idBiblioteca === Number(values.library)
    );
    if (exists) {
      form.setError("library", { message: "Este livro já está nesta biblioteca. Ajuste a quantidade na tabela." });
      return;
    }
    try {
      await save.mutateAsync({
        input: { idBook: Number(values.book), idLibrary: Number(values.library), amount: Number(values.amount) },
      });
      toast.success("Estoque atualizado.");
      onOpenChange(false);
    } catch {
      // Shown inside the dialog.
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Adicionar ao estoque</DialogTitle>
          <DialogDescription>Vincule um livro a uma biblioteca e informe os exemplares disponíveis.</DialogDescription>
        </DialogHeader>
        <form id="stock-form" onSubmit={onSubmit} noValidate className="space-y-5">
          {save.error && <FormAlert>{describeError(save.error)}</FormAlert>}
          <FieldGroup>
            <Controller
              control={form.control}
              name="book"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="stock-book">Livro</FieldLabel>
                  <Combobox
                    id="stock-book"
                    value={field.value}
                    onChange={field.onChange}
                    invalid={fieldState.invalid}
                    placeholder="Selecione um livro"
                    searchPlaceholder="Buscar título ou autor"
                    emptyText="Nenhum livro encontrado."
                    options={(books.data ?? [])
                      .toSorted((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"))
                      .map((book) => ({ value: String(book.id), label: book.titulo, hint: book.autor }))}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="library"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="stock-library">Biblioteca</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="stock-library" className="w-full" aria-invalid={fieldState.invalid || undefined}>
                      <SelectValue placeholder="Selecione uma biblioteca" />
                    </SelectTrigger>
                    <SelectContent>
                      {(libraries.data ?? []).map((library) => (
                        <SelectItem key={library.id} value={String(library.id)}>
                          {library.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <TextField control={form.control} name="amount" label="Exemplares disponíveis" type="number" min={0} inputMode="numeric" />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="stock-form" disabled={save.isPending}>
            {save.isPending && <Spinner data-icon="inline-start" />}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
