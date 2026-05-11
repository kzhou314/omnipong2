import { Link } from "react-router-dom";
import { Button } from "@/components/Button";

export function DirectorsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Director access
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-wide text-white sm:text-5xl">
            For tournament directors
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            Run sanctioned or club events from one dashboard — publish listings,
            watch entries fill, and prepare brackets. Built for the same
            “director lane” players expect from legacy systems, with a layout
            aligned to modern analytics apps.
          </p>

          <div className="mt-8 space-y-4 rounded-2xl border border-accent/25 bg-gradient-to-br from-panel to-space p-6 shadow-[0_0_50px_-18px_rgba(45,212,160,0.35)]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-accent">
              Director console (stub)
            </h2>
            <div className="flex flex-wrap gap-3">
              <Button className="px-5 py-2.5">Open director login</Button>
              <Button variant="secondary" className="px-5 py-2.5">
                Request director role
              </Button>
            </div>
            <p className="text-sm text-slate-400">
              Protect these routes with verification — many organizations
              approve directors before they can publish.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-panel/80 p-5 backdrop-blur-sm">
              <h3 className="font-semibold text-white">Create an event</h3>
              <p className="mt-2 text-sm text-slate-400">
                Name, venue, dates, skill text, format notes, and published cap
                — matches your activities table.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-panel/80 p-5 backdrop-blur-sm">
              <h3 className="font-semibold text-white">Manage entries</h3>
              <p className="mt-2 text-sm text-slate-400">
                Withdrawals, division moves, CSV export for sanctioning tools.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-panel/80 p-5 backdrop-blur-sm">
              <h3 className="font-semibold text-white">Seed & schedule</h3>
              <p className="mt-2 text-sm text-slate-400">
                Plug in bracket generation when server-side pairing exists.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-panel/80 p-5 backdrop-blur-sm">
              <h3 className="font-semibold text-white">Results & standings</h3>
              <p className="mt-2 text-sm text-slate-400">
                Publish placements back to the record tied to player profiles.
              </p>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-panel/90 p-6 backdrop-blur-sm">
            <h2 className="font-display text-2xl tracking-wide text-white">
              Live sample data
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              The{" "}
              <Link
                className="font-medium text-accent underline-offset-2 hover:underline"
                to="/activities"
              >
                activities table
              </Link>{" "}
              reads static demo rows in{" "}
              <code className="rounded bg-space px-1.5 py-0.5 text-xs text-accent">
                src/data/tournaments.ts
              </code>
              . Replace with an API fetch.
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-white/15 bg-space/80 p-6">
            <h2 className="font-display text-2xl tracking-wide text-white">
              Compliance note
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Safeguarding minors, refunds, and sanctioning fees vary — add
              disclosures before production.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
