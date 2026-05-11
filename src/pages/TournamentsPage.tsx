import { tournaments } from "@/data/tournaments";

function formatRange(start: string, end: string) {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  if (start === end) return s.toLocaleDateString("en-US", opts);
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}`;
}

function statusLabel(status: (typeof tournaments)[0]["status"]) {
  switch (status) {
    case "open":
      return {
        text: "Open for entry",
        className: "bg-accent/20 text-accent ring-1 ring-accent/30",
      };
    case "waitlist":
      return {
        text: "Waitlist",
        className: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25",
      };
    case "closed":
      return {
        text: "Closed",
        className: "bg-white/10 text-slate-400 ring-1 ring-white/10",
      };
  }
}

export function TournamentsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Activities
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-wide text-white sm:text-5xl">
          Published tournaments
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          Sample listings show how players scan dates, locations, and entry
          health. Replace the static data with your feed or API.
        </p>
      </header>

      <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-panel/80 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-sm">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-space/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 sm:px-6">Event</th>
              <th className="px-4 py-3 sm:px-6">When</th>
              <th className="px-4 py-3 sm:px-6">Where</th>
              <th className="px-4 py-3 sm:px-6">Skill / format</th>
              <th className="px-4 py-3 sm:px-6">Entries</th>
              <th className="px-4 py-3 sm:px-6">Status</th>
              <th className="px-4 py-3 text-right sm:px-6">Action</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map((t) => {
              const st = statusLabel(t.status);
              return (
                <tr
                  key={t.id}
                  className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-4 align-top font-semibold text-white sm:px-6">
                    {t.name}
                  </td>
                  <td className="px-4 py-4 align-top text-slate-400 sm:px-6">
                    {formatRange(t.startDate, t.endDate)}
                  </td>
                  <td className="px-4 py-4 align-top text-slate-400 sm:px-6">
                    {t.city}, {t.region}
                  </td>
                  <td className="px-4 py-4 align-top text-slate-400 sm:px-6">
                    <span className="block text-slate-300">{t.skillBand}</span>
                    <span className="text-xs text-slate-500">{t.format}</span>
                  </td>
                  <td className="px-4 py-4 align-top tabular-nums text-slate-300 sm:px-6">
                    {t.entries} / {t.cap}
                  </td>
                  <td className="px-4 py-4 align-top sm:px-6">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.className}`}
                    >
                      {st.text}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top text-right sm:px-6">
                    <button
                      type="button"
                      className="text-sm font-semibold text-accent hover:text-emerald-300 disabled:text-slate-600"
                      disabled={t.status === "closed"}
                    >
                      {t.status === "closed" ? "View" : "Enter"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-slate-500">
        Tip: add filters for region, rating band, and weekend-only events above
        this table when you promote more listings.
      </p>
    </div>
  );
}
