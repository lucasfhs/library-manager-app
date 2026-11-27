import type { ReactNode } from "react";
import { ArrowLeftIcon, CheckIcon } from "lucide-react";
import { Link } from "react-router";
import { BookCover } from "@/components/book-cover";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

type AuthLayoutProps = {
  aside: { eyebrow: string; title: string; points: readonly string[] };
  children: ReactNode;
};

const covers = [
  { id: 7, title: "O Senhor dos Anéis", author: "J.R.R. Tolkien", category: "Fantasia" },
  { id: 3, title: "A Breve História do Tempo", author: "Stephen Hawking", category: "Ciência" },
  { id: 5, title: "Harry Potter e a Pedra Filosofal", author: "J.K. Rowling", category: "Fantasia" },
];

export function AuthLayout({ aside, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden overflow-hidden bg-rich-black p-10 text-mint-green lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col xl:p-14">
        <div aria-hidden="true" className="absolute -top-32 -left-24 size-96 rounded-full bg-spring-green/20 blur-3xl" />
        <Link to="/" className="relative w-fit rounded-md text-2xl text-white focus-visible:ring-3 focus-visible:ring-spring-green/50 focus-visible:outline-none">
          <BrandLogo withMark onDark />
        </Link>
        <div className="relative mt-auto max-w-md">
          <p className="text-xs font-semibold tracking-[0.16em] text-spring-green uppercase">{aside.eyebrow}</p>
          <h2 className="mt-4 font-heading text-4xl leading-tight font-medium text-white">{aside.title}</h2>
          <ul className="mt-8 space-y-3 text-sm">
            {aside.points.map((point) => (
              <li key={point} className="flex gap-3">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-spring-green" />
                <span className="text-mint-green/85">{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mt-14 flex gap-4" aria-hidden="true">
          {covers.map((cover) => (
            <BookCover
              key={cover.id}
              {...cover}
              size="md"
              className="w-28 opacity-90 transition-transform duration-500 hover:-translate-y-1"
            />
          ))}
        </div>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild className="-ml-2 text-muted-foreground">
            <Link to="/">
              <ArrowLeftIcon data-icon="inline-start" />
              Início
            </Link>
          </Button>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10">
          <Link to="/" className="mb-10 w-fit text-2xl lg:hidden">
            <BrandLogo withMark />
          </Link>
          <div className="animate-fade-up">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function AuthHeading({ title, description }: { title: string; description: ReactNode }) {
  return (
    <div className="mb-8 space-y-2">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
