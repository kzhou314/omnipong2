import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-accent/15 text-accent"
      : "text-slate-400 hover:bg-white/5 hover:text-white"
  }`;

export function Header() {
  const auth = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-space/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <NavLink to="/" className="group flex items-center gap-3">
          <span
            className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-panel ring-1 ring-white/10"
            aria-hidden
          >
            <span className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent" />
            <span className="relative font-display text-xl leading-none text-accent">
              OP
            </span>
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-xl tracking-wide text-white group-hover:text-accent">
              OmniPong
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Tournament ops
            </span>
          </span>
        </NavLink>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Primary"
        >
          <NavLink to="/" className={linkClass} end>
            Home
          </NavLink>
          <NavLink to="/activities" className={linkClass}>
            Activities
          </NavLink>
          <NavLink to="/players" className={linkClass}>
            For players
          </NavLink>
          <NavLink to="/directors" className={linkClass}>
            For directors
          </NavLink>
        </nav>

        <div className="flex max-w-[min(100%,14rem)] shrink-0 items-center gap-2">
          {auth.status === "loading" ? (
            <span className="hidden text-xs text-slate-500 sm:inline">
              …
            </span>
          ) : auth.status === "authenticated" ? (
            <>
              <NavLink
                to="/profile"
                className="hidden rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 backdrop-blur-sm hover:bg-white/10 sm:inline-flex"
              >
                My profile
              </NavLink>
              <span
                className="hidden truncate text-xs text-slate-400 sm:inline"
                title={auth.user.email}
              >
                {auth.user.email}
              </span>
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
                onClick={() => void auth.logout()}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className="hidden rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 backdrop-blur-sm hover:bg-white/10 sm:inline-flex"
              >
                Member sign in
              </NavLink>
              <NavLink
                to="/login?next=/directors"
                className="hidden rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/20 sm:inline-flex"
              >
                Director access
              </NavLink>
              <NavLink
                to="/register"
                className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-space shadow-[0_0_20px_-4px_rgba(45,212,160,0.5)] hover:brightness-110"
              >
                Register
              </NavLink>
            </>
          )}
        </div>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto border-t border-white/5 px-4 py-2 md:hidden"
        aria-label="Mobile primary"
      >
        <NavLink to="/" className={linkClass} end>
          Home
        </NavLink>
        <NavLink to="/activities" className={linkClass}>
          Activities
        </NavLink>
        <NavLink to="/players" className={linkClass}>
          Players
        </NavLink>
        <NavLink to="/directors" className={linkClass}>
          Directors
        </NavLink>
        {auth.status === "anonymous" ? (
          <>
            <NavLink to="/login" className={linkClass}>
              Sign in
            </NavLink>
            <NavLink to="/register" className={linkClass}>
              Register
            </NavLink>
          </>
        ) : auth.status === "authenticated" ? (
          <NavLink to="/profile" className={linkClass}>
            Profile
          </NavLink>
        ) : null}
      </nav>
    </header>
  );
}
