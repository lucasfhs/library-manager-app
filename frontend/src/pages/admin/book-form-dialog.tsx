import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormAlert } from "@/components/form-alert";
import { TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { describeError } from "@/lib/api";
import { CATEGORIES } from "@/lib/domain";
import { useSaveBook } from "@/lib/queries";
import type { Book } from "@/lib/types";

const LANGUAGES = ["Português", "Inglês", "Espanhol", "Francês", "Italiano", "Alemão"];

const schema = z.object({
  title: z.string().trim().min(1, "Informe o título.").max(200, "Use no máximo 200 caracteres."),
  author: z.string().trim().min(1, "Informe o autor.").max(100, "Use no máximo 100 caracteres."),
  category: z.array(z.string()).min(1, "Selecione ao menos uma categoria."),
  pages: z
    .string()
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) >= 1,
      "Informe um número inteiro maior que zero."
    ),
  price: z
    .string()
    .refine((value) => value !== "" && Number(value.replace(",", ".")) > 0, "Informe um preço maior que zero."),
  language: z.string().trim().min(1, "Informe o idioma.").max(120),
});

type Values = z.infer<typeof schema>;

const empty: Values = { title: "", author: "", category: [], pages: "", price: "", language: "Português" };

type BookFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book?: Book | null;
};

export function BookFormDialog({ open, onOpenChange, book }: BookFormDialogProps) {
  const save = useSaveBook();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: empty });
  const { reset } = form;

  useEffect(() => {
    if (!open) return;
    save.reset();
    reset(
      book
        ? {
            title: book.titulo,
            author: book.autor,
            category: book.categoria,
            pages: String(book.paginas),
            price: String(book.preco),
            language: book.idioma,
          }
        : empty
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, book, reset]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({
        id: book?.id,
        input: {
          title: values.title.trim(),
          author: values.author.trim(),
          category: values.category,
          pages: Number(values.pages),
          price: Number(values.price.replace(",", ".")),
          language: values.language.trim(),
        },
      });
      toast.success(book ? "Livro atualizado." : "Livro cadastrado.", { description: values.title.trim() });
      onOpenChange(false);
    } catch {
      // The error is shown inside the dialog.
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{book ? "Editar livro" : "Novo livro"}</DialogTitle>
          <DialogDescription>
            {book
              ? "As alterações aparecem no catálogo dos leitores."
              : "O título entra no catálogo sem exemplares; vincule-o a uma biblioteca no Estoque."}
          </DialogDescription>
        </DialogHeader>
        <form id="book-form" onSubmit={onSubmit} noValidate className="space-y-5">
          {save.error && <FormAlert>{describeError(save.error)}</FormAlert>}
          <FieldGroup>
            <TextField control={form.control} name="title" label="Título" autoFocus />
            <TextField control={form.control} name="author" label="Autor" />
            <Controller
              control={form.control}
              name="category"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel id="category-label">Categorias</FieldLabel>
                  <ToggleGroup
                    type="multiple"
                    variant="outline"
                    size="sm"
                    spacing={1.5}
                    value={field.value}
                    onValueChange={field.onChange}
                    aria-labelledby="category-label"
                    className="flex-wrap justify-start"
                  >
                    {CATEGORIES.map((name) => (
                      <ToggleGroupItem
                        key={name}
                        value={name}
                        className="rounded-full! px-3 data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background"
                      >
                        {name}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <div className="grid gap-5 sm:grid-cols-3">
              <TextField
                control={form.control}
                name="pages"
                label="Páginas"
                type="number"
                min={1}
                inputMode="numeric"
              />
              <TextField
                control={form.control}
                name="price"
                label="Preço (R$)"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
              />
              <TextField control={form.control} name="language" label="Idioma" list="book-languages" />
            </div>
            <datalist id="book-languages">
              {LANGUAGES.map((language) => (
                <option key={language} value={language} />
              ))}
            </datalist>
            {book && (
              <FieldDescription>
                O banco de dados bloqueia reajustes de preço acima de 50% para mais ou para menos.
              </FieldDescription>
            )}
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="book-form" disabled={save.isPending}>
            {save.isPending && <Spinner data-icon="inline-start" />}
            {book ? "Salvar alterações" : "Cadastrar livro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
