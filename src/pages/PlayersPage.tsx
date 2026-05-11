import { Link } from "react-router-dom";
import { Button } from "@/components/Button";

export function PlayersPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Member access
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-wide text-white sm:text-5xl">
            For players
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            As a registered member, find and enter tournaments online — same
            journey players expect from dedicated tennis platforms, with UI
            tuned for clarity on dark surfaces.
          </p>

          <div className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-panel/90 p-6 backdrop-blur-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Baseline actions (stub)
            </h2>
            <div className="flex flex-wrap gap-3">
              <Button to="/login" className="px-5 py-2.5">
                Sign in to OmniPong
              </Button>
              <Button to="/register" variant="secondary" className="px-5 py-2.5">
                Create account
              </Button>
            </div>
            <p className="text-sm text-slate-500">
              Hook these to your auth provider or club SSO. Until then, they are
              visual placeholders.
            </p>
          </div>

          <ul className="mt-10 space-y-5 text-slate-300">
            <li className="flex gap-4">
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent"
                aria-hidden
              >
                1
              </span>
              <div>
                <p className="font-semibold text-white">Browse activities</p>
                <p className="mt-1 text-sm text-slate-400">
                  Use the{" "}
                  <Link
                    className="font-medium text-accent underline-offset-2 hover:underline"
                    to="/activities"
                  >
                    activities list
                  </Link>{" "}
                  to pick events that fit your schedule and rating.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent"
                aria-hidden
              >
                2
              </span>
              <div>
                <p className="font-semibold text-white">Complete entry</p>
                <p className="mt-1 text-sm text-slate-400">
                  Pay fees and confirm divisions — connect Stripe or your
                  registrar when you go live.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent"
                aria-hidden
              >
                3
              </span>
              <div>
                <p className="font-semibold text-white">Show up seeded</p>
                <p className="mt-1 text-sm text-slate-400">
                  Directors post draws and schedule blocks — surface them here
                  once the backend is wired.
                </p>
              </div>
            </li>
          </ul>
        </div>

        <aside className="rounded-2xl border border-dashed border-accent/25 bg-panel-muted/60 p-6">
          <h2 className="font-display text-2xl tracking-wide text-white">
            Player checklist
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            <li>Photo ID and proof of rating (if required)</li>
            <li>USATT or league ID — optional for unrated events</li>
            <li>Emergency contact on file in your profile</li>
            <li>Rubber listings legal for the sanctioning body</li>
          </ul>
          <p className="mt-6 text-xs text-slate-500">
            Customize per region — juniors, wheelchair classes, and corporate
            formats need different copy.
          </p>
        </aside>
      </div>
    </div>
  );
}
