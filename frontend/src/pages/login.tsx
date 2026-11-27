import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { FormAlert } from "@/components/form-alert";
import { PasswordField, TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { AuthHeading, AuthLayout } from "@/layouts/auth-layout";
import { describeError } from "@/lib/api";
import { formatCpf, onlyDigits } from "@/lib/format";
import { useLogin } from "@/lib/queries";
import { useSession, type Role } from "@/lib/session";

const copy = {
  reader: {
    aside: {
      eyebrow: "Área do leitor",
      title: "Seu próximo livro está a poucos cliques.",
      points: [
        "Pesquise o acervo de todas as bibliotecas",
        "Veja em qual unidade há exemplares disponíveis",
        "Acompanhe prazos e devoluções",
      ],
    },
    title: "Entrar como leitor",
    description: "Use o CPF e a senha informados no cadastro.",
    loginLabel: "CPF",
    home: "/user",
    register: { to: "/registerUser", question: "Ainda não tem conta?", label: "Criar conta" },
    other: { to: "/loginAdmin", label: "Sou operador" },
  },
  operator: {
    aside: {
      eyebrow: "Área do operador",
      title: "Acervo, estoque e empréstimos sob controle.",
      points: [
        "Cadastre e edite os livros do catálogo",
        "Ajuste os exemplares de cada biblioteca",
        "Registre devoluções e acompanhe relatórios",
      ],
    },
    title: "Entrar como operador",
    description: "Acesso restrito à equipe das bibliotecas.",
    loginLabel: "Usuário",
    home: "/admin",
    register: { to: "/registerAdmin", question: "Novo na equipe?", label: "Cadastrar operador" },
    other: { to: "/loginUser", label: "Sou leitor" },
  },
} as const;

const readerSchema = z.object({
  login: z.string().refine((value) => onlyDigits(value).length === 11, "Informe os 11 dígitos do CPF."),
  password: z.string().min(1, "Informe a senha."),
});

const operatorSchema = z.object({
  login: z.string().trim().min(1, "Informe o usuário."),
  password: z.string().min(1, "Informe a senha."),
});

type Values = z.infer<typeof operatorSchema>;

export default function LoginPage({ role }: { role: Role }) {
  const text = copy[role];
  const { signIn, expired } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin(role);
  const form = useForm<Values>({
    resolver: zodResolver(role === "reader" ? readerSchema : operatorSchema),
    defaultValues: { login: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async ({ login: identifier, password }) => {
    try {
      const response = await login.mutateAsync({
        login: role === "reader" ? onlyDigits(identifier) : identifier.trim(),
        password,
      });
      signIn(response.result);
      toast.success(role === "reader" ? "Bem-vindo(a) de volta!" : "Sessão iniciada.");
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? text.home, { replace: true });
    } catch {
      form.setFocus("password");
    }
  });

  return (
    <AuthLayout aside={text.aside}>
      <AuthHeading title={text.title} description={text.description} />
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {expired && !login.error && <FormAlert tone="info">Sua sessão expirou. Entre novamente.</FormAlert>}
        {login.error && <FormAlert>{describeError(login.error)}</FormAlert>}
        <FieldGroup>
          <TextField
            control={form.control}
            name="login"
            label={text.loginLabel}
            autoComplete="username"
            autoFocus
            {...(role === "reader"
              ? { inputMode: "numeric" as const, placeholder: "000.000.000-00", mask: formatCpf }
              : { placeholder: "seu.usuario" })}
          />
          <PasswordField control={form.control} name="password" label="Senha" />
        </FieldGroup>
        <Button type="submit" className="h-10 w-full" disabled={login.isPending}>
          {login.isPending && <Spinner data-icon="inline-start" />}
          {login.isPending ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-sm">
        <p className="text-muted-foreground">
          {text.register.question}{" "}
          <Link to={text.register.to} className="font-medium text-foreground underline-offset-4 hover:underline">
            {text.register.label}
          </Link>
        </p>
        <Link
          to={text.other.to}
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {text.other.label}
        </Link>
      </div>
    </AuthLayout>
  );
}
