// Shapes returned by the Express API. Column aliases from report queries are
// lower-cased by PostgreSQL, and NUMERIC/BIGINT values arrive as strings.

export type Address = {
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  cep: string;
};

export type Book = {
  id: number;
  titulo: string;
  autor: string;
  categoria: string[];
  paginas: number;
  preco: string;
  idioma: string;
};

export type CatalogBook = Book & {
  quantidade_disponivel: string;
};

export type Library = {
  id: number;
  nome: string;
  endereco: Address;
  telefone: string;
};

export type StockEntry = {
  id: number;
  idLivro: number;
  idBiblioteca: number;
  quantidadeDisponivel: number;
};

export type Loan = {
  id: number;
  cpfUsuario: string;
  idLivro: number;
  idBiblioteca: number;
  dataEmprestimo: string;
  dataDevolucao: string | null;
};

export type Reader = {
  cpf: string;
  nome: string;
  email: string | null;
  telefone: string;
  dataNascimento: string;
  endereco: Address;
};

export type ReaderLoan = {
  emprestimo_id: number;
  livro: string;
  biblioteca: string;
  emprestimo: string;
  devolucao: string | null;
};

export type BookAvailability = {
  id: number;
  livro: string;
  biblioteca: string;
  quantidade: number;
};

export type CategoryCount = { categoria: string; quantidade_livros: string };
export type LibraryTotal = { biblioteca: string; total_livros_disponiveis: string };
export type LibraryHolding = { biblioteca: string; livro: string | null; quantidade: number };
export type MatureCustomerLoan = ReaderLoan & { usuario: string };

export type BookInput = {
  title: string;
  author: string;
  category: string[];
  pages: number;
  price: number;
  language: string;
};

export type AddressInput = {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
};

export type LibraryInput = { name: string; address: AddressInput; phoneNumber: string };

export type ReaderInput = {
  cpf: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  password: string;
  address: AddressInput;
};

export type StockInput = { idBook: number; idLibrary: number; amount: number };

export type LoanInput = {
  cpfUser: string;
  idBook: number;
  idLibrary: number;
  dateLoan: string;
  dateReturn: string | null;
};

export type MutationResult<T> = { message: string; result: T };

/** A loan that has accrued a late fee; amounts are in cents (GET /payment/fines/:cpf). */
export type FineLoan = {
  loanId: number;
  book: string;
  library: string;
  loanDate: string;
  dueDate: string;
  returnDate: string | null;
  daysLate: number;
  fineCents: number;
  paidCents: number;
  dueCents: number;
};

export type FineSummary = {
  cpfUser: string;
  finePerDayCents: number;
  totalFineCents: number;
  totalPaidCents: number;
  totalDueCents: number;
  loans: FineLoan[];
};

export type CheckoutSession = { sessionId: string; url: string; amountCents: number };

export type PaymentConfirmation = {
  sessionId: string;
  status: "paid" | "pending" | "expired";
  amountCents: number;
};
