import { type FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type FieldErrors = {
  usattId?: string;
};

function normalizeUsattId(value: string) {
  return value.trim().toUpperCase();
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextPath = params.get("next") ?? "/";
  const auth = useAuth();
  const { register, status } = auth;

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [clubName, setClubName] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [usattId, setUsattId] = useState("");
  const [usattRating, setUsattRating] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null,
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setConfirmationEmail(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    const normalizedUsattId = normalizeUsattId(usattId);
    const parsedUsattRating = Number(usattRating);
    if (!Number.isInteger(parsedUsattRating) || parsedUsattRating < 0) {
      setError("USATT rating must be a whole number.");
      return;
    }

    setPending(true);

    const { data: usattAvailable, error: usattCheckError } = await supabase.rpc(
      "check_usatt_id_available",
      { candidate_usatt_id: normalizedUsattId },
    );

    if (usattCheckError) {
      setPending(false);
      setError("We could not validate that USATT ID right now.");
      return;
    }

    if (!usattAvailable) {
      setPending(false);
      setFieldErrors({
        usattId: "Account with USATT ID already exists.",
      });
      return;
    }

    const result = await register({
      email,
      password,
      firstName,
      lastName,
      phone,
      clubName,
      city,
      state: stateName,
      usattId: normalizedUsattId,
      usattRating: parsedUsattRating,
    });

    setPending(false);
    if (!result.ok) {
      const { data: stillAvailable } = await supabase.rpc(
        "check_usatt_id_available",
        { candidate_usatt_id: normalizedUsattId },
      );
      if (stillAvailable === false) {
        setFieldErrors({
          usattId: "Account with USATT ID already exists.",
        });
        return;
      }
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setConfirmationEmail(email);
      setFirstName("");
      setLastName("");
      setPhone("");
      setClubName("");
      setCity("");
      setStateName("");
      setUsattId("");
      setUsattRating("");
      setPassword("");
      setConfirm("");
      return;
    }
    navigate(nextPath.startsWith("/") ? nextPath : "/", {
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
          You’re already signed in as{" "}
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

  if (confirmationEmail) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Check your inbox
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-wide text-white">
          Finish account access
        </h1>
        <div className="mt-8 rounded-2xl border border-white/10 bg-panel/90 p-6 text-sm leading-relaxed text-slate-300 backdrop-blur-sm">
          <p>
            If{" "}
            <span className="font-medium text-white">{confirmationEmail}</span>{" "}
            can be used for a new account, Supabase will send a confirmation
            email.
          </p>
          <p className="mt-3">
            Open that message and click the link inside it, then return here
            and sign in normally.
          </p>
          <p className="mt-3 text-slate-400">
            If you already registered with that email, sign in instead. If you
            do not see a message, check spam or junk folders first.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button to="/login" className="px-5 py-2.5">
              Go to sign in
            </Button>
            <button
              type="button"
              className="text-sm font-semibold text-accent underline-offset-2 hover:underline"
              onClick={() => setConfirmationEmail(null)}
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        New account
      </p>
      <h1 className="font-display mt-3 text-4xl tracking-wide text-white">
        Register
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Already have an account?{" "}
        <Link
          className="font-medium text-accent underline-offset-2 hover:underline"
          to={`/login${params.toString() ? `?${params.toString()}` : ""}`}
        >
          Sign in
        </Link>
      </p>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="mt-8 w-full space-y-4 rounded-2xl border border-white/10 bg-panel/90 p-6 backdrop-blur-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="register-email"
              className="block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Email
            </label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 placeholder:text-slate-600 focus:border-accent/50 focus:ring-2"
              placeholder="you@club.org"
            />
          </div>

          <div>
            <label
              htmlFor="register-first-name"
              className="block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              First name
            </label>
            <input
              id="register-first-name"
              type="text"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="register-last-name"
              className="block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Last name
            </label>
            <input
              id="register-last-name"
              type="text"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="register-phone"
              className="block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Phone
            </label>
            <input
              id="register-phone"
              type="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
              placeholder="(555) 555-5555"
            />
          </div>

          <div>
            <label
              htmlFor="register-club-name"
              className="block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Club name
            </label>
            <input
              id="register-club-name"
              type="text"
              required
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
              placeholder="Steel City Table Tennis"
            />
          </div>

          <div>
            <label
              htmlFor="register-city"
              className="block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              City
            </label>
            <input
              id="register-city"
              type="text"
              autoComplete="address-level2"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="register-state"
              className="block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              State
            </label>
            <input
              id="register-state"
              type="text"
              autoComplete="address-level1"
              required
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
              placeholder="PA"
            />
          </div>

          <div>
            <label
              htmlFor="register-usatt-id"
              className="block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              USATT ID
            </label>
            <input
              id="register-usatt-id"
              type="text"
              required
              value={usattId}
              onChange={(e) => {
                setUsattId(e.target.value);
                setFieldErrors((current) => ({ ...current, usattId: undefined }));
              }}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
              placeholder="123456"
            />
            {fieldErrors.usattId ? (
              <p className="mt-1 text-xs font-medium text-red-400" role="alert">
                {fieldErrors.usattId}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="register-usatt-rating"
              className="block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              USATT rating
            </label>
            <input
              id="register-usatt-rating"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              required
              value={usattRating}
              onChange={(e) => setUsattRating(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
              placeholder="1450"
            />
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Password
            </label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
            />
            <p className="mt-1 text-xs text-slate-500">
              At least 8 characters.
            </p>
          </div>

          <div>
            <label
              htmlFor="register-confirm-password"
              className="block text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Confirm password
            </label>
            <input
              id="register-confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
