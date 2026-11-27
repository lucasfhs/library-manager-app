import { Link } from "react-router";
import { BrandLogo } from "@/components/brand-logo";

export function SiteFooter() {
  return (
    <footer className="border-t bg-card/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <BrandLogo withMark className="text-xl" />
          <p className="max-w-xs text-sm text-muted-foreground">
            Sua central de leitura e aprendizado desde 2025.
          </p>
        </div>
        <nav aria-label="Rodapé" className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm sm:grid-cols-3">
          <p className="col-span-full mb-1 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Acesso
          </p>
          <Link className="text-foreground/80 transition-colors hover:text-foreground" to="/loginUser">
            Área do leitor
          </Link>
          <Link className="text-foreground/80 transition-colors hover:text-foreground" to="/registerUser">
            Criar conta
          </Link>
          <Link className="text-foreground/80 transition-colors hover:text-foreground" to="/loginAdmin">
            Área do operador
          </Link>
        </nav>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-5 py-5 text-xs text-muted-foreground sm:px-8">
          © 2026 Library Manager. Projeto acadêmico de gestão de bibliotecas.
        </p>
      </div>
    </footer>
  );
}
