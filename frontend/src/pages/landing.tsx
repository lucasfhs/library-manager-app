import { lazy, Suspense } from "react";
import {
  ArrowRightIcon,
  BarChart3Icon,
  BookOpenTextIcon,
  BuildingIcon,
  CalendarClockIcon,
  CheckIcon,
  DatabaseZapIcon,
  LibraryBigIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react";
import { Link } from "react-router";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteFooter } from "@/layouts/site-footer";
import { SiteHeader } from "@/layouts/site-header";
import { MAX_OPEN_LOANS, LOAN_PERIOD_DAYS } from "@/lib/domain";

const HeroAnimation = lazy(() => import("@/components/hero-animation"));

const features = [
  {
    icon: BookOpenTextIcon,
    title: "Catálogo unificado",
    text: "Títulos, autores, categorias e idiomas de todas as unidades reunidos em uma busca só.",
  },
  {
    icon: BuildingIcon,
    title: "Estoque por biblioteca",
    text: "Cada unidade controla os próprios exemplares, e o leitor vê onde o livro está disponível.",
  },
  {
    icon: CalendarClockIcon,
    title: "Empréstimos com regras",
    text: `Até ${MAX_OPEN_LOANS} empréstimos simultâneos e prazo de ${LOAN_PERIOD_DAYS} dias, com baixa e devolução automáticas no estoque.`,
  },
  {
    icon: BarChart3Icon,
    title: "Relatórios prontos",
    text: "Disponibilidade, acervo por categoria, unidades com mais exemplares e histórico de leitores.",
  },
];

const profiles = [
  {
    icon: UserRoundIcon,
    name: "Leitores",
    title: "Encontre o livro e veja onde retirar.",
    items: [
      "Busca por título, autor ou categoria",
      "Disponibilidade em cada biblioteca",
      "Solicitação de empréstimo em um clique",
      "Histórico com prazos e devoluções",
    ],
    cta: { to: "/loginUser", label: "Entrar como leitor" },
    secondary: { to: "/registerUser", label: "Criar conta" },
  },
  {
    icon: ShieldCheckIcon,
    name: "Operadores",
    title: "Acervo, estoque e devoluções sob controle.",
    items: [
      "Cadastro e edição de livros",
      "Ajuste de exemplares por unidade",
      "Registro de empréstimos e devoluções",
      "Relatórios exportáveis em CSV",
    ],
    cta: { to: "/loginAdmin", label: "Entrar como operador" },
    secondary: { to: "/registerAdmin", label: "Cadastrar operador" },
  },
];

const shelf = [
  { id: 4, title: "Dom Quixote", author: "Miguel de Cervantes", category: "Aventura" },
  { id: 2, title: "Fundação", author: "Isaac Asimov", category: "Ficção" },
  { id: 6, title: "1984", author: "George Orwell", category: "Suspense" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(70%_60%_at_30%_20%,black,transparent)] bg-[size:56px_56px] opacity-60"
          />
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pt-14 pb-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20 lg:pb-28">
            <div className="animate-fade-up">
              <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
                <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
                Catálogo · Estoque · Empréstimos · Relatórios
              </p>
              <h1 className="mt-6 font-heading text-[2.75rem] leading-[1.04] font-semibold tracking-[-0.025em] sm:text-6xl lg:text-[4.25rem]">
                Abra um livro,{" "}
                <span className="relative inline-block italic">
                  <span className="relative z-10">abra sua mente.</span>
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-[0.08em] -z-0 h-[0.32em] rounded-sm bg-brand/45"
                  />
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                O Library Manager reúne o acervo de várias bibliotecas em um só lugar. Leitores consultam a
                disponibilidade e solicitam empréstimos; operadores cuidam do estoque, das devoluções e dos
                relatórios.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  className="h-11 bg-brand px-5 text-[0.9375rem] text-brand-foreground hover:bg-brand/85"
                >
                  <Link to="/loginUser">
                    Consultar o acervo
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 px-5 text-[0.9375rem]">
                  <Link to="/loginAdmin">Entrar como operador</Link>
                </Button>
              </div>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t pt-6 text-sm">
                {[
                  ["Perfis", "Leitor e operador"],
                  ["Prazo", `${LOAN_PERIOD_DAYS} dias por empréstimo`],
                  ["Regras", "Validadas no PostgreSQL"],
                ].map(([term, detail]) => (
                  <div key={term}>
                    <dt className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                      {term}
                    </dt>
                    <dd className="mt-1 font-medium">{detail}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative animate-fade-up [animation-delay:120ms]">
              <div className="relative overflow-hidden rounded-3xl bg-rich-black p-8 shadow-2xl shadow-rich-black/25 ring-1 ring-white/10 sm:p-10">
                <div
                  aria-hidden="true"
                  className="absolute -top-24 -right-20 size-72 rounded-full bg-spring-green/25 blur-3xl"
                />
                <div
                  aria-hidden="true"
                  className="absolute -bottom-28 -left-16 size-72 rounded-full bg-mint-green/15 blur-3xl"
                />
                <div className="relative flex items-center justify-between text-mint-green/80">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase">
                    <LibraryBigIcon className="size-4 text-spring-green" />
                    Acervo compartilhado
                  </span>
                  <DatabaseZapIcon className="size-4" aria-hidden="true" />
                </div>
                <div className="relative mx-auto mt-2 aspect-square max-w-[19rem]">
                  <Suspense fallback={<Skeleton className="size-full rounded-full bg-white/5" />}>
                    <HeroAnimation />
                  </Suspense>
                </div>
                <div className="relative -mt-6 flex items-end justify-center gap-3 border-b border-white/15 pb-px">
                  {shelf.map((book, index) => (
                    <BookCover
                      key={book.id}
                      {...book}
                      size="md"
                      className={[
                        "w-20 origin-bottom-right -rotate-3 sm:w-24",
                        "z-10 w-24 sm:w-28",
                        "w-20 origin-bottom-left rotate-3 sm:w-24",
                      ][index]}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="scroll-mt-20 border-t bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.16em] text-brand-ink uppercase">Recursos</p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Tudo o que a biblioteca precisa, do balcão ao relatório.
              </h2>
            </div>
            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, text }) => (
                <article key={title} className="group bg-card p-6 transition-colors hover:bg-accent/40">
                  <span className="grid size-10 place-items-center rounded-lg bg-accent text-brand-ink transition-transform duration-300 group-hover:-translate-y-0.5">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="perfis" className="scroll-mt-20 bg-rich-black text-mint-green">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.16em] text-spring-green uppercase">Perfis de acesso</p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Uma experiência para cada lado do balcão.
              </h2>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              {profiles.map(({ icon: Icon, ...profile }) => (
                <article
                  key={profile.name}
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-colors hover:border-spring-green/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-spring-green text-rich-black">
                      <Icon className="size-5" />
                    </span>
                    <p className="text-sm font-semibold tracking-wide text-white">{profile.name}</p>
                  </div>
                  <h3 className="mt-6 font-heading text-2xl font-medium text-white">{profile.title}</h3>
                  <ul className="mt-6 space-y-3 text-sm">
                    {profile.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <CheckIcon className="mt-0.5 size-4 shrink-0 text-spring-green" />
                        <span className="text-mint-green/85">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap gap-3 pt-2">
                    <Button asChild className="h-10 bg-spring-green px-4 text-rich-black hover:bg-spring-green/85">
                      <Link to={profile.cta.to}>
                        {profile.cta.label}
                        <ArrowRightIcon data-icon="inline-end" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      className="h-10 px-4 text-mint-green hover:bg-white/10 hover:text-white"
                    >
                      <Link to={profile.secondary.to}>{profile.secondary.label}</Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
