import { BookOpenTextIcon, HistoryIcon } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { formatCpf } from "@/lib/format";
import { useReader } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const links = [
  { to: "/user", label: "Catálogo", icon: BookOpenTextIcon },
  { to: "/loan", label: "Meus empréstimos", icon: HistoryIcon },
];

export function ReaderLayout() {
  const { session } = useSession();
  const reader = useReader(session?.subject);
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 sm:px-8">
          <Link to="/user" className="rounded-md text-xl">
            <BrandLogo />
          </Link>
          <nav aria-label="Área do leitor" className="hidden items-center gap-1 sm:flex">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "relative inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    isActive &&
                      "text-foreground after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-brand"
                  )
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu
              name={reader.data?.nome}
              loading={reader.isPending}
              detail={session ? `CPF ${formatCpf(session.subject)}` : ""}
            />
          </div>
        </div>
        <nav aria-label="Área do leitor" className="flex border-t sm:hidden">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 items-center justify-center gap-2 border-b-2 border-transparent py-2.5 text-sm font-medium text-muted-foreground",
                  isActive && "border-brand text-foreground"
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
