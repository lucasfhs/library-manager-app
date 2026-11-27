import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Combobox } from "@/components/combobox";
import { FormAlert } from "@/components/form-alert";
import { TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { describeError } from "@/lib/api";
import { formatCpf, plural, today } from "@/lib/format";
import { useBooks, useCreateLoan, useLibraries, useReaders, useStock } from "@/lib/queries";

const schema = z.object({
  reader: z.string().min(1, "Selecione o leitor."),
  book: z.string().min(1, "Selecione o livro."),
  library: z.string().min(1, "Selecione a biblioteca."),
  date: z
    .string()
    .min(1, "Informe a data.")
    .refine((value) => value <= today(), "A retirada não pode ser no futuro."),
});

type Values = z.infer<typeof schema>;

export function LoanFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const readers = useReaders();
  const books = useBooks();
  const libraries = useLibraries();
  const stock = useStock();
  const create = useCreateLoan();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { reader: "", book: "", library: "", date: today() },
  });
  const { reset, setValue } = form;
  const book = useWatch({ control: form.control, name: "book" });

  useEffect(() => {
    if (open) {
      create.reset();
      reset({ reader: "", book: "", library: "", date: today() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const libraryName = new Map((libraries.data ?? []).map((library) => [library.id, library.nome]));
  const holdings = (stock.data ?? [])
    .filter((entry) => String(entry.idLivro) === book)
    .sort((a, b) => b.quantidadeDisponivel - a.quantidadeDisponivel);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync({
        cpfUser: values.reader,
        idBook: Number(values.book),
        idLibrary: Number(values.library),
        dateLoan: values.date,
        dateReturn: null,
      });
      toast.success("Empréstimo registrado.");
      onOpenChange(false);
    } catch {
      // Shown inside the dialog: trigger messages explain the rule that blocked it.
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Registrar empréstimo</DialogTitle>
          <DialogDescription>O estoque da biblioteca é atualizado automaticamente.</DialogDescription>
        </DialogHeader>
        <form id="loan-form" onSubmit={onSubmit} noValidate className="space-y-5">
          {create.error && <FormAlert>{describeError(create.error)}</FormAlert>}
          <FieldGroup>
            <Controller
              control={form.control}
              name="reader"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="loan-reader">Leitor</FieldLabel>
                  <Combobox
                    id="loan-reader"
                    value={field.value}
                    onChange={field.onChange}
                    invalid={fieldState.invalid}
                    placeholder="Selecione um leitor"
                    searchPlaceholder="Buscar por nome ou CPF"
                    emptyText="Nenhum leitor encontrado."
                    options={(readers.data ?? [])
                      .toSorted((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                      .map((reader) => ({ value: reader.cpf.trim(), label: reader.nome, hint: formatCpf(reader.cpf) }))}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="book"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="loan-book">Livro</FieldLabel>
                  <Combobox
                    id="loan-book"
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                      setValue("library", "");
                    }}
                    invalid={fieldState.invalid}
                    placeholder="Selecione um livro"
                    searchPlaceholder="Buscar título ou autor"
                    emptyText="Nenhum livro encontrado."
                    options={(books.data ?? [])
                      .toSorted((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"))
                      .map((item) => ({ value: String(item.id), label: item.titulo, hint: item.autor }))}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="library"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined} data-disabled={!book || undefined}>
                  <FieldLabel htmlFor="loan-library">Biblioteca</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!book || holdings.length === 0}>
                    <SelectTrigger id="loan-library" className="w-full" aria-invalid={fieldState.invalid || undefined}>
                      <SelectValue placeholder={book && holdings.length === 0 ? "Nenhuma unidade possui este livro" : "Selecione uma biblioteca"} />
                    </SelectTrigger>
                    <SelectContent>
                      {holdings.map((entry) => (
                        <SelectItem
                          key={entry.id}
                          value={String(entry.idBiblioteca)}
                          disabled={entry.quantidadeDisponivel <= 0}
                        >
                          {libraryName.get(entry.idBiblioteca) ?? `Biblioteca #${entry.idBiblioteca}`}
                          <span className="ml-auto pl-3 text-xs text-muted-foreground">
                            {entry.quantidadeDisponivel > 0
                              ? plural(entry.quantidadeDisponivel, "disponível", "disponíveis")
                              : "Indisponível"}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!book && <FieldDescription>Escolha o livro para ver onde há exemplares.</FieldDescription>}
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <TextField control={form.control} name="date" label="Data de retirada" type="date" max={today()} />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="loan-form" disabled={create.isPending}>
            {create.isPending && <Spinner data-icon="inline-start" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
