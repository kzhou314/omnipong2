import { type FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type DirectorStatus =
  | { status: "loading" }
  | { status: "forbidden" }
  | { status: "ready" }
  | { status: "error"; error: string };

type TournamentRecord = {
  id: string;
  director_id: string;
  layout_id: string | null;
  name: string;
  venue_name: string;
  city: string;
  state: string;
  start_date: string;
  end_date: string;
  flyer_url: string | null;
  registration_open: string | null;
  registration_close: string | null;
  status: "draft" | "published" | "closed" | "cancelled";
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
};

type DirectorLayoutRecord = {
  id: string;
  director_id: string;
  name: string;
  total_tables: number;
  created_at: string;
  updated_at: string;
};

type TournamentFormState = {
  name: string;
  venueName: string;
  city: string;
  state: string;
  startDate: string;
  endDate: string;
  flyerUrl: string;
  registrationOpen: string;
  registrationClose: string;
  status: TournamentRecord["status"];
};

type EventFormState = {
  name: string;
  startTime: string;
  endTime: string;
  entryFeeDollars: string;
  capacity: string;
  tableCount: string;
  ratingMin: string;
  ratingMax: string;
  status: EventRecord["status"];
};

type LayoutFormState = {
  name: string;
  totalTables: string;
};

const emptyTournamentForm: TournamentFormState = {
  name: "",
  venueName: "",
  city: "",
  state: "",
  startDate: "",
  endDate: "",
  flyerUrl: "",
  registrationOpen: "",
  registrationClose: "",
  status: "draft",
};

const emptyEventForm: EventFormState = {
  name: "",
  startTime: "",
  endTime: "",
  entryFeeDollars: "0",
  capacity: "",
  tableCount: "1",
  ratingMin: "",
  ratingMax: "",
  status: "scheduled",
};

const emptyLayoutForm: LayoutFormState = {
  name: "",
  totalTables: "12",
};

const DEFAULT_LAYOUT_COLUMNS = 8;

function EditIcon() {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function formatDateRange(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (startDate === endDate) {
    return formatter.format(start);
  }
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatEntryFee(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function statusBadge(status: TournamentRecord["status"] | EventRecord["status"]) {
  switch (status) {
    case "published":
      return "bg-accent/20 text-accent ring-1 ring-accent/30";
    case "draft":
      return "bg-white/10 text-slate-300 ring-1 ring-white/10";
    case "closed":
      return "bg-white/10 text-slate-400 ring-1 ring-white/10";
    case "cancelled":
      return "bg-red-400/15 text-red-300 ring-1 ring-red-400/20";
    case "scheduled":
      return "bg-accent/10 text-accent ring-1 ring-accent/20";
    case "full":
      return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20";
    default:
      return "bg-white/10 text-slate-300 ring-1 ring-white/10";
  }
}

function toIsoOrNull(value: string) {
  if (!value) {
    return null;
  }
  return new Date(value).toISOString();
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function buildDefaultLayoutTables(layoutId: string, roomId: string, totalTables: number) {
  return Array.from({ length: totalTables }, (_, index) => ({
    layout_id: layoutId,
    room_id: roomId,
    table_number: index + 1,
    grid_x: (index % DEFAULT_LAYOUT_COLUMNS) + 1,
    grid_y: Math.floor(index / DEFAULT_LAYOUT_COLUMNS) + 1,
  }));
}

function toEventFormFromRecord(eventRow: EventRecord): EventFormState {
  return {
    name: eventRow.name,
    startTime: toDateTimeLocalValue(eventRow.start_time),
    endTime: toDateTimeLocalValue(eventRow.end_time),
    entryFeeDollars: (eventRow.entry_fee_cents / 100).toFixed(2),
    capacity: eventRow.capacity.toString(),
    tableCount: eventRow.table_count.toString(),
    ratingMin: eventRow.rating_min?.toString() ?? "",
    ratingMax: eventRow.rating_max?.toString() ?? "",
    status: eventRow.status,
  };
}

function isTournamentFinished(status: TournamentRecord["status"]) {
  return status === "closed" || status === "cancelled";
}

export function DirectorsPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { tournamentId } = useParams<{ tournamentId?: string }>();

  const isCreateRoute = location.pathname === "/directors/new";
  const isEditRoute = location.pathname.startsWith("/directors/tournaments/");

  const [directorStatus, setDirectorStatus] = useState<DirectorStatus>({
    status: "loading",
  });
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(
    null,
  );
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [eventsStatus, setEventsStatus] = useState<"idle" | "loading" | "error" | "ready">(
    "idle",
  );
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [layouts, setLayouts] = useState<DirectorLayoutRecord[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [layoutsError, setLayoutsError] = useState<string | null>(null);

  const [tournamentForm, setTournamentForm] =
    useState<TournamentFormState>(emptyTournamentForm);
  const [eventForm, setEventForm] = useState<EventFormState>(emptyEventForm);
  const [selectedTournamentForm, setSelectedTournamentForm] =
    useState<TournamentFormState>(emptyTournamentForm);
  const [layoutForm, setLayoutForm] = useState<LayoutFormState>(emptyLayoutForm);

  const [tournamentError, setTournamentError] = useState<string | null>(null);
  const [tournamentSuccess, setTournamentSuccess] = useState<string | null>(null);
  const [selectedTournamentError, setSelectedTournamentError] = useState<string | null>(null);
  const [selectedTournamentSuccess, setSelectedTournamentSuccess] =
    useState<string | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventSuccess, setEventSuccess] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEventForm, setEditingEventForm] =
    useState<EventFormState>(emptyEventForm);
  const [editingEventError, setEditingEventError] = useState<string | null>(null);
  const [editingEventSuccess, setEditingEventSuccess] = useState<string | null>(null);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [layoutSuccess, setLayoutSuccess] = useState<string | null>(null);

  const [creatingTournament, setCreatingTournament] = useState(false);
  const [updatingTournament, setUpdatingTournament] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [updatingEvent, setUpdatingEvent] = useState(false);
  const [creatingLayout, setCreatingLayout] = useState(false);
  const [applyingLayout, setApplyingLayout] = useState(false);

  const selectedTournament =
    tournaments.find((tournament) => tournament.id === selectedTournamentId) ??
    null;
  const selectedLayout =
    layouts.find((layout) => layout.id === selectedLayoutId) ?? null;

  async function loadTournaments(
    userId: string,
    preferredTournamentId?: string | null,
  ) {
    const { data, error } = await supabase
      .from("tournaments")
      .select(
        "id, director_id, layout_id, name, venue_name, city, state, start_date, end_date, flyer_url, registration_open, registration_close, status, created_at, updated_at",
      )
      .eq("director_id", userId)
      .order("start_date", { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as TournamentRecord[];
    setTournaments(rows);
    setSelectedTournamentId((current) => {
      const candidate = preferredTournamentId ?? current;
      if (candidate && rows.some((row) => row.id === candidate)) {
        return candidate;
      }
      return rows[0]?.id ?? null;
    });
  }

  async function loadEvents(targetTournamentId: string) {
    setEventsStatus("loading");
    setEventsError(null);

    const { data, error } = await supabase
      .from("events")
      .select(
        "id, tournament_id, name, start_time, end_time, entry_fee_cents, capacity, table_count, rating_min, rating_max, status, created_at, updated_at",
      )
      .eq("tournament_id", targetTournamentId)
      .order("start_time", { ascending: true });

    if (error) {
      setEventsStatus("error");
      setEventsError(error.message);
      return;
    }

    setEvents((data ?? []) as EventRecord[]);
    setEventsStatus("ready");
  }

  async function loadLayouts(userId: string, preferredLayoutId?: string | null) {
    setLayoutsError(null);

    const { data, error } = await supabase
      .from("director_layouts")
      .select("id, director_id, name, total_tables, created_at, updated_at")
      .eq("director_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      setLayouts([]);
      setSelectedLayoutId(null);
      setLayoutsError(error.message);
      return;
    }

    const rows = (data ?? []) as DirectorLayoutRecord[];
    setLayouts(rows);
    setSelectedLayoutId((current) => {
      const candidate = preferredLayoutId ?? current;
      if (candidate && rows.some((row) => row.id === candidate)) {
        return candidate;
      }
      return rows[0]?.id ?? null;
    });
  }

  useEffect(() => {
    if (auth.status === "loading") {
      return;
    }

    if (auth.status === "anonymous") {
      setDirectorStatus({ status: "forbidden" });
      return;
    }

    const userId = auth.user.id;
    let cancelled = false;

    async function bootstrapDirectorConsole() {
      setDirectorStatus({ status: "loading" });

      const { data, error } = await supabase
        .from("member_roles")
        .select("role")
        .eq("member_id", userId)
        .eq("role", "director")
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        setDirectorStatus({ status: "error", error: error.message });
        return;
      }

      if (!data) {
        setDirectorStatus({ status: "forbidden" });
        return;
      }

      try {
        await Promise.all([
          loadTournaments(userId, tournamentId ?? null),
          loadLayouts(userId),
        ]);
        if (!cancelled) {
          setDirectorStatus({ status: "ready" });
        }
      } catch (loadError) {
        if (!cancelled) {
          setDirectorStatus({
            status: "error",
            error:
              loadError instanceof Error
                ? loadError.message
                : "Could not load your tournaments.",
          });
        }
      }
    }

    void bootstrapDirectorConsole();

    return () => {
      cancelled = true;
    };
  }, [auth, tournamentId]);

  useEffect(() => {
    if (!isEditRoute) {
      setEvents([]);
      setEventsStatus("idle");
      return;
    }

    if (directorStatus.status !== "ready" || !selectedTournamentId) {
      setEvents([]);
      setEventsStatus("idle");
      return;
    }

    void loadEvents(selectedTournamentId);
  }, [directorStatus, isEditRoute, selectedTournamentId]);

  useEffect(() => {
    if (!selectedTournament) {
      setSelectedTournamentForm(emptyTournamentForm);
      setSelectedTournamentError(null);
      setSelectedTournamentSuccess(null);
      return;
    }

    setSelectedTournamentForm({
      name: selectedTournament.name,
      venueName: selectedTournament.venue_name,
      city: selectedTournament.city,
      state: selectedTournament.state,
      startDate: selectedTournament.start_date,
      endDate: selectedTournament.end_date,
      flyerUrl: selectedTournament.flyer_url ?? "",
      registrationOpen: toDateTimeLocalValue(selectedTournament.registration_open),
      registrationClose: toDateTimeLocalValue(selectedTournament.registration_close),
      status: selectedTournament.status,
    });
    setSelectedTournamentError(null);
    setSelectedTournamentSuccess(null);
  }, [selectedTournament]);

  useEffect(() => {
    setEditingEventId(null);
    setEditingEventForm(emptyEventForm);
    setEditingEventError(null);
    setEditingEventSuccess(null);
  }, [selectedTournamentId]);

  useEffect(() => {
    if (!selectedTournament?.layout_id) {
      return;
    }

    if (layouts.some((layout) => layout.id === selectedTournament.layout_id)) {
      setSelectedLayoutId(selectedTournament.layout_id);
    }
  }, [layouts, selectedTournament?.layout_id]);

  useEffect(() => {
    if (!selectedLayout) {
      setLayoutError(null);
      setLayoutSuccess(null);
    }
  }, [selectedLayout]);

  async function onCreateTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (auth.status !== "authenticated") {
      return;
    }

    setCreatingTournament(true);
    setTournamentError(null);
    setTournamentSuccess(null);

    const { data, error } = await supabase
      .from("tournaments")
      .insert({
        director_id: auth.user.id,
        name: tournamentForm.name.trim(),
        venue_name: tournamentForm.venueName.trim(),
        city: tournamentForm.city.trim(),
        state: tournamentForm.state.trim(),
        start_date: tournamentForm.startDate,
        end_date: tournamentForm.endDate,
        flyer_url: tournamentForm.flyerUrl.trim() || null,
        registration_open: toIsoOrNull(tournamentForm.registrationOpen),
        registration_close: toIsoOrNull(tournamentForm.registrationClose),
        status: tournamentForm.status,
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !data) {
      setCreatingTournament(false);
      setTournamentError(error?.message ?? "Could not create the tournament.");
      return;
    }

    await loadTournaments(auth.user.id, data.id);
    setCreatingTournament(false);
    setTournamentForm(emptyTournamentForm);
    setTournamentSuccess("Tournament created.");
    navigate(`/directors/tournaments/${data.id}`);
  }

  async function onCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (auth.status !== "authenticated" || !selectedTournamentId) {
      return;
    }

    setCreatingEvent(true);
    setEventError(null);
    setEventSuccess(null);

    const entryFeeCents = Math.round(Number(eventForm.entryFeeDollars) * 100);
    const capacity = Number(eventForm.capacity);
    const tableCount = Number(eventForm.tableCount);
    const ratingMin = eventForm.ratingMin ? Number(eventForm.ratingMin) : null;
    const ratingMax = eventForm.ratingMax ? Number(eventForm.ratingMax) : null;

    if (
      !Number.isFinite(entryFeeCents) ||
      !Number.isInteger(capacity) ||
      capacity <= 0 ||
      !Number.isInteger(tableCount) ||
      tableCount <= 0
    ) {
      setCreatingEvent(false);
      setEventError("Entry fee, capacity, and table count need valid values.");
      return;
    }

    const { error } = await supabase.from("events").insert({
      tournament_id: selectedTournamentId,
      name: eventForm.name.trim(),
      start_time: new Date(eventForm.startTime).toISOString(),
      end_time: new Date(eventForm.endTime).toISOString(),
      entry_fee_cents: entryFeeCents,
      capacity,
      table_count: tableCount,
      rating_min: ratingMin,
      rating_max: ratingMax,
      status: eventForm.status,
    });

    if (error) {
      setCreatingEvent(false);
      setEventError(error.message);
      return;
    }

    await loadEvents(selectedTournamentId);
    setCreatingEvent(false);
    setEventForm(emptyEventForm);
    setEventSuccess("Event created.");
  }

  async function onUpdateSelectedTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (auth.status !== "authenticated" || !selectedTournamentId) {
      return;
    }

    setUpdatingTournament(true);
    setSelectedTournamentError(null);
    setSelectedTournamentSuccess(null);

    const { error } = await supabase
      .from("tournaments")
      .update({
        name: selectedTournamentForm.name.trim(),
        venue_name: selectedTournamentForm.venueName.trim(),
        city: selectedTournamentForm.city.trim(),
        state: selectedTournamentForm.state.trim(),
        start_date: selectedTournamentForm.startDate,
        end_date: selectedTournamentForm.endDate,
        flyer_url: selectedTournamentForm.flyerUrl.trim() || null,
        registration_open: toIsoOrNull(selectedTournamentForm.registrationOpen),
        registration_close: toIsoOrNull(selectedTournamentForm.registrationClose),
        status: selectedTournamentForm.status,
      })
      .eq("id", selectedTournamentId)
      .eq("director_id", auth.user.id);

    if (error) {
      setUpdatingTournament(false);
      setSelectedTournamentError(error.message);
      return;
    }

    await loadTournaments(auth.user.id, selectedTournamentId);
    setUpdatingTournament(false);
    setSelectedTournamentSuccess("Tournament updated.");
  }

  function onStartEditingEvent(eventRow: EventRecord) {
    setEditingEventId(eventRow.id);
    setEditingEventForm(toEventFormFromRecord(eventRow));
    setEditingEventError(null);
    setEditingEventSuccess(null);
  }

  async function onUpdateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (auth.status !== "authenticated" || !editingEventId || !selectedTournamentId) {
      return;
    }

    setUpdatingEvent(true);
    setEditingEventError(null);
    setEditingEventSuccess(null);

    const entryFeeCents = Math.round(Number(editingEventForm.entryFeeDollars) * 100);
    const capacity = Number(editingEventForm.capacity);
    const tableCount = Number(editingEventForm.tableCount);
    const ratingMin = editingEventForm.ratingMin
      ? Number(editingEventForm.ratingMin)
      : null;
    const ratingMax = editingEventForm.ratingMax
      ? Number(editingEventForm.ratingMax)
      : null;

    if (
      !Number.isFinite(entryFeeCents) ||
      !Number.isInteger(capacity) ||
      capacity <= 0 ||
      !Number.isInteger(tableCount) ||
      tableCount <= 0
    ) {
      setUpdatingEvent(false);
      setEditingEventError("Entry fee, capacity, and table count need valid values.");
      return;
    }

    const { error } = await supabase
      .from("events")
      .update({
        name: editingEventForm.name.trim(),
        start_time: new Date(editingEventForm.startTime).toISOString(),
        end_time: new Date(editingEventForm.endTime).toISOString(),
        entry_fee_cents: entryFeeCents,
        capacity,
        table_count: tableCount,
        rating_min: ratingMin,
        rating_max: ratingMax,
        status: editingEventForm.status,
      })
      .eq("id", editingEventId)
      .eq("tournament_id", selectedTournamentId);

    if (error) {
      setUpdatingEvent(false);
      setEditingEventError(error.message);
      return;
    }

    await loadEvents(selectedTournamentId);
    setUpdatingEvent(false);
    setEditingEventSuccess("Event updated.");
  }

  async function onCreateLayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (auth.status !== "authenticated") {
      return;
    }

    setCreatingLayout(true);
    setLayoutError(null);
    setLayoutSuccess(null);

    const totalTables = Number(layoutForm.totalTables);
    if (!Number.isInteger(totalTables) || totalTables <= 0 || totalTables > 64) {
      setCreatingLayout(false);
      setLayoutError("Total tables needs to be a whole number between 1 and 64.");
      return;
    }

    const { data: layoutRow, error: layoutInsertError } = await supabase
      .from("director_layouts")
      .insert({
        director_id: auth.user.id,
        name: layoutForm.name.trim(),
        total_tables: totalTables,
      })
      .select("id, director_id, name, total_tables, created_at, updated_at")
      .single<DirectorLayoutRecord>();

    if (layoutInsertError || !layoutRow) {
      setCreatingLayout(false);
      setLayoutError(
        layoutInsertError?.message ?? "Could not create the saved layout.",
      );
      return;
    }

    const { data: roomRow, error: roomInsertError } = await supabase
      .from("director_layout_rooms")
      .insert({
        layout_id: layoutRow.id,
        name: "Room 1",
        columns: DEFAULT_LAYOUT_COLUMNS,
        rows: DEFAULT_LAYOUT_COLUMNS,
        sort_order: 1,
      })
      .select("id")
      .single<{ id: string }>();

    if (roomInsertError || !roomRow) {
      setCreatingLayout(false);
      setLayoutError(
        roomInsertError?.message ?? "Could not create the first room for this layout.",
      );
      return;
    }

    const defaultTables = buildDefaultLayoutTables(layoutRow.id, roomRow.id, totalTables);
    const { error: tableInsertError } = await supabase
      .from("director_layout_tables")
      .insert(defaultTables);

    if (tableInsertError) {
      setCreatingLayout(false);
      setLayoutError(tableInsertError.message);
      return;
    }

    await loadLayouts(auth.user.id, layoutRow.id);
    setLayoutForm(emptyLayoutForm);
    setCreatingLayout(false);
    setLayoutSuccess("Saved layout created.");
  }

  async function onApplyLayoutToTournament() {
    if (
      !selectedLayoutId ||
      !selectedTournamentId ||
      auth.status !== "authenticated"
    ) {
      return;
    }

    setApplyingLayout(true);
    setLayoutError(null);
    setLayoutSuccess(null);

    const { error } = await supabase
      .from("tournaments")
      .update({
        layout_id: selectedLayoutId,
      })
      .eq("id", selectedTournamentId)
      .eq("director_id", auth.user.id);

    if (error) {
      setApplyingLayout(false);
      setLayoutError(error.message);
      return;
    }

    await loadTournaments(auth.user.id, selectedTournamentId);
    setApplyingLayout(false);
    setLayoutSuccess(
      selectedTournament
        ? `Applied ${selectedLayout?.name ?? "the saved layout"} to ${selectedTournament.name}.`
        : "Layout applied to the selected tournament.",
    );
  }

  if (auth.status === "loading" || directorStatus.status === "loading") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-slate-400">
        Loading director console…
      </div>
    );
  }

  if (auth.status === "anonymous") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-accent/25 bg-gradient-to-br from-panel to-space p-8 text-center shadow-[0_0_50px_-18px_rgba(45,212,160,0.35)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Director access
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-wide text-white sm:text-5xl">
            Sign in to open the director console
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
            The tournament creation tools live behind your member account so we
            can attach tournaments and events to the right director.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button to="/login?next=/directors" className="px-5 py-2.5">
              Open director login
            </Button>
            <Button to="/register?next=/directors" variant="secondary" className="px-5 py-2.5">
              Create account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (directorStatus.status === "forbidden") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-panel/90 p-8 text-center backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Director access
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-wide text-white sm:text-5xl">
            Your account is signed in, but not marked as a director
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
            The database role check is working. Once your account has the
            `director` role in `member_roles`, this page will unlock the live
            tournament creation tools automatically.
          </p>
        </div>
      </div>
    );
  }

  if (directorStatus.status === "error") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-red-400/20 bg-panel/90 p-8 text-center backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
            Director console error
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-wide text-white sm:text-5xl">
            We could not load your director tools
          </h1>
          <p className="mt-4 text-sm text-red-300">{directorStatus.error}</p>
        </div>
      </div>
    );
  }

  if (isCreateRoute) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Director console
            </p>
            <h1 className="font-display mt-3 text-4xl tracking-wide text-white sm:text-5xl">
              Create a tournament
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-400">
              Start the tournament here, then jump straight into the schedule,
              layout, and event tools on the next screen.
            </p>
          </div>
          <Button to="/directors" variant="secondary" className="px-5 py-2.5">
            Back to tournaments
          </Button>
        </div>

        <div className="rounded-2xl border border-accent/25 bg-gradient-to-br from-panel to-space p-6 shadow-[0_0_50px_-18px_rgba(45,212,160,0.35)] sm:p-8">
          <form
            onSubmit={(event) => void onCreateTournament(event)}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Tournament name
                </label>
                <input
                  type="text"
                  required
                  value={tournamentForm.name}
                  onChange={(event) =>
                    setTournamentForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                  placeholder="San Diego Summer Open"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Venue name
                </label>
                <input
                  type="text"
                  required
                  value={tournamentForm.venueName}
                  onChange={(event) =>
                    setTournamentForm((current) => ({
                      ...current,
                      venueName: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                  placeholder="Balboa Park Activity Center"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  City
                </label>
                <input
                  type="text"
                  required
                  value={tournamentForm.city}
                  onChange={(event) =>
                    setTournamentForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  State
                </label>
                <input
                  type="text"
                  required
                  value={tournamentForm.state}
                  onChange={(event) =>
                    setTournamentForm((current) => ({
                      ...current,
                      state: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                  placeholder="CA"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Start date
                </label>
                <input
                  type="date"
                  required
                  value={tournamentForm.startDate}
                  onChange={(event) =>
                    setTournamentForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  End date
                </label>
                <input
                  type="date"
                  required
                  value={tournamentForm.endDate}
                  onChange={(event) =>
                    setTournamentForm((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Registration opens
                </label>
                <input
                  type="datetime-local"
                  value={tournamentForm.registrationOpen}
                  onChange={(event) =>
                    setTournamentForm((current) => ({
                      ...current,
                      registrationOpen: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Registration closes
                </label>
                <input
                  type="datetime-local"
                  value={tournamentForm.registrationClose}
                  onChange={(event) =>
                    setTournamentForm((current) => ({
                      ...current,
                      registrationClose: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Flyer URL
                </label>
                <input
                  type="url"
                  value={tournamentForm.flyerUrl}
                  onChange={(event) =>
                    setTournamentForm((current) => ({
                      ...current,
                      flyerUrl: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status
                </label>
                <select
                  value={tournamentForm.status}
                  onChange={(event) =>
                    setTournamentForm((current) => ({
                      ...current,
                      status: event.target.value as TournamentRecord["status"],
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {tournamentError ? (
              <p className="text-sm font-medium text-red-400" role="alert">
                {tournamentError}
              </p>
            ) : null}
            {tournamentSuccess ? (
              <p className="text-sm font-medium text-accent" role="status">
                {tournamentSuccess}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                className="px-6 py-3"
                disabled={creatingTournament}
              >
                {creatingTournament ? "Creating tournament…" : "Create tournament"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (isEditRoute) {
    if (!selectedTournament || selectedTournament.id !== tournamentId) {
      return (
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <div className="rounded-2xl border border-dashed border-white/10 bg-panel/80 p-8 text-center text-slate-400">
            We could not find that tournament in your director account.
            <div className="mt-6">
              <Button to="/directors" variant="secondary" className="px-5 py-2.5">
                Back to your tournaments
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Tournament editor
            </p>
            <h1 className="font-display mt-3 text-4xl tracking-wide text-white sm:text-5xl">
              {selectedTournament.name}
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-slate-400">
              Edit the tournament, attach one of your saved club layouts, and
              build the event schedule side by side.
            </p>
          </div>
          <Button to="/directors" variant="secondary" className="px-5 py-2.5">
            Back to tournaments
          </Button>
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-panel/90 p-6 backdrop-blur-sm sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                    Current tournament
                  </p>
                  <h2 className="font-display mt-3 text-3xl tracking-wide text-white">
                    Edit details
                  </h2>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadge(
                    selectedTournament.status,
                  )}`}
                >
                  {selectedTournament.status}
                </span>
              </div>

              <form
                onSubmit={(event) => void onUpdateSelectedTournament(event)}
                className="mt-8 space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Tournament name
                    </label>
                    <input
                      type="text"
                      required
                      value={selectedTournamentForm.name}
                      onChange={(event) =>
                        setSelectedTournamentForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Venue name
                    </label>
                    <input
                      type="text"
                      required
                      value={selectedTournamentForm.venueName}
                      onChange={(event) =>
                        setSelectedTournamentForm((current) => ({
                          ...current,
                          venueName: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={selectedTournamentForm.city}
                      onChange={(event) =>
                        setSelectedTournamentForm((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      State
                    </label>
                    <input
                      type="text"
                      required
                      value={selectedTournamentForm.state}
                      onChange={(event) =>
                        setSelectedTournamentForm((current) => ({
                          ...current,
                          state: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Start date
                    </label>
                    <input
                      type="date"
                      required
                      value={selectedTournamentForm.startDate}
                      onChange={(event) =>
                        setSelectedTournamentForm((current) => ({
                          ...current,
                          startDate: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      End date
                    </label>
                    <input
                      type="date"
                      required
                      value={selectedTournamentForm.endDate}
                      onChange={(event) =>
                        setSelectedTournamentForm((current) => ({
                          ...current,
                          endDate: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Registration opens
                    </label>
                    <input
                      type="datetime-local"
                      value={selectedTournamentForm.registrationOpen}
                      onChange={(event) =>
                        setSelectedTournamentForm((current) => ({
                          ...current,
                          registrationOpen: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Registration closes
                    </label>
                    <input
                      type="datetime-local"
                      value={selectedTournamentForm.registrationClose}
                      onChange={(event) =>
                        setSelectedTournamentForm((current) => ({
                          ...current,
                          registrationClose: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Flyer URL
                    </label>
                    <input
                      type="url"
                      value={selectedTournamentForm.flyerUrl}
                      onChange={(event) =>
                        setSelectedTournamentForm((current) => ({
                          ...current,
                          flyerUrl: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Status
                    </label>
                    <select
                      value={selectedTournamentForm.status}
                      onChange={(event) =>
                        setSelectedTournamentForm((current) => ({
                          ...current,
                          status: event.target.value as TournamentRecord["status"],
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="closed">Closed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {selectedTournamentError ? (
                  <p className="text-sm font-medium text-red-400" role="alert">
                    {selectedTournamentError}
                  </p>
                ) : null}
                {selectedTournamentSuccess ? (
                  <p className="text-sm font-medium text-accent" role="status">
                    {selectedTournamentSuccess}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    className="px-6 py-3"
                    disabled={updatingTournament}
                  >
                    {updatingTournament ? "Saving tournament…" : "Save tournament changes"}
                  </Button>
                </div>
              </form>
            </div>

            <div className="rounded-2xl border border-white/10 bg-panel/90 p-6 backdrop-blur-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                    Layout workshop
                  </p>
                  <h2 className="font-display mt-3 text-3xl tracking-wide text-white">
                    Tournament floor plan
                  </h2>
                </div>
                {selectedLayout ? (
                  <span className="rounded-full border border-white/10 bg-space/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {selectedLayout.total_tables} tables
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Pick an existing saved club layout, create a new one, or open the
                full-screen workshop to arrange rooms, tables, and custom objects.
              </p>

              <form
                onSubmit={(event) => void onCreateLayout(event)}
                className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-space/40 p-5"
              >
                <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Layout name
                    </label>
                    <input
                      type="text"
                      required
                      value={layoutForm.name}
                      onChange={(event) =>
                        setLayoutForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                      placeholder="Main club setup"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Total tables
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="64"
                      required
                      value={layoutForm.totalTables}
                      onChange={(event) =>
                        setLayoutForm((current) => ({
                          ...current,
                          totalTables: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" className="px-5 py-2.5" disabled={creatingLayout}>
                    {creatingLayout ? "Creating layout…" : "Create saved layout"}
                  </Button>
                </div>
              </form>

              {layoutsError ? (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-space/40 p-4 text-sm text-red-300">
                  {layoutsError}
                </div>
              ) : null}

              {layouts.length > 0 ? (
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {layouts.map((layout) => {
                    const selected = layout.id === selectedLayoutId;

                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => setSelectedLayoutId(layout.id)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-accent/35 bg-accent/10 shadow-[0_0_30px_-20px_rgba(45,212,160,0.7)]"
                            : "border-white/10 bg-space/40 hover:border-white/20 hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{layout.name}</p>
                            <p className="mt-1 text-sm text-slate-400">
                              {layout.total_tables} total table
                              {layout.total_tables === 1 ? "" : "s"}
                            </p>
                          </div>
                          <span className="text-xs uppercase tracking-wide text-slate-500">
                            Saved
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : layoutsError ? null : (
                <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-space/40 p-5 text-sm text-slate-400">
                  No saved layouts yet. Create one above and it will appear here.
                </div>
              )}

              {selectedLayout ? (
                <div className="mt-8 space-y-6">
                  <div className="rounded-2xl border border-white/10 bg-space/40 p-5">
                    <p className="font-semibold text-white">{selectedLayout.name}</p>
                    <p className="mt-2 text-sm text-slate-400">
                      {selectedTournament.layout_id === selectedLayout.id
                        ? "This layout is currently attached to the tournament."
                        : "Choose this layout if you want this tournament to inherit the same room setup."}
                    </p>
                  </div>

                  {layoutError ? (
                    <p className="text-sm font-medium text-red-400" role="alert">
                      {layoutError}
                    </p>
                  ) : null}
                  {layoutSuccess ? (
                    <p className="text-sm font-medium text-accent" role="status">
                      {layoutSuccess}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <Button
                      to={`/directors/layouts/${selectedLayout.id}`}
                      variant="ghost"
                      className="px-5 py-2.5"
                    >
                      Open full-screen editor
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-5 py-2.5"
                      disabled={applyingLayout}
                      onClick={() => void onApplyLayoutToTournament()}
                    >
                      {applyingLayout
                        ? "Applying layout…"
                        : selectedTournament.layout_id === selectedLayout.id
                          ? "Re-apply layout"
                          : "Apply layout to tournament"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <aside className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-panel/90 p-6 backdrop-blur-sm sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Event builder
              </p>
              <h2 className="font-display mt-3 text-3xl tracking-wide text-white">
                Add an event
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Build the schedule here, then use the event cards underneath to
                revise individual events later.
              </p>

              <form
                onSubmit={(event) => void onCreateEvent(event)}
                className="mt-8 space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Event name
                    </label>
                    <input
                      type="text"
                      required
                      value={eventForm.name}
                      onChange={(event) =>
                        setEventForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                      placeholder="U1800 Singles"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Start time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={eventForm.startTime}
                      onChange={(event) =>
                        setEventForm((current) => ({
                          ...current,
                          startTime: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      End time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={eventForm.endTime}
                      onChange={(event) =>
                        setEventForm((current) => ({
                          ...current,
                          endTime: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Entry fee (USD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={eventForm.entryFeeDollars}
                      onChange={(event) =>
                        setEventForm((current) => ({
                          ...current,
                          entryFeeDollars: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Capacity
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={eventForm.capacity}
                      onChange={(event) =>
                        setEventForm((current) => ({
                          ...current,
                          capacity: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Table count
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={eventForm.tableCount}
                      onChange={(event) =>
                        setEventForm((current) => ({
                          ...current,
                          tableCount: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Rating minimum
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={eventForm.ratingMin}
                      onChange={(event) =>
                        setEventForm((current) => ({
                          ...current,
                          ratingMin: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Rating maximum
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={eventForm.ratingMax}
                      onChange={(event) =>
                        setEventForm((current) => ({
                          ...current,
                          ratingMax: event.target.value,
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Status
                    </label>
                    <select
                      value={eventForm.status}
                      onChange={(event) =>
                        setEventForm((current) => ({
                          ...current,
                          status: event.target.value as EventRecord["status"],
                        }))
                      }
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="full">Full</option>
                      <option value="closed">Closed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {eventError ? (
                  <p className="text-sm font-medium text-red-400" role="alert">
                    {eventError}
                  </p>
                ) : null}
                {eventSuccess ? (
                  <p className="text-sm font-medium text-accent" role="status">
                    {eventSuccess}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" className="px-6 py-3" disabled={creatingEvent}>
                    {creatingEvent ? "Creating event…" : "Create event"}
                  </Button>
                </div>
              </form>
            </div>

            <div className="rounded-2xl border border-white/10 bg-panel/90 p-6 backdrop-blur-sm sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                    Events
                  </p>
                  <h2 className="font-display mt-3 text-3xl tracking-wide text-white">
                    Current schedule
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-space/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {events.length} event{events.length === 1 ? "" : "s"}
                </span>
              </div>

              {eventsStatus === "loading" ? (
                <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-space/40 p-6 text-sm text-slate-400">
                  Loading events…
                </div>
              ) : eventsStatus === "error" ? (
                <div className="mt-8 rounded-2xl border border-red-400/20 bg-space/40 p-6 text-sm text-red-300">
                  {eventsError}
                </div>
              ) : events.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-space/40 p-6 text-sm text-slate-400">
                  No events yet. Use the event builder above to create the first
                  one for this tournament.
                </div>
              ) : (
                <div className="mt-8 space-y-4">
                  {events.map((eventRow) => {
                    const isEditing = editingEventId === eventRow.id;

                    return (
                      <div
                        key={eventRow.id}
                        className="rounded-2xl border border-white/10 bg-space/40 p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-white">{eventRow.name}</h3>
                            <p className="mt-1 text-sm text-slate-400">
                              {formatDateTime(eventRow.start_time)} -{" "}
                              {formatDateTime(eventRow.end_time)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadge(
                                eventRow.status,
                              )}`}
                            >
                              {eventRow.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => onStartEditingEvent(eventRow)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-panel/70 text-slate-300 transition hover:border-white/20 hover:text-white"
                              aria-label={`Edit ${eventRow.name}`}
                            >
                              <EditIcon />
                            </button>
                          </div>
                        </div>

                        {isEditing ? (
                          <form
                            onSubmit={(event) => void onUpdateEvent(event)}
                            className="mt-5 space-y-4 border-t border-white/10 pt-5"
                          >
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Event name
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={editingEventForm.name}
                                  onChange={(event) =>
                                    setEditingEventForm((current) => ({
                                      ...current,
                                      name: event.target.value,
                                    }))
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Start time
                                </label>
                                <input
                                  type="datetime-local"
                                  required
                                  value={editingEventForm.startTime}
                                  onChange={(event) =>
                                    setEditingEventForm((current) => ({
                                      ...current,
                                      startTime: event.target.value,
                                    }))
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  End time
                                </label>
                                <input
                                  type="datetime-local"
                                  required
                                  value={editingEventForm.endTime}
                                  onChange={(event) =>
                                    setEditingEventForm((current) => ({
                                      ...current,
                                      endTime: event.target.value,
                                    }))
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Entry fee (USD)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  required
                                  value={editingEventForm.entryFeeDollars}
                                  onChange={(event) =>
                                    setEditingEventForm((current) => ({
                                      ...current,
                                      entryFeeDollars: event.target.value,
                                    }))
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Capacity
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  value={editingEventForm.capacity}
                                  onChange={(event) =>
                                    setEditingEventForm((current) => ({
                                      ...current,
                                      capacity: event.target.value,
                                    }))
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Table count
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  value={editingEventForm.tableCount}
                                  onChange={(event) =>
                                    setEditingEventForm((current) => ({
                                      ...current,
                                      tableCount: event.target.value,
                                    }))
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Rating minimum
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editingEventForm.ratingMin}
                                  onChange={(event) =>
                                    setEditingEventForm((current) => ({
                                      ...current,
                                      ratingMin: event.target.value,
                                    }))
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Rating maximum
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editingEventForm.ratingMax}
                                  onChange={(event) =>
                                    setEditingEventForm((current) => ({
                                      ...current,
                                      ratingMax: event.target.value,
                                    }))
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Status
                                </label>
                                <select
                                  value={editingEventForm.status}
                                  onChange={(event) =>
                                    setEditingEventForm((current) => ({
                                      ...current,
                                      status: event.target.value as EventRecord["status"],
                                    }))
                                  }
                                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                                >
                                  <option value="scheduled">Scheduled</option>
                                  <option value="full">Full</option>
                                  <option value="closed">Closed</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </div>
                            </div>

                            {editingEventError ? (
                              <p className="text-sm font-medium text-red-400" role="alert">
                                {editingEventError}
                              </p>
                            ) : null}
                            {editingEventSuccess ? (
                              <p className="text-sm font-medium text-accent" role="status">
                                {editingEventSuccess}
                              </p>
                            ) : null}

                            <div className="flex flex-wrap gap-3">
                              <Button
                                type="submit"
                                className="px-5 py-2.5"
                                disabled={updatingEvent}
                              >
                                {updatingEvent ? "Saving event…" : "Save event"}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className="px-5 py-2.5"
                                onClick={() => {
                                  setEditingEventId(null);
                                  setEditingEventError(null);
                                  setEditingEventSuccess(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 text-sm text-slate-400 sm:grid-cols-2">
                            <p>Entry fee: {formatEntryFee(eventRow.entry_fee_cents)}</p>
                            <p>Capacity: {eventRow.capacity}</p>
                            <p>Tables reserved: {eventRow.table_count}</p>
                            <p>
                              Rating band: {eventRow.rating_min ?? 0} -{" "}
                              {eventRow.rating_max ?? "Open"}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8 max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Director console
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-wide text-white sm:text-5xl">
          Manage your tournaments
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-400">
          Open an unfinished tournament to keep building its details, schedule,
          and layout. Start a new tournament from the create panel on the right.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
        <section className="rounded-2xl border border-white/10 bg-panel/90 p-6 backdrop-blur-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Owned tournaments
              </p>
              <h2 className="font-display mt-3 text-3xl tracking-wide text-white">
                Your current list
              </h2>
            </div>
            <span className="rounded-full border border-white/10 bg-space/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {tournaments.length} total
            </span>
          </div>

          {tournaments.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-space/40 p-6 text-sm text-slate-400">
              No tournaments yet. Use the create panel to start the first one.
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {tournaments.map((tournament) => {
                const editable = !isTournamentFinished(tournament.status);

                return (
                  <div
                    key={tournament.id}
                    className="rounded-2xl border border-white/10 bg-space/50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-white">{tournament.name}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {tournament.venue_name} · {tournament.city}, {tournament.state}
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                          {formatDateRange(tournament.start_date, tournament.end_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadge(
                            tournament.status,
                          )}`}
                        >
                          {tournament.status}
                        </span>
                        {editable ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/directors/tournaments/${tournament.id}`)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-panel/70 text-slate-300 transition hover:border-white/20 hover:text-white"
                            aria-label={`Edit ${tournament.name}`}
                          >
                            <EditIcon />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        to={`/directors/tournaments/${tournament.id}`}
                        variant="ghost"
                        className="px-0 py-0 text-sm"
                      >
                        {editable ? "Open editor" : "Review tournament"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-accent/25 bg-gradient-to-br from-panel to-space p-6 shadow-[0_0_50px_-18px_rgba(45,212,160,0.35)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Create tournament
          </p>
          <h2 className="font-display mt-3 text-3xl tracking-wide text-white">
            Start a new build
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Open the full create-tournament screen, make the tournament shell,
            and then jump straight into editing events and layouts.
          </p>

          <div className="mt-8">
            <Button to="/directors/new" className="w-full px-6 py-3">
              Create tournament
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
