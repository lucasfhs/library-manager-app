import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { BuildingIcon, MapPinIcon, PencilIcon, PhoneIcon, PlusIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormAlert } from "@/components/form-alert";
import { TextField } from "@/components/form-fields";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { describeError } from "@/lib/api";
import { formatNumber, formatPhone, onlyDigits } from "@/lib/format";
import { useLibraries, useSaveLibrary, useStock } from "@/lib/queries";
import type { Library } from "@/lib/types";

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
const formatCep = (value: string) =>
  onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");
const required = (label: string) =>
  z.string().trim().min(1, `Informe ${label}.`).max(100, "Use no máximo 100 caracteres.");

const schema = z.object({
  name: required("o nome"),
  phone: z.string().refine((value) => [10, 11].includes(onlyDigits(value).length), "Informe DDD e número."),
  postalCode: z.string().refine((value) => onlyDigits(value).length === 8, "Informe os 8 dígitos do CEP."),
  street: required("a rua e o número"),
  neighborhood: required("o bairro"),
  city: required("a cidade"),
  state: z.string().min(1, "Selecione o estado."),
});

type Values = z.infer<typeof schema>;
const empty: Values = { name: "", phone: "", postalCode: "", street: "", neighborhood: "", city: "", state: "" };

function LibraryFormDialog({
  library,
  open,
  onOpenChange,
}: {
  library: Library | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useSaveLibrary();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: empty });
  const { reset } = form;

  useEffect(() => {
    if (!open) return;
    save.reset();
    reset(
      library
        ? {
            name: library.nome,
            phone: formatPhone(library.telefone),
            postalCode: formatCep(library.endereco.cep ?? ""),
            street: library.endereco.rua ?? "",
            neighborhood: library.endereco.bairro ?? "",
            city: library.endereco.cidade ?? "",
            state: UFS.includes(library.endereco.estado) ? library.endereco.estado : "",
          }
        : empty
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, library, reset]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({
        id: library?.id,
        input: {
          name: values.name.trim(),
          phoneNumber: onlyDigits(values.phone),
          address: {
            street: values.street.trim(),
            neighborhood: values.neighborhood.trim(),
            city: values.city.trim(),
            state: values.state,
            country: library?.endereco.pais || "Brasil",
            postal_code: formatCep(values.postalCode),
          },
        },
      });
      toast.success(library ? "Biblioteca atualizada." : "Biblioteca cadastrada.", { description: values.name.trim() });
      onOpenChange(false);
    } catch {
      // Shown inside the dialog.
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {library ? "Editar biblioteca" : "Nova biblioteca"}
          </DialogTitle>
          <DialogDescription>Endereço e telefone aparecem para a equipe ao organizar o estoque.</DialogDescription>
        </DialogHeader>
        <form id="library-form" onSubmit={onSubmit} noValidate className="space-y-5">
          {save.error && <FormAlert>{describeError(save.error)}</FormAlert>}
          <FieldGroup>
            <TextField control={form.control} name="name" label="Nome" autoFocus />
            <TextField
              control={form.control}
              name="phone"
              label="Telefone"
              type="tel"
              mask={formatPhone}
              placeholder="(31) 3333-0000"
            />
            <div className="grid gap-5 sm:grid-cols-[9rem_1fr]">
              <TextField
                control={form.control}
                name="postalCode"
                label="CEP"
                inputMode="numeric"
                mask={formatCep}
                placeholder="00000-000"
              />
              <TextField control={form.control} name="street" label="Rua e número" />
            </div>
            <TextField control={form.control} name="neighborhood" label="Bairro" />
            <div className="grid gap-5 sm:grid-cols-[1fr_7rem]">
              <TextField control={form.control} name="city" label="Cidade" />
              <Controller
                control={form.control}
                name="state"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="library-state">Estado</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="library-state"
                        className="w-full"
                        aria-invalid={fieldState.invalid || undefined}
                      >
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {UFS.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="library-form" disabled={save.isPending}>
            {save.isPending && <Spinner data-icon="inline-start" />}
            {library ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LibrariesPage() {
  const libraries = useLibraries();
  const stock = useStock();
  const [editing, setEditing] = useState<Library | null>(null);
  const [creating, setCreating] = useState(false);

  const totals = useMemo(() => {
    const result = new Map<number, { titles: number; copies: number }>();
    (stock.data ?? []).forEach((entry) => {
      const current = result.get(entry.idBiblioteca) ?? { titles: 0, copies: 0 };
      result.set(entry.idBiblioteca, {
        titles: current.titles + 1,
        copies: current.copies + entry.quantidadeDisponivel,
      });
    });
    return result;
  }, [stock.data]);

  const sorted = (libraries.data ?? []).toSorted((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Acervo"
        title="Bibliotecas"
        description="Unidades que compartilham o catálogo e mantêm o próprio estoque."
        actions={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon data-icon="inline-start" />
            Nova biblioteca
          </Button>
        }
      />
      {libraries.isError ? (
        <ErrorState error={libraries.error} onRetry={() => libraries.refetch()} />
      ) : libraries.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={<BuildingIcon />} title="Nenhuma biblioteca cadastrada" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((library, index) => {
            const total = totals.get(library.id) ?? { titles: 0, copies: 0 };
            const { rua, bairro, cidade, estado, cep } = library.endereco;
            return (
              <Card
                key={library.id}
                className="animate-fade-up gap-4 transition-shadow hover:shadow-md"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <CardHeader className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-brand-ink">
                    <BuildingIcon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{library.nome}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {cidade} · {estado}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="flex gap-2 text-muted-foreground">
                    <MapPinIcon className="mt-0.5 size-4 shrink-0" />
                    <span>
                      {[rua, bairro].filter(Boolean).join(", ")}
                      {cep && ` · CEP ${cep}`}
                    </span>
                  </p>
                  <p className="flex gap-2 text-muted-foreground">
                    <PhoneIcon className="mt-0.5 size-4 shrink-0" />
                    <span className="tabular">{formatPhone(library.telefone)}</span>
                  </p>
                </CardContent>
                <CardFooter className="mt-auto flex items-center justify-between border-t pt-4!">
                  <dl className="flex gap-6 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Títulos</dt>
                      <dd className="font-semibold tabular">{stock.isPending ? "—" : formatNumber(total.titles)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Exemplares</dt>
                      <dd className="font-semibold tabular">{stock.isPending ? "—" : formatNumber(total.copies)}</dd>
                    </div>
                  </dl>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(library)}>
                    <PencilIcon data-icon="inline-start" />
                    Editar
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
      <LibraryFormDialog
        library={editing}
        open={creating || Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
      />
    </div>
  );
}
