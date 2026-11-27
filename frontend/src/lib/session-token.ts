export type Role = "operator" | "reader";

export type Session = {
  token: string;
  role: Role;
  /** Operator login or reader CPF. */
  subject: string;
  expiresAt: number | null;
};

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    const base64 = part
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(part.length / 4) * 4, "=");
    const json = new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function parseSession(token: string | null): Session | null {
  if (!token) return null;
  const payload = decodePayload(token);
  if (!payload) return null;
  const expiresAt = typeof payload.exp === "number" ? payload.exp * 1000 : null;
  if (expiresAt && expiresAt <= Date.now()) return null;
  if (typeof payload.userLogin === "string") {
    return { token, role: "operator", subject: payload.userLogin, expiresAt };
  }
  if (typeof payload.cpfUser === "string") {
    return { token, role: "reader", subject: payload.cpfUser, expiresAt };
  }
  return null;
}
