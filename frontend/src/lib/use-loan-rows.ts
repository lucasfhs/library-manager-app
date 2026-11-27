import { useMemo } from "react";
import { loanStatus } from "@/lib/domain";
import { useBooks, useLibraries, useLoans, useReaders } from "@/lib/queries";

/** Loans joined with their book, library and reader for operator views. */
export function useLoanRows() {
  const loans = useLoans();
  const books = useBooks();
  const libraries = useLibraries();
  const readers = useReaders();

  const rows = useMemo(() => {
    const bookById = new Map((books.data ?? []).map((book) => [book.id, book]));
    const libraryById = new Map((libraries.data ?? []).map((library) => [library.id, library]));
    const readerByCpf = new Map((readers.data ?? []).map((reader) => [reader.cpf.trim(), reader]));
    return (loans.data ?? [])
      .map((loan) => ({
        loan,
        book: bookById.get(loan.idLivro),
        library: libraryById.get(loan.idBiblioteca),
        reader: readerByCpf.get(loan.cpfUsuario.trim()),
        status: loanStatus(loan.dataEmprestimo, loan.dataDevolucao),
      }))
      .sort((a, b) => b.loan.dataEmprestimo.localeCompare(a.loan.dataEmprestimo) || b.loan.id - a.loan.id);
  }, [loans.data, books.data, libraries.data, readers.data]);

  const queries = [loans, books, libraries, readers];
  return {
    rows,
    isPending: queries.some((query) => query.isPending),
    error: queries.find((query) => query.error)?.error ?? null,
    refetch: () => queries.forEach((query) => query.refetch()),
  };
}

export type LoanRow = ReturnType<typeof useLoanRows>["rows"][number];
