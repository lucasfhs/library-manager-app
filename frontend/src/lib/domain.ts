import { daysSince } from "@/lib/format";

// Values accepted by the livro.check_categoria constraint in init.sql.
export const CATEGORIES = [
  "Ficção",
  "Não-ficção",
  "Romance",
  "Biografia",
  "Fantasia",
  "Ciência",
  "História",
  "Terror",
  "Infantil",
  "Aventura",
  "Suspense",
  "Autoajuda",
  "Religioso",
] as const;

/** Loans open for longer than this block new loans (verifica_prazo_devolucao trigger). */
export const LOAN_PERIOD_DAYS = 30;
/** Maximum simultaneous open loans per reader (verifica_limite_emprestimos trigger). */
export const MAX_OPEN_LOANS = 5;

export type LoanStatus = "active" | "overdue" | "returned";

export function loanStatus(loanDate: string, returnDate: string | null): LoanStatus {
  if (returnDate) return "returned";
  return daysSince(loanDate) > LOAN_PERIOD_DAYS ? "overdue" : "active";
}

export function availabilityTone(quantity: number) {
  if (quantity <= 0) return "none" as const;
  if (quantity <= 2) return "low" as const;
  return "good" as const;
}
