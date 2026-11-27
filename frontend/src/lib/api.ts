const configuredBaseUrl = import.meta.env.VITE_API_URL || "/api";

export const API_BASE_URL = configuredBaseUrl.replace(/\/$/, "");

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export const TOKEN_STORAGE_KEY = "libraryManagerToken";
export const SESSION_EXPIRED_EVENT = "library-manager:session-expired";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Database and validation messages that reach the UI, in the interface language.
const knownMessages: [RegExp, string][] = [
  [/unique_titulo/i, "Já existe um livro com este título."],
  [/usuario_pkey/i, "Já existe um leitor cadastrado com este CPF."],
  [/operador_pkey/i, "Este nome de usuário já está em uso."],
  [/violates foreign key constraint/i, "Este registro está vinculado a outros dados e não pode ser removido."],
  [/quantidade_disponivel_check/i, "Não há exemplares disponíveis nesta biblioteca."],
  [/check_categoria/i, "Selecione apenas categorias válidas."],
  [/Invalid credentials/i, "Credenciais inválidas. Confira os dados e tente novamente."],
  [/permission/i, "Seu perfil não tem permissão para esta ação."],
  [/registration key/i, "Chave de cadastro inválida."],
  [/registration is disabled/i, "O cadastro de operadores está desativado neste ambiente."],
];

export function describeError(error: unknown, fallback = "Não foi possível concluir a operação.") {
  const message = error instanceof Error ? error.message : "";
  for (const [pattern, translated] of knownMessages) {
    if (pattern.test(message)) return translated;
  }
  // Trigger messages raised by PostgreSQL are already written in Portuguese.
  if (/[ãçéêíóõú]/i.test(message)) return message;
  if (error instanceof TypeError) return "Não foi possível conectar à API. Verifique se o servidor está em execução.";
  return fallback;
}

type RequestOptions = { method?: string; body?: unknown; signal?: AbortSignal };

export async function request<T>(path: string, { method = "GET", body, signal }: RequestOptions = {}) {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const response = await fetch(apiUrl(path), {
    method,
    signal,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data && typeof data === "object" && "message" in data ? String(data.message) : response.statusText;
    if (response.status === 401 && token) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(response.status, message);
  }

  return data as T;
}
