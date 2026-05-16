import { type FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextPath = params.get("next") ?? "/players";
  const auth = useAuth();
  const { login, status } = auth;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await login(email, password);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(nextPath.startsWith("/") ? nextPath : "/players", {
      replace: true,
    });
  }

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-slate-400">
        Loading…
      </div>
    );
  }

  if (auth.status === "authenticated") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-slate-300">
          Signed in as{" "}
          <span className="font-medium text-accent">{auth.user.email}</span>
        </p>
        <button
          type="button"
          className="mt-6 text-sm font-semibold text-accent underline-offset-2 hover:underline"
          onClick={() => navigate("/")}
        >
          Continue to home
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        Member access
      </p>
      <h1 className="font-display mt-3 text-4xl tracking-wide text-white">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        No account yet?{" "}
        <Link
          className="font-medium text-accent underline-offset-2 hover:underline"
          to={`/register${params.toString() ? `?${params.toString()}` : ""}`}
        >
          Create one
        </Link>
      </p>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="mt-8 w-full space-y-4 rounded-2xl border border-white/10 bg-panel/90 p-6 backdrop-blur-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 placeholder:text-slate-600 focus:border-accent/50 focus:ring-2"
              placeholder="you@club.org"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
            />
          </div>
        </div>
        {error ? (
          <p className="text-sm font-medium text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          className="w-full justify-center py-3"
          disabled={pending}
        >
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
