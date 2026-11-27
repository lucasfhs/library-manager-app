const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const integer = new Intl.NumberFormat("pt-BR");
const longDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export const formatCurrency = (value: number | string) => currency.format(Number(value));
export const formatNumber = (value: number | string) => integer.format(Number(value));

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

export function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Today as YYYY-MM-DD in the browser's timezone. */
export function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** Accepts YYYY-MM-DD or DD/MM/YYYY and returns a UTC Date. */
export function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : value.slice(0, 10);
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined) {
  const date = parseDate(value);
  return date ? longDate.format(date).replace(".", "") : "—";
}

export function daysSince(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) return 0;
  const start = parseDate(today())!;
  return Math.floor((start.getTime() - date.getTime()) / 86_400_000);
}

export function plural(count: number, one: string, many: string) {
  return `${formatNumber(count)} ${count === 1 ? one : many}`;
}
