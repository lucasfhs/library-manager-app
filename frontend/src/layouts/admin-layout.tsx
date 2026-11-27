import {
  BarChart3Icon,
  BookOpenTextIcon,
  BuildingIcon,
  ArrowLeftRightIcon,
  LayoutDashboardIcon,
  PackageIcon,
  UsersIcon,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSession } from "@/lib/session";
import type { LucideIcon } from "lucide-react";

type NavEntry = { to: string; label: string; icon: LucideIcon; end?: boolean };

const adminNavigation: { label: string; items: NavEntry[] }[] = [
  {
    label: "Painel",
    items: [{ to: "/admin", label: "Visão geral", icon: LayoutDashboardIcon, end: true }],
  },
  {
    label: "Acervo",
    items: [
      { to: "/admin/books", label: "Livros", icon: BookOpenTextIcon },
      { to: "/library", label: "Estoque", icon: PackageIcon },
      { to: "/admin/libraries", label: "Bibliotecas", icon: BuildingIcon },
    ],
  },
  {
    label: "Circulação",
    items: [
      { to: "/admin/loans", label: "Empréstimos", icon: ArrowLeftRightIcon },
      { to: "/admin/readers", label: "Leitores", icon: UsersIcon },
    ],
  },
  {
    label: "Análise",
    items: [{ to: "/admin/reports", label: "Relatórios", icon: BarChart3Icon }],
  },
];

function NavItem({ to, label, icon: Icon, end }: NavEntry) {
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const active = end ? pathname === to : pathname.startsWith(to);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={label}
        className="relative data-[active=true]:font-medium data-[active=true]:before:absolute data-[active=true]:before:inset-y-1.5 data-[active=true]:before:-left-2 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-sidebar-primary group-data-[collapsible=icon]:data-[active=true]:before:hidden"
      >
        <NavLink to={to} end={end} onClick={() => isMobile && setOpenMobile(false)}>
          <Icon />
          <span>{label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function AdminSidebar() {
  const { session } = useSession();
  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="h-16 justify-center px-3">
        <Link to="/admin" className="flex items-center gap-2 overflow-hidden rounded-md text-lg text-white">
          <BrandLogo onDark className="px-1 group-data-[collapsible=icon]:hidden" />
          {/* Collapsed sidebar: the initials keep the brand visible in the narrow rail. */}
          <span
            aria-hidden="true"
            className="hidden w-full text-center font-brand text-base font-extrabold tracking-tight text-spring-green group-data-[collapsible=icon]:block"
          >
            LM
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {adminNavigation.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] tracking-[0.14em] text-sidebar-foreground/75 uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavItem key={item.to} {...item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <UserMenu
          name={session?.subject}
          detail="Operador"
          className="w-full justify-start text-sidebar-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&_.text-muted-foreground]:text-sidebar-foreground/60"
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function currentTitle(pathname: string) {
  for (const group of adminNavigation) {
    for (const item of group.items) {
      if (item.end ? pathname === item.to : pathname.startsWith(item.to)) return [group.label, item.label];
    }
  }
  return ["Painel", "Visão geral"];
}

export function AdminLayout() {
  const { pathname } = useLocation();
  const [section, title] = currentTitle(pathname);
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5!" />
          <nav aria-label="Trilha" className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{section}</span>
            <span className="hidden text-muted-foreground/50 sm:inline">/</span>
            <span className="truncate font-medium">{title}</span>
          </nav>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
