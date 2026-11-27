import { useMemo, useState } from "react";
import { SearchIcon, UsersIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState } from "@/components/states";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCpf, formatPhone, initials, onlyDigits, plural } from "@/lib/format";
import { useReaders } from "@/lib/queries";
import { useLoanRows } from "@/lib/use-loan-rows";

const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function ReadersPage() {
  const readers = useReaders();
  const loans = useLoanRows();
  const [query, setQuery] = useState("");

  const openByReader = useMemo(() => {
    const result = new Map<string, { open: number; overdue: number }>();
    loans.rows.forEach((row) => {
      if (row.status === "returned") return;
      const key = row.loan.cpfUsuario.trim();
      const current = result.get(key) ?? { open: 0, overdue: 0 };
      result.set(key, { open: current.open + 1, overdue: current.overdue + (row.status === "overdue" ? 1 : 0) });
    });
    return result;
  }, [loans.rows]);

  const rows = useMemo(() => {
    const term = normalize(query.trim());
    const digits = onlyDigits(query);
    return (readers.data ?? [])
      .filter(
        (reader) =>
          !term ||
          normalize(`${reader.nome} ${reader.email ?? ""}`).includes(term) ||
          (digits.length > 0 && reader.cpf.includes(digits))
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [readers.data, query]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Circulação"
        title="Leitores"
        description={readers.data ? `${plural(readers.data.length, "leitor cadastrado", "leitores cadastrados")}.` : "Pessoas cadastradas para empréstimos."}
      />
      <InputGroup className="sm:max-w-xs">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          placeholder="Buscar nome, e-mail ou CPF"
          aria-label="Buscar nome, e-mail ou CPF"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </InputGroup>
      {readers.isError ? (
        <ErrorState error={readers.error} onRetry={() => readers.refetch()} />
      ) : !readers.isPending && rows.length === 0 ? (
        <EmptyState icon={<UsersIcon />} title="Nenhum leitor encontrado" />
      ) : (
        <Card className="gap-0 overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-5">Leitor</TableHead>
                <TableHead className="hidden md:table-cell">CPF</TableHead>
                <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                <TableHead className="hidden sm:table-cell">Cidade</TableHead>
                <TableHead className="pr-5 text-right">Empréstimos em aberto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readers.isPending
                ? Array.from({ length: 6 }, (_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={5} className="pl-5">
                        <Skeleton className="h-9 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : rows.map((reader) => {
                    const stats = openByReader.get(reader.cpf.trim());
                    return (
                      <TableRow key={reader.cpf}>
                        <TableCell className="pl-5">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-accent text-xs font-semibold text-brand-ink">
                                {initials(reader.nome)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="max-w-56 truncate font-medium">{reader.nome}</p>
                              <p className="max-w-56 truncate text-xs text-muted-foreground">{reader.email ?? "—"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden tabular md:table-cell">{formatCpf(reader.cpf)}</TableCell>
                        <TableCell className="hidden tabular text-muted-foreground lg:table-cell">
                          {formatPhone(reader.telefone)}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">
                          {[reader.endereco.cidade, reader.endereco.estado].filter(Boolean).join(" · ")}
                        </TableCell>
                        <TableCell className="pr-5 text-right">
                          {loans.isPending ? (
                            <Skeleton className="ml-auto h-5 w-10" />
                          ) : stats ? (
                            <div className="flex justify-end gap-1.5">
                              <Badge variant="secondary" className="tabular">
                                {stats.open}
                              </Badge>
                              {stats.overdue > 0 && (
                                <Badge className="border-0 bg-destructive/10 text-destructive">
                                  {plural(stats.overdue, "atrasado", "atrasados")}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
