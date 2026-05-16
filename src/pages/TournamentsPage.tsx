import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type TournamentRecord = {
  id: string;
  layout_id: string | null;
  name: string;
  venue_name: string;
  city: string;
  state: string;
  start_date: string;
  end_date: string;
  status: "draft" | "published" | "closed" | "cancelled";
};

type EventRecord = {
  id: string;
  tournament_id: string;
  name: string;
  start_time: string;
  end_time: string;
  entry_fee_cents: number;
  capacity: number;
  table_count: number;
  rating_min: number | null;
  rating_max: number | null;
  status: "scheduled" | "full" | "closed" | "cancelled";
};

type EventEntryRecord = {
  event_id: string;
};

type MemberEligibilityProfile = {
  id: string;
  usatt_rating: number | null;
};

type TournamentSummary = TournamentRecord & {
  eventCount: number;
};

type TournamentListState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; tournaments: TournamentSummary[] };

type TournamentEventRow = {
  id: string;
  name: string;
  eventStart: string;
  eventEnd: string;
  capacity: number;
  entries: number;
  entryFeeCents: number;
  ratingMin: number | null;
  ratingMax: number | null;
  status: EventRecord["status"];
};

type TournamentDetailState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "not_found" }
  | {
      status: "ready";
      tournament: TournamentRecord;
      events: TournamentEventRow[];
    };

type EventFeedback = {
  kind: "error" | "success";
  message: string;
};

function formatDateRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);

  if (start === end) {
    return formatter.format(startDate);
  }

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

function formatEventWindow(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
}

function ratingBandLabel(min: number | null, max: number | null) {
  if (min === null && max === null) {
    return "Open to all ratings";
  }
  if (min !== null && max !== null) {
    return `USATT ${min}-${max}`;
  }
  if (min !== null) {
    return `USATT ${min}+`;
  }
  return `Up to USATT ${max}`;
}

function statusLabel(row: TournamentEventRow) {
  if (row.status === "cancelled") {
    return {
      text: "Cancelled",
      className: "bg-red-400/15 text-red-300 ring-1 ring-red-400/20",
      action: "View",
      disabled: true,
    };
  }

  if (row.status === "closed") {
    return {
      text: "Closed",
      className: "bg-white/10 text-slate-400 ring-1 ring-white/10",
      action: "View",
      disabled: true,
    };
  }

  if (row.status === "full" || row.entries >= row.capacity) {
    return {
      text: "Full",
      className: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25",
      action: "Waitlist",
      disabled: true,
    };
  }

  return {
    text: "Open for entry",
    className: "bg-accent/20 text-accent ring-1 ring-accent/30",
    action: "Enter",
    disabled: false,
  };
}

export function TournamentsPage() {
  const [loadState, setLoadState] = useState<TournamentListState>({
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadTournaments() {
      setLoadState({ status: "loading" });

      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("id, layout_id, name, venue_name, city, state, start_date, end_date, status")
        .eq("status", "published")
        .order("start_date", { ascending: true });

      if (cancelled) {
        return;
      }

      if (tournamentError) {
        setLoadState({ status: "error", error: tournamentError.message });
        return;
      }

      const tournaments = (tournamentData ?? []) as TournamentRecord[];
      if (tournaments.length === 0) {
        setLoadState({ status: "ready", tournaments: [] });
        return;
      }

      const tournamentIds = tournaments.map((tournament) => tournament.id);
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id, tournament_id")
        .in("tournament_id", tournamentIds);

      if (cancelled) {
        return;
      }

      if (eventError) {
        setLoadState({ status: "error", error: eventError.message });
        return;
      }

      const eventCounts = new Map<string, number>();
      for (const eventRow of (eventData ?? []) as Pick<EventRecord, "id" | "tournament_id">[]) {
        eventCounts.set(
          eventRow.tournament_id,
          (eventCounts.get(eventRow.tournament_id) ?? 0) + 1,
        );
      }

      setLoadState({
        status: "ready",
        tournaments: tournaments.map((tournament) => ({
          ...tournament,
          eventCount: eventCounts.get(tournament.id) ?? 0,
        })),
      });
    }

    void loadTournaments();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Activities
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-wide text-white sm:text-5xl">
          Published tournaments
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          Browse the live tournament list first, then open a tournament to see
          the events inside it. Draft tournaments stay hidden until directors
          publish them.
        </p>
      </header>

      {loadState.status === "loading" ? (
        <div className="mt-10 rounded-2xl border border-white/10 bg-panel/80 p-10 text-center text-slate-400 backdrop-blur-sm">
          Loading published tournaments…
        </div>
      ) : loadState.status === "error" ? (
        <div className="mt-10 rounded-2xl border border-red-400/20 bg-panel/80 p-10 text-center text-red-300 backdrop-blur-sm">
          <p className="font-semibold">We could not load the tournament list.</p>
          <p className="mt-3 text-sm text-slate-400">{loadState.error}</p>
        </div>
      ) : loadState.tournaments.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-white/10 bg-panel/80 p-10 text-center text-slate-400 backdrop-blur-sm">
          No published tournaments yet. Directors can create them in the
          website, and they will appear here once their status is set to
          `published`.
        </div>
      ) : (
        <div className="mt-10 grid gap-5">
          {loadState.tournaments.map((tournament) => (
            <Link
              key={tournament.id}
              to={`/activities/${tournament.id}`}
              className="rounded-2xl border border-white/10 bg-panel/80 p-6 transition hover:border-accent/30 hover:bg-white/[0.03] hover:shadow-[0_0_40px_-24px_rgba(45,212,160,0.45)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                    Tournament
                  </p>
                  <h2 className="font-display mt-3 text-3xl tracking-wide text-white">
                    {tournament.name}
                  </h2>
                  <p className="mt-3 text-lg text-slate-300">
                    {tournament.venue_name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {tournament.city}, {tournament.state}
                  </p>
                </div>

                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <span className="rounded-full border border-white/10 bg-space/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {tournament.eventCount} event
                    {tournament.eventCount === 1 ? "" : "s"}
                  </span>
                  <span className="text-sm text-slate-400">
                    {formatDateRange(tournament.start_date, tournament.end_date)}
                  </span>
                  <span className="text-sm font-semibold text-accent">
                    View tournament
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function TournamentDetailsPage() {
  const auth = useAuth();
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [loadState, setLoadState] = useState<TournamentDetailState>({
    status: "loading",
  });
  const [eventFeedback, setEventFeedback] = useState<Record<string, EventFeedback>>({});
  const [activeEntryEventId, setActiveEntryEventId] = useState<string | null>(null);

  async function loadTournamentDetails() {
    if (!tournamentId) {
      setLoadState({ status: "not_found" });
      return;
    }

    setLoadState({ status: "loading" });

    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, layout_id, name, venue_name, city, state, start_date, end_date, status")
      .eq("id", tournamentId)
      .eq("status", "published")
      .maybeSingle();

    if (tournamentError) {
      setLoadState({ status: "error", error: tournamentError.message });
      return;
    }

    if (!tournamentData) {
      setLoadState({ status: "not_found" });
      return;
    }

    const tournament = tournamentData as TournamentRecord;
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select(
        "id, tournament_id, name, start_time, end_time, entry_fee_cents, capacity, table_count, rating_min, rating_max, status",
      )
      .eq("tournament_id", tournamentId)
      .order("start_time", { ascending: true });

    if (eventError) {
      setLoadState({ status: "error", error: eventError.message });
      return;
    }

    const events = (eventData ?? []) as EventRecord[];
    if (events.length === 0) {
      setLoadState({ status: "ready", tournament, events: [] });
      return;
    }

    const eventIds = events.map((eventRow) => eventRow.id);
    const { data: entryData, error: entryError } = await supabase
      .from("event_entries")
      .select("event_id")
      .in("event_id", eventIds);

    if (entryError) {
      setLoadState({ status: "error", error: entryError.message });
      return;
    }

    const entryCounts = new Map<string, number>();
    for (const entry of (entryData ?? []) as EventEntryRecord[]) {
      entryCounts.set(entry.event_id, (entryCounts.get(entry.event_id) ?? 0) + 1);
    }

    setLoadState({
      status: "ready",
      tournament,
      events: events.map((eventRow) => ({
        id: eventRow.id,
        name: eventRow.name,
        eventStart: eventRow.start_time,
        eventEnd: eventRow.end_time,
        capacity: eventRow.capacity,
        entries: entryCounts.get(eventRow.id) ?? 0,
        entryFeeCents: eventRow.entry_fee_cents,
        ratingMin: eventRow.rating_min,
        ratingMax: eventRow.rating_max,
        status: eventRow.status,
      })),
    });
  }

  useEffect(() => {
    async function runLoad() {
      await loadTournamentDetails();
    }

    void runLoad();
  }, [tournamentId]);

  async function onEnterEvent(eventRow: TournamentEventRow) {
    setEventFeedback((current) => {
      const next = { ...current };
      delete next[eventRow.id];
      return next;
    });

    if (auth.status !== "authenticated") {
      setEventFeedback((current) => ({
        ...current,
        [eventRow.id]: {
          kind: "error",
          message: "Sign in with your member account before entering an event.",
        },
      }));
      return;
    }

    if (eventRow.status === "cancelled") {
      setEventFeedback((current) => ({
        ...current,
        [eventRow.id]: {
          kind: "error",
          message: "This event has been cancelled and is not accepting entries.",
        },
      }));
      return;
    }

    if (eventRow.status === "closed") {
      setEventFeedback((current) => ({
        ...current,
        [eventRow.id]: {
          kind: "error",
          message: "This event is closed and can no longer accept entries.",
        },
      }));
      return;
    }

    if (eventRow.status === "full" || eventRow.entries >= eventRow.capacity) {
      setEventFeedback((current) => ({
        ...current,
        [eventRow.id]: {
          kind: "error",
          message: "This event is already full.",
        },
      }));
      return;
    }

    setActiveEntryEventId(eventRow.id);

    const { data: profile, error: profileError } = await supabase
      .from("members")
      .select("id, usatt_rating")
      .eq("id", auth.user.id)
      .single<MemberEligibilityProfile>();

    if (profileError || !profile) {
      setActiveEntryEventId(null);
      setEventFeedback((current) => ({
        ...current,
        [eventRow.id]: {
          kind: "error",
          message:
            profileError?.message ?? "We could not load your member profile.",
        },
      }));
      return;
    }

    if (
      (eventRow.ratingMin !== null || eventRow.ratingMax !== null) &&
      profile.usatt_rating === null
    ) {
      setActiveEntryEventId(null);
      setEventFeedback((current) => ({
        ...current,
        [eventRow.id]: {
          kind: "error",
          message:
            "This event has a rating restriction. Add your USATT rating in My profile before entering.",
        },
      }));
      return;
    }

    if (
      eventRow.ratingMin !== null &&
      profile.usatt_rating !== null &&
      profile.usatt_rating < eventRow.ratingMin
    ) {
      setActiveEntryEventId(null);
      setEventFeedback((current) => ({
        ...current,
        [eventRow.id]: {
          kind: "error",
          message: `You need a USATT rating of at least ${eventRow.ratingMin} for this event. Your profile rating is ${profile.usatt_rating}.`,
        },
      }));
      return;
    }

    if (
      eventRow.ratingMax !== null &&
      profile.usatt_rating !== null &&
      profile.usatt_rating > eventRow.ratingMax
    ) {
      setActiveEntryEventId(null);
      setEventFeedback((current) => ({
        ...current,
        [eventRow.id]: {
          kind: "error",
          message: `This event caps entries at USATT ${eventRow.ratingMax}. Your profile rating is ${profile.usatt_rating}.`,
        },
      }));
      return;
    }

    const { error } = await supabase.from("event_entries").insert({
      event_id: eventRow.id,
      member_id: auth.user.id,
    });

    if (error) {
      setActiveEntryEventId(null);
      if (error.code === "23505") {
        setEventFeedback((current) => ({
          ...current,
          [eventRow.id]: {
            kind: "error",
            message: "You are already entered in this event.",
          },
        }));
        return;
      }

      setEventFeedback((current) => ({
        ...current,
        [eventRow.id]: {
          kind: "error",
          message: error.message,
        },
      }));
      return;
    }

    await loadTournamentDetails();
    setActiveEntryEventId(null);
    setEventFeedback((current) => ({
      ...current,
      [eventRow.id]: {
        kind: "success",
        message: "You have been entered in this event.",
      },
    }));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Button to="/activities" variant="ghost" className="px-0 py-0 text-sm">
          Back to tournaments
        </Button>
      </div>

      {loadState.status === "loading" ? (
        <div className="rounded-2xl border border-white/10 bg-panel/80 p-10 text-center text-slate-400 backdrop-blur-sm">
          Loading tournament details…
        </div>
      ) : loadState.status === "error" ? (
        <div className="rounded-2xl border border-red-400/20 bg-panel/80 p-10 text-center text-red-300 backdrop-blur-sm">
          <p className="font-semibold">We could not load this tournament.</p>
          <p className="mt-3 text-sm text-slate-400">{loadState.error}</p>
        </div>
      ) : loadState.status === "not_found" ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-panel/80 p-10 text-center text-slate-400 backdrop-blur-sm">
          This tournament is not available for public browsing.
        </div>
      ) : (
        <>
          <header className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Tournament
            </p>
            <h1 className="font-display mt-3 text-4xl tracking-wide text-white sm:text-5xl">
              {loadState.tournament.name}
            </h1>
            <p className="mt-4 text-lg text-slate-300">
              {loadState.tournament.venue_name}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {loadState.tournament.city}, {loadState.tournament.state}
            </p>
            <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-400">
              {formatDateRange(
                loadState.tournament.start_date,
                loadState.tournament.end_date,
              )}
            </p>
            {loadState.tournament.layout_id ? (
              <div className="mt-6">
                <Button
                  to={`/activities/${loadState.tournament.id}/layout`}
                  variant="secondary"
                  className="px-5 py-2.5"
                >
                  View tournament layout
                </Button>
              </div>
            ) : null}
          </header>

          <section className="mt-10 rounded-2xl border border-white/10 bg-panel/80 p-6 backdrop-blur-sm sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  Events
                </p>
                <h2 className="font-display mt-3 text-3xl tracking-wide text-white">
                  Tournament schedule
                </h2>
              </div>
              <span className="rounded-full border border-white/10 bg-space/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {loadState.events.length} event{loadState.events.length === 1 ? "" : "s"}
              </span>
            </div>

            {loadState.events.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-space/40 p-6 text-sm text-slate-400">
                No events have been posted for this tournament yet.
              </div>
            ) : (
              <div className="mt-8 space-y-4">
                {loadState.events.map((eventRow) => {
                  const status = statusLabel(eventRow);

                  return (
                    <div
                      key={eventRow.id}
                      className="rounded-2xl border border-white/10 bg-space/50 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-white">{eventRow.name}</h3>
                          <p className="mt-1 text-sm text-slate-400">
                            {formatEventWindow(eventRow.eventStart, eventRow.eventEnd)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
                        >
                          {status.text}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
                        <p>
                          Rating band:{" "}
                          <span className="text-slate-200">
                            {ratingBandLabel(eventRow.ratingMin, eventRow.ratingMax)}
                          </span>
                        </p>
                        <p>
                          Entry fee:{" "}
                          <span className="text-slate-200">
                            ${(eventRow.entryFeeCents / 100).toFixed(2)}
                          </span>
                        </p>
                        <p>
                          Entries:{" "}
                          <span className="text-slate-200">
                            {eventRow.entries} / {eventRow.capacity}
                          </span>
                        </p>
                      </div>

                      <div className="mt-5 flex justify-end">
                        <button
                          type="button"
                          className="text-sm font-semibold text-accent hover:text-emerald-300 disabled:text-slate-600"
                          disabled={status.disabled || activeEntryEventId === eventRow.id}
                          onClick={() => void onEnterEvent(eventRow)}
                        >
                          {activeEntryEventId === eventRow.id
                            ? "Checking…"
                            : status.action}
                        </button>
                      </div>
                      {eventFeedback[eventRow.id] ? (
                        <p
                          className={`mt-3 text-sm ${
                            eventFeedback[eventRow.id].kind === "error"
                              ? "text-red-300"
                              : "text-accent"
                          }`}
                          role={
                            eventFeedback[eventRow.id].kind === "error"
                              ? "alert"
                              : "status"
                          }
                        >
                          {eventFeedback[eventRow.id].message}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
