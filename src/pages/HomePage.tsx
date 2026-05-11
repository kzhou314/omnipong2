import { Button } from "@/components/Button";
import { HeroMark } from "@/components/HeroMark";

export function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="bg-grid-faint pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/[0.06] via-transparent to-transparent" />

        <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 sm:flex-row sm:items-center sm:px-6 sm:py-20 lg:gap-16 lg:py-24">
          <HeroMark />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Tournament infrastructure
            </p>
            <h1 className="font-display mt-4 text-[clamp(2.75rem,9vw,4.5rem)] leading-[0.95] font-normal tracking-wide text-white">
              The <span className="italic text-accent">modern</span> layer for
              <br className="hidden sm:inline" /> table tennis events
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400 sm:mx-0">
              Publish activities, collect entries, and keep directors aligned —
              clear surfaces and mint accents tuned for long sessions at the
              desk or venue.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <Button to="/activities" className="px-6 py-3">
                Browse activities
              </Button>
              <Button to="/players" variant="secondary" className="px-6 py-3">
                I’m a player
              </Button>
              <Button to="/directors" variant="ghost" className="px-6 py-3">
                I run events
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-panel/90 p-7 backdrop-blur-sm">
            <h2 className="font-display text-2xl tracking-wide text-white">
              Live entry pulse
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Capacity and waitlist states surface like KPIs — skim who still
              owes fees before you lock the draw.
            </p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-panel/90 p-7 backdrop-blur-sm">
            <h2 className="font-display text-2xl tracking-wide text-white">
              Split workflows
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Players discover events; directors publish and export — same app,
              two tuned lanes (same split narrative as classic tennis sites).
            </p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-panel/90 p-7 backdrop-blur-sm">
            <h2 className="font-display text-2xl tracking-wide text-white">
              Ready to wire in
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Buttons are stubs today — swap for OAuth, Stripe, or your league
              API without redoing layout.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-panel p-8 backdrop-blur-sm">
            <h2 className="font-display text-3xl tracking-wide text-white">
              For players
            </h2>
            <p className="mt-4 text-slate-400">
              Profiles, ratings on file, and one flow to enter sanctioned or
              club events — tuned for members who already live in tournament
              software.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <span className="text-accent" aria-hidden>
                  ●
                </span>
                Filter public activities by region and schedule
              </li>
              <li className="flex gap-3">
                <span className="text-accent" aria-hidden>
                  ●
                </span>
                Entry states: open, waitlist, closed — at a glance
              </li>
              <li className="flex gap-3">
                <span className="text-accent" aria-hidden>
                  ●
                </span>
                Save contact & club once for repeat entries
              </li>
            </ul>
            <div className="mt-8">
              <Button to="/players" variant="secondary" className="px-6 py-3">
                Open player hub
              </Button>
            </div>
          </article>

          <article className="rounded-2xl border border-accent/25 bg-gradient-to-br from-panel to-space p-8 shadow-[0_0_60px_-20px_rgba(45,212,160,0.35)]">
            <h2 className="font-display text-3xl tracking-wide text-white">
              For tournament directors
            </h2>
            <p className="mt-4 text-slate-400">
              One console-shaped baseline for metadata, caps, and exports —
              bracket engines plug in when you add server logic.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <span className="text-accent" aria-hidden>
                  ●
                </span>
                Event fields match what your activities table already shows
              </li>
              <li className="flex gap-3">
                <span className="text-accent" aria-hidden>
                  ●
                </span>
                Track entries vs published cap in real time
              </li>
              <li className="flex gap-3">
                <span className="text-accent" aria-hidden>
                  ●
                </span>
                Director access stays one click away in the header
              </li>
            </ul>
            <div className="mt-8">
              <Button to="/directors" className="px-6 py-3">
                Open director hub
              </Button>
            </div>
          </article>
        </div>
      </section>

      <section className="border-t border-white/10 bg-panel-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl tracking-wide text-white sm:text-4xl">
            What ships in this baseline
          </h2>
          <p className="mt-3 max-w-2xl text-slate-400">
            Marketing shell, responsive navigation, demo tournament rows, and
            audience-specific pages — swap data sources when your stack is
            ready.
          </p>
          <dl className="mt-12 grid gap-5 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-space/50 p-6">
              <dt className="text-sm font-semibold uppercase tracking-wide text-accent">
                Public activities
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-slate-400">
                Sort-friendly table with status chips — same density players
                expect from tournament explorers.
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-space/50 p-6">
              <dt className="text-sm font-semibold uppercase tracking-wide text-accent">
                Dual audiences
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-slate-400">
                Routes for players vs directors so onboarding stays short.
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-space/50 p-6">
              <dt className="text-sm font-semibold uppercase tracking-wide text-accent">
                Dark-first UI
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-slate-400">
                Built for evening bracket prep — mint accents stay legible on
                navy panels.
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </>
  );
}
