import { ArrowRightIcon, MenuIcon } from "lucide-react";
import { Link } from "react-router";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/session";

export function SiteHeader() {
  const { session } = useSession();
  const home = session?.role === "operator" ? "/admin" : "/user";
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          to="/"
          className="rounded-md text-[1.375rem] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <BrandLogo withMark />
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-1 text-sm md:flex">
          <Button variant="ghost" asChild>
            <a href="#recursos">Recursos</a>
          </Button>
          <Button variant="ghost" asChild>
            <a href="#perfis">Perfis de acesso</a>
          </Button>
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {session ? (
            <Button asChild className="h-9 px-3.5">
              <Link to={home}>
                Ir para o painel
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden h-9 sm:inline-flex">
                <Link to="/loginUser">Área do leitor</Link>
              </Button>
              <Button asChild className="hidden h-9 px-3.5 sm:inline-flex">
                <Link to="/loginAdmin">Área do operador</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="sm:hidden" aria-label="Abrir menu">
                    <MenuIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild>
                    <Link to="/loginUser">Área do leitor</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/loginAdmin">Área do operador</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/registerUser">Criar conta de leitor</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
