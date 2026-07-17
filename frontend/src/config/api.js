const configuredBaseUrl = import.meta.env.VITE_API_URL || "/api";

export const API_BASE_URL = configuredBaseUrl.replace(/\/$/, "");

export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
