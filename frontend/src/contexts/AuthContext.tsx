"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  role: string;
  companies: CompanyInfo[];
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  getCompanyRole: (companyId: string) => string | null;
  isCompanyAdmin: (companyId: string) => boolean;
  getCompanyName: (companyId: string) => string | null;
  refreshCompanies: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string>("user");
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchRole = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRole(data.role ?? "user");
        setCompanies(data.companies ?? []);
        return data.role;
      }
    } catch {
      // backend unreachable, keep current role
    }
  }, []);

  const refreshCompanies = useCallback(async () => {
    const supabase2 = createClient();
    const { data: { session: s } } = await supabase2.auth.getSession();
    if (s?.access_token) {
      await fetchRole(s.access_token);
    }
  }, [fetchRole]);

  const getCompanyRole = useCallback((companyId: string): string | null => {
    return companies.find(c => c.id === companyId)?.role ?? null;
  }, [companies]);

  const isCompanyAdmin = useCallback((companyId: string): boolean => {
    return companies.some(c => c.id === companyId && c.role === 'admin');
  }, [companies]);

  const getCompanyName = useCallback((companyId: string): string | null => {
    return companies.find(c => c.id === companyId)?.name ?? null;
  }, [companies]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.access_token) {
        await fetchRole(s.access_token);
      } else {
        setRole("user");
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.access_token) {
        await fetchRole(s.access_token);
      } else {
        setRole("user");
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchRole]);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: new URL("/auth/callback", window.location.origin).toString(),
      },
    });
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  }, []);

  const getAccessToken = useCallback(async () => {
    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    return s?.access_token ?? null;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        companies,
        isLoading,
        signInWithGoogle,
        signInWithEmail,
        signUp,
        signOut,
        getAccessToken,
        getCompanyRole,
        isCompanyAdmin,
        getCompanyName,
        refreshCompanies,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
