import React, { createContext, useContext, useEffect, useState } from "react";
import {
  type AuthUser,
  clearTokens,
  logout as doLogout,
  me,
} from "@/services/auth";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  setUser: (u: AuthUser | null) => void;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
};

const Ctx = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const u = await me();
      setUser(u);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const logout = async () => {
    try {
      await doLogout();
    } finally {
      clearTokens();
      setUser(null);
    }
  };

  return (
    <Ctx.Provider value={{ user, loading, setUser, logout, reload }}>
      {children}
    </Ctx.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
