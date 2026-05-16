import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";

type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
};

type RegisterDetails = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  clubName: string;
  city: string;
  state: string;
  usattId: string;
  usattRating: number;
};

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: AuthUser };

type AuthContextValue = AuthState & {
  refresh: () => Promise<void>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  register: (details: RegisterDetails) => Promise<
    | { ok: true; needsEmailConfirmation: boolean }
    | { ok: false; error: string }
  >;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(user: { id: string; email?: string | null; created_at: string }): AuthUser {
  return {
    id: user.id,
    email: user.email ?? "",
    createdAt: user.created_at,
    firstName: null,
    lastName: null,
    avatarUrl: null,
  };
}

type MemberSummary = {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  async function loadMemberSummary(userId: string) {
    const preferred = await supabase
      .from("members")
      .select("first_name, last_name, avatar_url")
      .eq("id", userId)
      .maybeSingle<MemberSummary>();

    if (!preferred.error) {
      return preferred.data ?? null;
    }

    const fallback = await supabase
      .from("members")
      .select("first_name, last_name")
      .eq("id", userId)
      .maybeSingle<{ first_name: string | null; last_name: string | null }>();

    if (fallback.error) {
      return null;
    }

    if (!fallback.data) {
      return null;
    }

    return {
      first_name: fallback.data.first_name,
      last_name: fallback.data.last_name,
      avatar_url: null,
    } satisfies MemberSummary;
  }

  async function buildAuthUser(user: {
    id: string;
    email?: string | null;
    created_at: string;
  }) {
    const base = toAuthUser(user);
    const summary = await loadMemberSummary(user.id);

    return {
      ...base,
      firstName: summary?.first_name ?? null,
      lastName: summary?.last_name ?? null,
      avatarUrl: summary?.avatar_url ?? null,
    } satisfies AuthUser;
  }

  async function refresh() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setState({ status: "anonymous" });
      return;
    }

    const hydratedUser = await buildAuthUser(session.user);
    setState({
      status: "authenticated",
      user: hydratedUser,
    });
  }

  useEffect(() => {
    void refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setState({ status: "anonymous" });
        return;
      }

      void (async () => {
        const hydratedUser = await buildAuthUser(session.user);
        setState({
          status: "authenticated",
          user: hydratedUser,
        });
      })();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { ok: false as const, error: error.message };
    }

    if (!data.user) {
      return { ok: false as const, error: "No user returned from sign-in." };
    }

    const hydratedUser = await buildAuthUser(data.user);
    setState({
      status: "authenticated",
      user: hydratedUser,
    });

    return { ok: true as const };
  }

  async function register(details: RegisterDetails) {
    const { data, error } = await supabase.auth.signUp({
      email: details.email,
      password: details.password,
      options: {
        data: {
          first_name: details.firstName.trim(),
          last_name: details.lastName.trim(),
          phone: details.phone.trim(),
          club_name: details.clubName.trim(),
          city: details.city.trim(),
          state: details.state.trim(),
          usatt_id: details.usattId.trim().toUpperCase(),
          usatt_rating: details.usattRating,
        },
      },
    });

    if (error) {
      return { ok: false as const, error: error.message };
    }

    if (!data.user) {
      return {
        ok: false as const,
        error: "No user returned from registration.",
      };
    }

    if (!data.session?.user) {
      setState({ status: "anonymous" });
      return { ok: true as const, needsEmailConfirmation: true };
    }

    const hydratedUser = await buildAuthUser(data.user);
    setState({
      status: "authenticated",
      user: hydratedUser,
    });

    return { ok: true as const, needsEmailConfirmation: false };
  }

  async function logout() {
    await supabase.auth.signOut();
    setState({ status: "anonymous" });
  }

  const value = useMemo<AuthContextValue>(
    () =>
      ({
        ...state,
        refresh,
        login,
        register,
        logout,
      }) as AuthContextValue,
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
