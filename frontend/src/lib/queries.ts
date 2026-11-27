import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/api";
import type {
  Book,
  BookAvailability,
  BookInput,
  CatalogBook,
  CategoryCount,
  Library,
  LibraryHolding,
  LibraryInput,
  LibraryTotal,
  Loan,
  LoanInput,
  MatureCustomerLoan,
  MutationResult,
  Reader,
  ReaderInput,
  ReaderLoan,
  StockEntry,
  StockInput,
} from "@/lib/types";

export const keys = {
  catalog: ["catalog"] as const,
  books: ["books"] as const,
  libraries: ["libraries"] as const,
  stock: ["stock"] as const,
  loans: ["loans"] as const,
  readers: ["readers"] as const,
  reader: (cpf: string) => ["readers", cpf] as const,
  readerLoans: (cpf: string) => ["reader-loans", cpf] as const,
  availability: (bookId: number) => ["availability", bookId] as const,
  report: (name: string) => ["report", name] as const,
};

// Lists ---------------------------------------------------------------------

export const useCatalog = () =>
  useQuery({ queryKey: keys.catalog, queryFn: () => request<CatalogBook[]>("/report/getBookCatalog") });

export const useBooks = () => useQuery({ queryKey: keys.books, queryFn: () => request<Book[]>("/book") });

export const useLibraries = () =>
  useQuery({ queryKey: keys.libraries, queryFn: () => request<Library[]>("/library") });

export const useStock = () =>
  useQuery({ queryKey: keys.stock, queryFn: () => request<StockEntry[]>("/bookLibrary") });

export const useLoans = () => useQuery({ queryKey: keys.loans, queryFn: () => request<Loan[]>("/loan") });

export const useReaders = () => useQuery({ queryKey: keys.readers, queryFn: () => request<Reader[]>("/user") });

export const useReader = (cpf: string | undefined) =>
  useQuery({
    queryKey: keys.reader(cpf ?? ""),
    queryFn: () => request<Reader>(`/user/${cpf}`),
    enabled: Boolean(cpf),
  });

export const useReaderLoans = (cpf: string | undefined) =>
  useQuery({
    queryKey: keys.readerLoans(cpf ?? ""),
    queryFn: () => request<ReaderLoan[]>(`/report/getUserLoans/${cpf}`),
    enabled: Boolean(cpf),
  });

export const useAvailability = (bookId: number | undefined) =>
  useQuery({
    queryKey: keys.availability(bookId ?? 0),
    queryFn: () => request<BookAvailability[]>(`/report/getBookAvailability/${bookId}`),
    enabled: Boolean(bookId),
  });

// Reports -------------------------------------------------------------------

const report = <T>(name: string) => ({
  queryKey: keys.report(name),
  queryFn: () => request<T>(`/report/${name}`),
});

export const useBooksByCategory = () => useQuery(report<CategoryCount[]>("getBooksByCategory"));
export const useTopLibraries = () => useQuery(report<LibraryTotal[]>("getLibrariesWithMoreThanFiveBooks"));
export const useHighAvailability = () => useQuery(report<CatalogBook[]>("getHighAvailabilityCatalog"));
export const useLibraryHoldings = () => useQuery(report<LibraryHolding[]>("getLibrariesAndBooks"));
export const useMatureCustomers = () => useQuery(report<MatureCustomerLoan[]>("getMatureCustomers"));

// Mutations -----------------------------------------------------------------

function useInvalidate() {
  const client = useQueryClient();
  return (...groups: (readonly unknown[])[]) =>
    Promise.all(groups.map((queryKey) => client.invalidateQueries({ queryKey })));
}

/** Stock and loans feed every catalog and report view. */
const inventoryKeys = [keys.catalog, keys.stock, keys.loans, ["availability"], ["report"], ["reader-loans"]];

export function useSaveBook() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: BookInput }) =>
      request<MutationResult<Book>>(id ? `/book/${id}` : "/book", { method: id ? "PUT" : "POST", body: input }),
    onSuccess: () => invalidate(keys.books, ...inventoryKeys),
  });
}

export function useDeleteBook() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => request<MutationResult<boolean>>(`/book/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(keys.books, ...inventoryKeys),
  });
}

export function useSaveLibrary() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: LibraryInput }) =>
      request<MutationResult<Library>>(id ? `/library/${id}` : "/library", {
        method: id ? "PUT" : "POST",
        body: input,
      }),
    onSuccess: () => invalidate(keys.libraries, ...inventoryKeys),
  });
}

export function useSaveStock() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: StockInput }) =>
      request<MutationResult<StockEntry>>(id ? `/bookLibrary/${id}` : "/bookLibrary", {
        method: id ? "PUT" : "POST",
        body: input,
      }),
    onSuccess: () => invalidate(...inventoryKeys),
  });
}

export function useDeleteStock() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => request<MutationResult<boolean>>(`/bookLibrary/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(...inventoryKeys),
  });
}

export function useCreateLoan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: LoanInput) => request<MutationResult<Loan>>("/loan", { method: "POST", body: input }),
    onSuccess: () => invalidate(...inventoryKeys),
  });
}

export function useReturnLoan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ loan, returnDate }: { loan: Loan; returnDate: string }) =>
      request<MutationResult<Loan>>(`/loan/${loan.id}`, {
        method: "PUT",
        body: {
          cpfUser: loan.cpfUsuario,
          idBook: loan.idLivro,
          idLibrary: loan.idBiblioteca,
          dateLoan: loan.dataEmprestimo,
          dateReturn: returnDate,
        } satisfies LoanInput,
      }),
    onSuccess: () => invalidate(...inventoryKeys),
  });
}

export function useRegisterReader() {
  return useMutation({
    mutationFn: (input: ReaderInput) => request<MutationResult<Reader>>("/user", { method: "POST", body: input }),
  });
}

export function useRegisterOperator() {
  return useMutation({
    mutationFn: (input: { userLogin: string; password: string; secretKey: string }) =>
      request<MutationResult<{ usuarioLogin: string }>>("/auth", { method: "POST", body: input }),
  });
}

export function useLogin(role: "operator" | "reader") {
  return useMutation({
    mutationFn: (credentials: { login: string; password: string }) =>
      request<MutationResult<string>>(role === "operator" ? "/auth/loginAdmin" : "/auth/loginUser", {
        method: "POST",
        body:
          role === "operator"
            ? { userLogin: credentials.login, password: credentials.password }
            : { cpfUser: credentials.login, password: credentials.password },
      }),
  });
}
