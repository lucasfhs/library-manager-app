import { LogOutIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { initials } from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  name: string | undefined;
  detail: string;
  loading?: boolean;
  className?: string;
  compact?: boolean;
};

export function UserMenu({ name, detail, loading, className, compact }: UserMenuProps) {
  const { session, signOut } = useSession();
  const navigate = useNavigate();
  const logout = () => {
    const role = session?.role;
    signOut();
    toast("Sessão encerrada.");
    navigate(role === "operator" ? "/loginAdmin" : "/loginUser", { replace: true });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn("h-10 gap-2.5 px-1.5", className)} aria-label="Menu da conta">
          <Avatar className="size-8">
            <AvatarFallback className="bg-brand text-xs font-semibold text-brand-foreground">
              {name ? initials(name) : "…"}
            </AvatarFallback>
          </Avatar>
          {!compact && (
            <span className="hidden min-w-0 flex-col items-start text-left leading-tight md:flex">
              {loading ? (
                <Skeleton className="h-3.5 w-24" />
              ) : (
                <span className="max-w-40 truncate text-sm font-medium">{name}</span>
              )}
              <span className="max-w-40 truncate text-xs font-normal text-muted-foreground">{detail}</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{detail}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout} variant="destructive">
          <LogOutIcon />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
