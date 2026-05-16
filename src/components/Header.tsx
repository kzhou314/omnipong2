import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getUserDisplayName, UserAvatar } from "@/components/UserAvatar";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-accent/15 text-accent"
      : "text-slate-400 hover:bg-white/5 hover:text-white"
  }`;

function ProfileIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function Header() {
  const auth = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isAnonymous = auth.status === "anonymous";

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen]);

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

        <div
          className={`flex shrink-0 items-center gap-2 ${
            isAnonymous ? "max-w-none" : "max-w-[min(100%,14rem)]"
          }`}
        >
          {auth.status === "loading" ? (
            <span className="hidden text-xs text-slate-500 sm:inline">…</span>
          ) : auth.status === "authenticated" ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className="inline-flex rounded-full border border-white/10 bg-white/5 p-1.5 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Open account menu"
              >
                <UserAvatar
                  firstName={auth.user.firstName}
                  lastName={auth.user.lastName}
                  email={auth.user.email}
                  avatarUrl={auth.user.avatarUrl}
                  className="h-10 w-10"
                  textClassName="text-sm"
                />
              </button>

              {menuOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[19rem] rounded-3xl border border-white/10 bg-[#060b14]/95 p-4 shadow-[0_25px_80px_-30px_rgba(0,0,0,0.75)] backdrop-blur-xl"
                  role="menu"
                  aria-label="Account menu"
                >
                  <NavLink
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-4 rounded-2xl px-3 py-3 transition hover:bg-white/[0.04]"
                    role="menuitem"
                  >
                    <UserAvatar
                      firstName={auth.user.firstName}
                      lastName={auth.user.lastName}
                      email={auth.user.email}
                      avatarUrl={auth.user.avatarUrl}
                      className="h-14 w-14"
                      textClassName="text-base"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-white">
                        {getUserDisplayName({
                          firstName: auth.user.firstName,
                          lastName: auth.user.lastName,
                          email: auth.user.email,
                        })}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-400">
                        {auth.user.email}
                      </p>
                    </div>
                  </NavLink>

                  <div className="my-3 border-t border-white/10" />

                  <div className="space-y-1">
                    <NavLink
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-3 py-3 text-slate-200 transition hover:bg-white/[0.04] hover:text-white"
                      role="menuitem"
                    >
                      <ProfileIcon />
                      <span className="text-base font-medium">Profile</span>
                    </NavLink>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        void auth.logout();
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-slate-200 transition hover:bg-white/[0.04] hover:text-white"
                      role="menuitem"
                    >
                      <SignOutIcon />
                      <span className="text-base font-medium">Sign out</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <NavLink
                to="/login"
                className="hidden min-h-[3.2rem] min-w-[8rem] items-center justify-center rounded-2xl border border-white/15 bg-panel/80 px-5 text-base font-semibold leading-none text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-white/25 hover:bg-white/[0.07] sm:inline-flex"
              >
                Sign in
              </NavLink>
              <NavLink
                to="/register"
                className="inline-flex min-h-[3.2rem] min-w-[8rem] items-center justify-center rounded-2xl border border-accent/45 bg-accent px-5 text-center text-base font-semibold leading-none text-space shadow-[0_0_24px_-8px_rgba(45,212,160,0.55)] transition hover:brightness-110"
              >
                Sign up
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
        ) : null}
      </nav>
    </header>
  );
}
