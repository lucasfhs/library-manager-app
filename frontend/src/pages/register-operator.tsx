import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { FormAlert } from "@/components/form-alert";
import { PasswordField, TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { AuthHeading, AuthLayout } from "@/layouts/auth-layout";
import { describeError } from "@/lib/api";
import { useRegisterOperator } from "@/lib/queries";

const schema = z
  .object({
    userLogin: z
      .string()
      .trim()
      .min(3, "Use ao menos 3 caracteres.")
      .max(50, "Use no máximo 50 caracteres.")
      .regex(/^[\w.-]+$/, "Use letras, números, ponto, hífen ou sublinhado."),
    password: z.string().min(4, "Use ao menos 4 caracteres.").max(30, "Use no máximo 30 caracteres."),
    confirmPassword: z.string(),
    secretKey: z.string().min(1, "Informe a chave de cadastro."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem.",
  });

type Values = z.infer<typeof schema>;

export default function RegisterOperatorPage() {
  const navigate = useNavigate();
  const register = useRegisterOperator();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { userLogin: "", password: "", confirmPassword: "", secretKey: "" },
  });

  const onSubmit = form.handleSubmit(async ({ userLogin, password, secretKey }) => {
    try {
      await register.mutateAsync({ userLogin: userLogin.trim(), password, secretKey });
      toast.success("Operador cadastrado. Entre com o novo usuário.");
      navigate("/loginAdmin");
    } catch {
      form.setFocus("secretKey");
    }
  });

  return (
    <AuthLayout
      aside={{
        eyebrow: "Equipe",
        title: "Acesso completo ao acervo e aos relatórios.",
        points: [
          "Contas de operador podem alterar o catálogo e o estoque",
          "O cadastro exige a chave definida pela administração",
          "Cada operador entra com o próprio usuário",
        ],
      }}
    >
      <AuthHeading title="Cadastrar operador" description="Crie o acesso de um novo membro da equipe." />
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {register.error && <FormAlert>{describeError(register.error)}</FormAlert>}
        <FieldGroup>
          <TextField
            control={form.control}
            name="userLogin"
            label="Usuário"
            autoComplete="username"
            placeholder="nome.sobrenome"
            autoFocus
          />
          <PasswordField control={form.control} name="password" label="Senha" autoComplete="new-password" />
          <PasswordField
            control={form.control}
            name="confirmPassword"
            label="Confirmar senha"
            autoComplete="new-password"
          />
          <PasswordField
            control={form.control}
            name="secretKey"
            label="Chave de cadastro"
            autoComplete="off"
            description="Fornecida pela administração do sistema."
          />
        </FieldGroup>
        <Button type="submit" className="h-10 w-full" disabled={register.isPending}>
          {register.isPending && <Spinner data-icon="inline-start" />}
          {register.isPending ? "Cadastrando…" : "Cadastrar operador"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Já tem acesso?{" "}
          <Link to="/loginAdmin" className="font-medium text-foreground underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
