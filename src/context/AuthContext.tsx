import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  apiGetJson,
  apiPostEmpty,
  apiPostJson,
  type ApiUser,
} from "@/api/client";

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: ApiUser };

type AuthContextValue = AuthState & {
  refresh: () => Promise<void>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  register: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const refresh = useCallback(async () => {
    const result = await apiGetJson<{ user: ApiUser }>("/api/auth/me");
    if (result.ok) {
      setState({ status: "authenticated", user: result.data.user });
      return;
    }
    setState({ status: "anonymous" });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await apiPostJson<{ user: ApiUser }>("/api/auth/login", {
        email,
        password,
      });
      if (!result.ok) {
        return { ok: false as const, error: result.error };
      }
      setState({ status: "authenticated", user: result.data.user });
      return { ok: true as const };
    },
    [],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const result = await apiPostJson<{ user: ApiUser }>(
        "/api/auth/register",
        { email, password },
      );
      if (!result.ok) {
        return { ok: false as const, error: result.error };
      }
      setState({ status: "authenticated", user: result.data.user });
      return { ok: true as const };
    },
    [],
  );

  const logout = useCallback(async () => {
    await apiPostEmpty("/api/auth/logout");
    setState({ status: "anonymous" });
  }, []);

  const value = useMemo<AuthContextValue>(
    () =>
      ({
        ...state,
        refresh,
        login,
        register,
        logout,
      }) as AuthContextValue,
    [state, refresh, login, register, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
