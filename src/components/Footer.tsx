import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-panel-muted/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="font-display text-2xl tracking-wide text-white">
            OmniPong
          </p>
          <p className="text-sm leading-relaxed text-slate-400">
            Tournament listings, entries, and director workflows — UI styled for
            clarity on dark surfaces (visual direction inspired by{" "}
            <a
              className="text-accent underline-offset-2 hover:underline"
              href="https://player-insight.com/"
              target="_blank"
              rel="noreferrer"
            >
              Player Insight
            </a>
            ).
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent/90">
            Discover
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li>
              <Link className="hover:text-white" to="/activities">
                Tournament calendar
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" to="/players">
                Player registration
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" to="/directors">
                Director tools
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent/90">
            Baseline notice
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Starter UI — connect auth, payments, and live draws when you plug in
            a backend.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent/90">
            Stay current
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Replace this block with your mailing list or club links.
          </p>
        </div>
      </div>
      <div className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} OmniPong baseline — not affiliated with
        omnipong.com or player-insight.com
      </div>
    </footer>
  );
}
