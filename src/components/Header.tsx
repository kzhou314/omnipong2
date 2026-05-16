import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getUserDisplayName, UserAvatar } from "@/components/UserAvatar";

const desktopTabClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
    isActive
      ? "border-accent text-white"
      : "border-transparent text-slate-400 hover:border-white/10 hover:text-white"
  }`;

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-accent/15 text-accent"
      : "text-slate-400 hover:bg-white/5 hover:text-white"
  }`;

function HomeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 10 9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3 5 6v6c0 4.6 3 8 7 9 4-1 7-4.4 7-9V6l-7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.7-3.8" />
    </svg>
  );
}

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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050914]/92 backdrop-blur-2xl">
      <div className="border-b border-white/6">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <NavLink to="/" className="flex min-w-0 items-center gap-3">
              <span
                className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-panel ring-1 ring-white/10"
                aria-hidden="true"
              >
                <span className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent" />
                <span className="relative font-display text-lg leading-none text-accent">
                  OP
                </span>
              </span>

              <span className="hidden min-w-0 items-center gap-3 text-sm md:flex">
                <span className="truncate font-semibold text-white">
                  OmniPong
                </span>
                <span className="text-slate-600">/</span>
                <span className="truncate font-medium text-slate-300">
                  Tournament Ops
                </span>
              </span>

              <span className="flex flex-col leading-tight md:hidden">
                <span className="font-display text-xl tracking-wide text-white">
                  OmniPong
                </span>
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Tournament ops
                </span>
              </span>
            </NavLink>
          </div>

          <div className="hidden min-w-0 items-center gap-2 md:flex">
            {auth.status === "loading" ? (
              <span className="px-3 text-xs text-slate-500">…</span>
            ) : auth.status === "authenticated" ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((current) => !current)}
                  className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  aria-label="Open account menu"
                >
                  <UserAvatar
                    firstName={auth.user.firstName}
                    lastName={auth.user.lastName}
                    email={auth.user.email}
                    avatarUrl={auth.user.avatarUrl}
                    className="h-9 w-9"
                    textClassName="text-sm"
                  />
                </button>

                {menuOpen ? (
                  <div
                    className="absolute right-0 top-[calc(100%+0.55rem)] z-50 w-[17rem] rounded-2xl border border-white/10 bg-[#050910]/96 p-3.5 shadow-[0_22px_70px_-30px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
                    role="menu"
                    aria-label="Account menu"
                  >
                    <NavLink
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-white/[0.04]"
                      role="menuitem"
                    >
                      <UserAvatar
                        firstName={auth.user.firstName}
                        lastName={auth.user.lastName}
                        email={auth.user.email}
                        avatarUrl={auth.user.avatarUrl}
                        className="h-12 w-12"
                        textClassName="text-sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-white">
                          {getUserDisplayName({
                            firstName: auth.user.firstName,
                            lastName: auth.user.lastName,
                            email: auth.user.email,
                          })}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {auth.user.email}
                        </p>
                      </div>
                    </NavLink>

                    <div className="my-2.5 border-t border-white/10" />

                    <div className="space-y-1">
                      <NavLink
                        to="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-slate-200 transition hover:bg-white/[0.04] hover:text-white"
                        role="menuitem"
                      >
                        <ProfileIcon />
                        <span className="text-sm font-medium">Profile</span>
                      </NavLink>

                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          void auth.logout();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-slate-200 transition hover:bg-white/[0.04] hover:text-white"
                        role="menuitem"
                      >
                        <SignOutIcon />
                        <span className="text-sm font-medium">Sign out</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="inline-flex h-9 items-center rounded-lg border border-white/10 bg-white/[0.02] px-3.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                >
                  Sign in
                </NavLink>
                <NavLink
                  to="/register"
                  className="inline-flex h-9 items-center rounded-lg border border-accent/30 bg-accent/14 px-3.5 text-sm font-medium text-accent transition hover:bg-accent/22"
                >
                  Sign up
                </NavLink>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="hidden border-b border-white/6 md:block">
        <nav
          className="mx-auto flex w-full max-w-[1600px] items-center gap-1 overflow-x-auto px-4 sm:px-6"
          aria-label="Primary"
        >
          <NavLink to="/" className={desktopTabClass} end>
            <HomeIcon />
            Home
          </NavLink>
          <NavLink to="/activities" className={desktopTabClass}>
            <CalendarIcon />
            Activities
          </NavLink>
          <NavLink to="/directors" className={desktopTabClass}>
            <ShieldIcon />
            Director Access
          </NavLink>
        </nav>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto border-t border-white/5 px-4 py-2 md:hidden"
        aria-label="Mobile primary"
      >
        <NavLink to="/" className={mobileLinkClass} end>
          Home
        </NavLink>
        <NavLink to="/activities" className={mobileLinkClass}>
          Activities
        </NavLink>
        <NavLink to="/directors" className={mobileLinkClass}>
          Director Access
        </NavLink>
        {auth.status === "anonymous" ? (
          <>
            <NavLink to="/login" className={mobileLinkClass}>
              Sign in
            </NavLink>
            <NavLink to="/register" className={mobileLinkClass}>
              Sign up
            </NavLink>
          </>
        ) : null}
      </nav>
    </header>
  );
}
