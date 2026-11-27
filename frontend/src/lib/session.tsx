import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SESSION_EXPIRED_EVENT, TOKEN_STORAGE_KEY } from "@/lib/api";

import { parseSession, type Session } from "@/lib/session-token";

export type { Role, Session } from "@/lib/session-token";

type SessionContextValue = {
  session: Session | null;
  signIn: (token: string) => Session | null;
  signOut: () => void;
  expired: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(() => parseSession(localStorage.getItem(TOKEN_STORAGE_KEY)));
  const [expired, setExpired] = useState(false);

  const signIn = useCallback((token: string) => {
    const next = parseSession(token);
    if (next) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      setExpired(false);
    }
    setSession(next);
    return next;
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setSession(null);
  }, []);

  useEffect(() => {
    const onExpired = () => {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setSession(null);
      setExpired(true);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === TOKEN_STORAGE_KEY) setSession(parseSession(event.newValue));
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const value = useMemo(() => ({ session, signIn, signOut, expired }), [session, signIn, signOut, expired]);
  return <SessionContext value={value}>{children}</SessionContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
