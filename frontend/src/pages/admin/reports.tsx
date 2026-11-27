import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import { useSearchParams } from "react-router";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState } from "@/components/states";
import { AvailabilityBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadCsv } from "@/lib/csv";
import { formatCurrency, formatNumber, plural } from "@/lib/format";
import {
  useBooksByCategory,
  useCatalog,
  useHighAvailability,
  useLibraryHoldings,
  useMatureCustomers,
} from "@/lib/queries";
import type { CatalogBook } from "@/lib/types";

type Column<T> = { header: string; cell: (row: T) => ReactNode; csv: (row: T) => unknown; numeric?: boolean };

function ReportTable<T>({
  query,
  columns,
  title,
  description,
  filename,
  rowKey,
}: {
  query: UseQueryResult<T[]>;
  columns: Column<T>[];
  title: string;
  description: string;
  filename: string;
  rowKey: (row: T, index: number) => string | number;
}) {
  const rows = query.data ?? [];
  const exportCsv = () =>
    downloadCsv(
      filename,
      rows.map((row) => Object.fromEntries(columns.map((column) => [column.header, column.csv(row)])))
    );
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <CardHeader className="border-b py-5">
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description}
          {query.data && ` · ${plural(rows.length, "linha", "linhas")}`}
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
            <DownloadIcon data-icon="inline-start" />
            Exportar CSV
          </Button>
        </CardAction>
      </CardHeader>
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} className="m-5" />
      ) : query.isPending ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="Sem resultados" description="Nenhum registro atende a este relatório." className="m-5" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((column) => (
                <TableHead key={column.header} className={`first:pl-5 last:pr-5 ${column.numeric ? "text-right" : ""}`}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={rowKey(row, index)}>
                {columns.map((column) => (
                  <TableCell
                    key={column.header}
                    className={`first:pl-5 last:pr-5 ${column.numeric ? "text-right tabular" : ""}`}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

const reports = [
  { value: "catalogo", label: "Catálogo" },
  { value: "disponibilidade", label: "Alta disponibilidade" },
  { value: "categorias", label: "Por categoria" },
  { value: "bibliotecas", label: "Acervo por biblioteca" },
  { value: "leitores", label: "Leitores acima de 25 anos" },
];

export default function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("relatorio") ?? "catalogo";
  const catalog = useCatalog();
  const high = useHighAvailability();
  const categories = useBooksByCategory();
  const holdings = useLibraryHoldings();
  const mature = useMatureCustomers();

  const bookColumns: Column<CatalogBook>[] = [
    { header: "Título", cell: (row) => <span className="font-medium">{row.titulo}</span>, csv: (row) => row.titulo },
    { header: "Autor", cell: (row) => row.autor, csv: (row) => row.autor },
    {
      header: "Categorias",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.categoria.map((name) => (
            <Badge key={name} variant="secondary" className="font-normal">
              {name}
            </Badge>
          ))}
        </div>
      ),
      csv: (row) => row.categoria,
    },
    { header: "Preço", numeric: true, cell: (row) => formatCurrency(row.preco), csv: (row) => row.preco },
    {
      header: "Exemplares",
      numeric: true,
      cell: (row) => <AvailabilityBadge quantity={Number(row.quantidade_disponivel)} />,
      csv: (row) => row.quantidade_disponivel,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Análise"
        title="Relatórios"
        description="Consultas prontas sobre o acervo, o estoque e os leitores. Exporte qualquer tabela em CSV."
      />
      <Tabs
        value={tab}
        onValueChange={(value) => setParams(value === "catalogo" ? {} : { relatorio: value }, { replace: true })}
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <TabsList>
            {reports.map((report) => (
              <TabsTrigger key={report.value} value={report.value}>
                {report.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="catalogo" className="mt-4">
          <ReportTable
            query={catalog}
            title="Catálogo completo"
            description="Todos os títulos com o total de exemplares nas bibliotecas"
            filename="catalogo.csv"
            rowKey={(row) => row.id}
            columns={bookColumns}
          />
        </TabsContent>
        <TabsContent value="disponibilidade" className="mt-4">
          <ReportTable
            query={high}
            title="Alta disponibilidade"
            description="Títulos com mais de 10 exemplares somando todas as unidades"
            filename="alta-disponibilidade.csv"
            rowKey={(row) => row.id}
            columns={bookColumns}
          />
        </TabsContent>
        <TabsContent value="categorias" className="mt-4">
          <ReportTable
            query={categories}
            title="Títulos por categoria"
            description="Um livro com várias categorias conta em cada uma"
            filename="titulos-por-categoria.csv"
            rowKey={(row) => row.categoria}
            columns={[
              {
                header: "Categoria",
                cell: (row) => <span className="font-medium">{row.categoria}</span>,
                csv: (row) => row.categoria,
              },
              {
                header: "Títulos",
                numeric: true,
                cell: (row) => formatNumber(row.quantidade_livros),
                csv: (row) => row.quantidade_livros,
              },
            ]}
          />
        </TabsContent>
        <TabsContent value="bibliotecas" className="mt-4">
          <ReportTable
            query={holdings}
            title="Acervo por biblioteca"
            description="Livros vinculados a cada unidade, incluindo bibliotecas sem estoque"
            filename="acervo-por-biblioteca.csv"
            rowKey={(row, index) => `${row.biblioteca}-${row.livro}-${index}`}
            columns={[
              {
                header: "Biblioteca",
                cell: (row) => <span className="font-medium">{row.biblioteca}</span>,
                csv: (row) => row.biblioteca,
              },
              {
                header: "Livro",
                cell: (row) => row.livro ?? <span className="text-muted-foreground">Sem livros vinculados</span>,
                csv: (row) => row.livro ?? "",
              },
              {
                header: "Exemplares",
                numeric: true,
                cell: (row) => formatNumber(row.quantidade),
                csv: (row) => row.quantidade,
              },
            ]}
          />
        </TabsContent>
        <TabsContent value="leitores" className="mt-4">
          <ReportTable
            query={mature}
            title="Empréstimos de leitores acima de 25 anos"
            description="Histórico completo, ordenado pela data de devolução"
            filename="emprestimos-leitores-25-anos.csv"
            rowKey={(row) => row.emprestimo_id}
            columns={[
              {
                header: "Leitor",
                cell: (row) => <span className="font-medium">{row.usuario}</span>,
                csv: (row) => row.usuario,
              },
              { header: "Livro", cell: (row) => row.livro, csv: (row) => row.livro },
              { header: "Biblioteca", cell: (row) => row.biblioteca, csv: (row) => row.biblioteca },
              { header: "Retirada", numeric: true, cell: (row) => row.emprestimo, csv: (row) => row.emprestimo },
              {
                header: "Devolução",
                numeric: true,
                cell: (row) => row.devolucao ?? <span className="text-muted-foreground">Em aberto</span>,
                csv: (row) => row.devolucao ?? "",
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
