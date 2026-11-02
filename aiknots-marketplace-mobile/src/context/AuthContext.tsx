import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearSession, KEYS, setLogoutHandler, USE_MOCK } from "../lib/api";
import { getJson, removeKey, secureGet, setJson } from "../lib/storage";
import type { User } from "../types";

interface Ctx {
  user: User | null;
  loading: boolean;
  sendOtp: (email: string) => Promise<void>;
  signUp: (p: { fullName: string; email: string; password: string; otp?: string }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = useCallback(async (u: User | null) => {
    setUser(u);
    if (u) await setJson(KEYS.user, u);
    else await removeKey(KEYS.user);
  }, []);

  useEffect(() => {
    setLogoutHandler(() => setUser(null));
    (async () => {
      try {
        const [stored, token] = await Promise.all([getJson<User | null>(KEYS.user, null), secureGet(KEYS.access)]);
        if (stored && token) {
          setUser(stored);
          if (!USE_MOCK) {
            api.auth.me().then((fresh) => fresh && persist(fresh)).catch(() => {});
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [persist]);

  const value = useMemo<Ctx>(
    () => ({
      user,
      loading,
      sendOtp: (email) => api.auth.sendOtp(email),
      signUp: async (p) => {
        const r = await api.auth.signUp(p);
        await persist(r.user);
      },
      signIn: async (email, password) => {
        const r = await api.auth.signIn(email, password);
        await persist(r.user);
      },
      signOut: async () => {
        await clearSession();
        await persist(null);
      },
      updateUser: async (patch) => {
        if (user) await persist({ ...user, ...patch });
      },
    }),
    [user, loading, persist]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
