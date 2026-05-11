import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-accent/15 text-accent"
      : "text-slate-400 hover:bg-white/5 hover:text-white"
  }`;

export function Header() {
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

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="hidden rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 backdrop-blur-sm hover:bg-white/10 sm:inline-flex"
          >
            Member sign in
          </button>
          <button
            type="button"
            className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-space shadow-[0_0_20px_-4px_rgba(45,212,160,0.5)] hover:brightness-110"
          >
            Director access
          </button>
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
      </nav>
    </header>
  );
}
