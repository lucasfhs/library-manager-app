import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { FormAlert } from "@/components/form-alert";
import { PasswordField, TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { AuthHeading, AuthLayout } from "@/layouts/auth-layout";
import { describeError } from "@/lib/api";
import { formatCpf, formatPhone, onlyDigits, today } from "@/lib/format";
import { useRegisterReader } from "@/lib/queries";

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

const formatCep = (value: string) =>
  onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");

const required = (label: string, max = 100) =>
  z.string().trim().min(1, `Informe ${label}.`).max(max, `Use no máximo ${max} caracteres.`);

const schema = z
  .object({
    name: required("o nome completo"),
    cpf: z.string().refine((value) => onlyDigits(value).length === 11, "Informe os 11 dígitos do CPF."),
    birthDate: z
      .string()
      .min(1, "Informe a data de nascimento.")
      .refine((value) => value < today(), "A data precisa estar no passado."),
    email: z.email("Informe um e-mail válido.").max(100),
    phoneNumber: z.string().refine((value) => {
      const length = onlyDigits(value).length;
      return length === 10 || length === 11;
    }, "Informe DDD e número."),
    postalCode: z.string().refine((value) => onlyDigits(value).length === 8, "Informe os 8 dígitos do CEP."),
    street: required("a rua e o número"),
    neighborhood: required("o bairro"),
    city: required("a cidade"),
    state: z.string().min(1, "Selecione o estado."),
    password: z.string().min(4, "Use ao menos 4 caracteres.").max(30, "Use no máximo 30 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem.",
  });

type Values = z.infer<typeof schema>;

export default function RegisterReaderPage() {
  const navigate = useNavigate();
  const register = useRegisterReader();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      cpf: "",
      birthDate: "",
      email: "",
      phoneNumber: "",
      postalCode: "",
      street: "",
      neighborhood: "",
      city: "",
      state: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await register.mutateAsync({
        cpf: onlyDigits(values.cpf),
        name: values.name.trim(),
        email: values.email.trim(),
        phoneNumber: onlyDigits(values.phoneNumber),
        birthDate: values.birthDate,
        password: values.password,
        address: {
          street: values.street.trim(),
          neighborhood: values.neighborhood.trim(),
          city: values.city.trim(),
          state: values.state,
          country: "Brasil",
          postal_code: formatCep(values.postalCode),
        },
      });
      toast.success("Conta criada. Entre com seu CPF e senha.");
      navigate("/loginUser");
    } catch {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  return (
    <AuthLayout
      aside={{
        eyebrow: "Nova conta",
        title: "Um cadastro, todas as bibliotecas.",
        points: [
          "Acesse o catálogo completo das unidades",
          "Solicite empréstimos onde houver exemplares",
          "Acompanhe seu histórico em um só lugar",
        ],
      }}
    >
      <AuthHeading title="Criar conta de leitor" description="Leva menos de dois minutos." />
      <form onSubmit={onSubmit} noValidate className="space-y-8">
        {register.error && <FormAlert>{describeError(register.error)}</FormAlert>}
        <FieldSet>
          <FieldLegend>Dados pessoais</FieldLegend>
          <FieldGroup>
            <TextField control={form.control} name="name" label="Nome completo" autoComplete="name" autoFocus />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                control={form.control}
                name="cpf"
                label="CPF"
                inputMode="numeric"
                placeholder="000.000.000-00"
                mask={formatCpf}
              />
              <TextField control={form.control} name="birthDate" label="Nascimento" type="date" max={today()} />
            </div>
          </FieldGroup>
        </FieldSet>
        <Separator />
        <FieldSet>
          <FieldLegend>Contato</FieldLegend>
          <FieldGroup>
            <TextField control={form.control} name="email" label="E-mail" type="email" autoComplete="email" />
            <TextField
              control={form.control}
              name="phoneNumber"
              label="Telefone"
              type="tel"
              autoComplete="tel-national"
              placeholder="(31) 99999-0000"
              mask={formatPhone}
            />
          </FieldGroup>
        </FieldSet>
        <Separator />
        <FieldSet>
          <FieldLegend>Endereço</FieldLegend>
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-[9rem_1fr]">
              <TextField
                control={form.control}
                name="postalCode"
                label="CEP"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                mask={formatCep}
              />
              <TextField
                control={form.control}
                name="street"
                label="Rua e número"
                autoComplete="street-address"
                placeholder="Rua da Bahia, 1148"
              />
            </div>
            <TextField control={form.control} name="neighborhood" label="Bairro" />
            <div className="grid gap-5 sm:grid-cols-[1fr_7rem]">
              <TextField control={form.control} name="city" label="Cidade" autoComplete="address-level2" />
              <Controller
                control={form.control}
                name="state"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="state">Estado</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="state" className="w-full" aria-invalid={fieldState.invalid || undefined}>
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
        </FieldSet>
        <Separator />
        <FieldSet>
          <FieldLegend>Acesso</FieldLegend>
          <FieldGroup>
            <PasswordField control={form.control} name="password" label="Senha" autoComplete="new-password" />
            <PasswordField
              control={form.control}
              name="confirmPassword"
              label="Confirmar senha"
              autoComplete="new-password"
            />
          </FieldGroup>
        </FieldSet>
        <Button type="submit" className="h-10 w-full" disabled={register.isPending}>
          {register.isPending && <Spinner data-icon="inline-start" />}
          {register.isPending ? "Criando conta…" : "Criar conta"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/loginUser" className="font-medium text-foreground underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
