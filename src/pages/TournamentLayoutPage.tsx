import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { supabase } from "@/lib/supabase";
import { useParams } from "react-router-dom";

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

type DirectorLayoutRecord = {
  id: string;
  director_id: string;
  name: string;
  total_tables: number;
  created_at: string;
  updated_at: string;
};

type DirectorLayoutRoomRecord = {
  id: string;
  layout_id: string;
  name: string;
  columns: number;
  rows: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type DirectorLayoutTableRecord = {
  id: string;
  layout_id: string;
  room_id: string;
  table_number: number;
  grid_x: number;
  grid_y: number;
  created_at: string;
  updated_at: string;
};

type DirectorLayoutObjectRecord = {
  id: string;
  layout_id: string;
  room_id: string;
  label: string;
  grid_x: number;
  grid_y: number;
  width_cells: number;
  height_cells: number;
  created_at: string;
  updated_at: string;
};

type LayoutViewState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "not_found" }
  | { status: "no_layout"; tournament: TournamentRecord }
  | {
      status: "ready";
      tournament: TournamentRecord;
      layout: DirectorLayoutRecord;
      rooms: DirectorLayoutRoomRecord[];
      tables: DirectorLayoutTableRecord[];
      objects: DirectorLayoutObjectRecord[];
    };

const BOARD_CELL_WIDTH = 132;
const BOARD_CELL_HEIGHT = 88;
const MIN_BOARD_ZOOM = 0.5;
const MAX_BOARD_ZOOM = 1.6;
const BOARD_ZOOM_STEP = 0.1;
const CHIP_FULL_MIN_WIDTH = 96;
const CHIP_COMPACT_MIN_WIDTH = 60;
const CHIP_GAP = 8;
const CHIP_FULL_ROW_HEIGHT = 72;
const CHIP_COMPACT_ROW_HEIGHT = 52;

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

function clampZoom(value: number) {
  return Math.min(MAX_BOARD_ZOOM, Math.max(MIN_BOARD_ZOOM, value));
}

function getObjectCoveredKeys(
  object: Pick<
    DirectorLayoutObjectRecord,
    "grid_x" | "grid_y" | "width_cells" | "height_cells"
  >,
) {
  const keys: string[] = [];
  for (let rowOffset = 0; rowOffset < object.height_cells; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < object.width_cells; columnOffset += 1) {
      keys.push(`${object.grid_x + columnOffset}-${object.grid_y + rowOffset}`);
    }
  }
  return keys;
}

export function TournamentLayoutPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [loadState, setLoadState] = useState<LayoutViewState>({
    status: "loading",
  });
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [boardZoom, setBoardZoom] = useState(1);
  const [boardViewportHeight, setBoardViewportHeight] = useState<number | null>(null);
  const [chipViewportWidth, setChipViewportWidth] = useState(0);

  async function loadLayoutView() {
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
    if (!tournament.layout_id) {
      setLoadState({ status: "no_layout", tournament });
      return;
    }

    const { data: layoutData, error: layoutError } = await supabase
      .from("director_layouts")
      .select("id, director_id, name, total_tables, created_at, updated_at")
      .eq("id", tournament.layout_id)
      .maybeSingle();

    if (layoutError) {
      setLoadState({ status: "error", error: layoutError.message });
      return;
    }

    if (!layoutData) {
      setLoadState({ status: "not_found" });
      return;
    }

    const [roomsResponse, tablesResponse, objectsResponse] = await Promise.all([
      supabase
        .from("director_layout_rooms")
        .select("id, layout_id, name, columns, rows, sort_order, created_at, updated_at")
        .eq("layout_id", tournament.layout_id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("director_layout_tables")
        .select("id, layout_id, room_id, table_number, grid_x, grid_y, created_at, updated_at")
        .eq("layout_id", tournament.layout_id)
        .order("table_number", { ascending: true }),
      supabase
        .from("director_layout_objects")
        .select(
          "id, layout_id, room_id, label, grid_x, grid_y, width_cells, height_cells, created_at, updated_at",
        )
        .eq("layout_id", tournament.layout_id)
        .order("created_at", { ascending: true }),
    ]);

    if (roomsResponse.error) {
      setLoadState({ status: "error", error: roomsResponse.error.message });
      return;
    }
    if (tablesResponse.error) {
      setLoadState({ status: "error", error: tablesResponse.error.message });
      return;
    }
    if (objectsResponse.error) {
      setLoadState({ status: "error", error: objectsResponse.error.message });
      return;
    }

    setLoadState({
      status: "ready",
      tournament,
      layout: layoutData as DirectorLayoutRecord,
      rooms: (roomsResponse.data ?? []) as DirectorLayoutRoomRecord[],
      tables: (tablesResponse.data ?? []) as DirectorLayoutTableRecord[],
      objects: (objectsResponse.data ?? []) as DirectorLayoutObjectRecord[],
    });
  }

  useEffect(() => {
    void loadLayoutView();
  }, [tournamentId]);

  const rooms = loadState.status === "ready" ? loadState.rooms : [];
  const tables = loadState.status === "ready" ? loadState.tables : [];
  const objects = loadState.status === "ready" ? loadState.objects : [];

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;
  const roomTables = useMemo(
    () =>
      selectedRoomId
        ? tables.filter((table) => table.room_id === selectedRoomId)
        : [],
    [tables, selectedRoomId],
  );
  const roomObjects = useMemo(
    () =>
      selectedRoomId
        ? objects.filter((object) => object.room_id === selectedRoomId)
        : [],
    [objects, selectedRoomId],
  );
  const selectedObject =
    roomObjects.find((object) => object.id === selectedObjectId) ?? null;
  const tableCells = useMemo(
    () =>
      new Map(roomTables.map((table) => [`${table.grid_x}-${table.grid_y}`, table])),
    [roomTables],
  );
  const objectCells = useMemo(() => {
    const cells = new Map<string, DirectorLayoutObjectRecord>();
    for (const object of roomObjects) {
      for (const key of getObjectCoveredKeys(object)) {
        cells.set(key, object);
      }
    }
    return cells;
  }, [roomObjects]);

  const boardCellWidth = Math.round(BOARD_CELL_WIDTH * boardZoom);
  const boardCellHeight = Math.round(BOARD_CELL_HEIGHT * boardZoom);
  const boardTextMode = boardCellWidth >= 112 ? "full" : "number_only";
  const showOpenCellText = boardCellWidth >= 96;
  const boardViewportRef = useRef<HTMLDivElement | null>(null);
  const chipViewportRef = useRef<HTMLDivElement | null>(null);
  const boardCellRefs = useRef(new Map<string, HTMLButtonElement>());
  const boardObjectRefs = useRef(new Map<string, HTMLButtonElement>());

  const chipMeasureWidth = chipViewportWidth || 640;
  const chipFullColumns = Math.max(
    1,
    Math.floor((chipMeasureWidth + CHIP_GAP) / (CHIP_FULL_MIN_WIDTH + CHIP_GAP)),
  );
  const chipFullRows = Math.ceil(roomTables.length / chipFullColumns);
  const chipMode = chipFullRows > 3 ? "compact" : "full";
  const chipMinWidth = chipMode === "full" ? CHIP_FULL_MIN_WIDTH : CHIP_COMPACT_MIN_WIDTH;
  const chipColumns = Math.max(
    1,
    Math.floor((chipMeasureWidth + CHIP_GAP) / (chipMinWidth + CHIP_GAP)),
  );
  const chipRows = Math.ceil(roomTables.length / chipColumns);
  const chipVisibleRows = chipMode === "full" ? 3 : 4;
  const chipShouldScroll = chipRows > chipVisibleRows;
  const chipRowHeight = chipMode === "full" ? CHIP_FULL_ROW_HEIGHT : CHIP_COMPACT_ROW_HEIGHT;
  const chipViewportMaxHeight = chipShouldScroll
    ? chipVisibleRows * chipRowHeight + (chipVisibleRows - 1) * CHIP_GAP
    : null;

  useEffect(() => {
    if (rooms.length === 0) {
      setSelectedRoomId(null);
      return;
    }

    setSelectedRoomId((current) => {
      if (current && rooms.some((room) => room.id === current)) {
        return current;
      }
      return rooms[0]?.id ?? null;
    });
  }, [rooms]);

  useEffect(() => {
    if (!selectedRoom) {
      setSelectedTableNumber(null);
      setSelectedObjectId(null);
      return;
    }

    setSelectedTableNumber((current) => {
      if (current !== null && roomTables.some((table) => table.table_number === current)) {
        return current;
      }
      return roomTables[0]?.table_number ?? null;
    });
    setSelectedObjectId((current) => {
      if (current !== null && roomObjects.some((object) => object.id === current)) {
        return current;
      }
      return null;
    });
  }, [selectedRoom, roomTables, roomObjects]);

  useEffect(() => {
    const node = chipViewportRef.current;
    if (!node) {
      return;
    }
    const target = node;

    function updateChipViewportWidth() {
      setChipViewportWidth(target.clientWidth);
    }

    updateChipViewportWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateChipViewportWidth);
      return () => {
        window.removeEventListener("resize", updateChipViewportWidth);
      };
    }

    const observer = new ResizeObserver(() => {
      updateChipViewportWidth();
    });
    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [selectedRoomId]);

  useEffect(() => {
    function updateBoardViewportHeight() {
      const node = boardViewportRef.current;
      if (!node) {
        return;
      }

      const viewportHeight = window.innerHeight;
      const top = node.getBoundingClientRect().top;
      const bottomGap = 24;
      const nextHeight = Math.max(220, Math.floor(viewportHeight - top - bottomGap));
      setBoardViewportHeight(nextHeight);
    }

    updateBoardViewportHeight();
    window.addEventListener("resize", updateBoardViewportHeight);

    return () => {
      window.removeEventListener("resize", updateBoardViewportHeight);
    };
  }, [selectedRoomId, boardZoom, roomTables.length, roomObjects.length]);

  useEffect(() => {
    if (!selectedRoomId) {
      return;
    }

    const viewport = boardViewportRef.current;
    const targetNode =
      selectedObjectId !== null
        ? boardObjectRefs.current.get(`${selectedRoomId}:${selectedObjectId}`)
        : selectedTableNumber !== null
          ? boardCellRefs.current.get(`${selectedRoomId}:${selectedTableNumber}`)
          : null;

    if (!viewport || !targetNode) {
      return;
    }

    const viewportRect = viewport.getBoundingClientRect();
    const targetRect = targetNode.getBoundingClientRect();
    const nextLeft =
      targetRect.left -
      viewportRect.left +
      viewport.scrollLeft -
      (viewport.clientWidth - targetRect.width) / 2;
    const nextTop =
      targetRect.top -
      viewportRect.top +
      viewport.scrollTop -
      (viewport.clientHeight - targetRect.height) / 2;

    const maxLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const maxTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);

    viewport.scrollTo({
      left: Math.min(Math.max(0, nextLeft), maxLeft),
      top: Math.min(Math.max(0, nextTop), maxTop),
      behavior: "smooth",
    });
  }, [
    selectedRoomId,
    selectedTableNumber,
    selectedObjectId,
    boardZoom,
    roomTables.length,
    roomObjects.length,
    selectedObject?.grid_x,
    selectedObject?.grid_y,
    selectedObject?.width_cells,
    selectedObject?.height_cells,
  ]);

  function onBoardCellClick(gridX: number, gridY: number) {
    const occupyingTable = tableCells.get(`${gridX}-${gridY}`);
    if (occupyingTable) {
      setSelectedTableNumber(occupyingTable.table_number);
      setSelectedObjectId(null);
      return;
    }

    const occupyingObject = objectCells.get(`${gridX}-${gridY}`);
    if (occupyingObject) {
      setSelectedObjectId(occupyingObject.id);
      setSelectedTableNumber(null);
    }
  }

  if (loadState.status === "loading") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-slate-400">
        Loading tournament layout…
      </div>
    );
  }

  if (loadState.status === "error") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-red-400/20 bg-panel/90 p-8 text-center backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
            Layout viewer error
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-wide text-white sm:text-5xl">
            We could not load this tournament layout
          </h1>
          <p className="mt-4 text-sm text-red-300">{loadState.error}</p>
        </div>
      </div>
    );
  }

  if (loadState.status === "not_found") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-dashed border-white/10 bg-panel/80 p-8 text-center text-slate-400">
          This tournament layout is not available for public viewing.
          <div className="mt-6">
            <Button to="/activities" variant="secondary" className="px-5 py-2.5">
              Back to tournaments
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loadState.status === "no_layout") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-dashed border-white/10 bg-panel/80 p-8 text-center text-slate-400">
          This tournament has not published a floor layout yet.
          <div className="mt-6">
            <Button
              to={`/activities/${loadState.tournament.id}`}
              variant="secondary"
              className="px-5 py-2.5"
            >
              Back to tournament
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 xl:box-border xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:overflow-hidden">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 xl:shrink-0">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Tournament layout
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-wide text-white sm:text-5xl">
            {loadState.tournament.name}
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-400">
            {loadState.tournament.venue_name} · {loadState.tournament.city},{" "}
            {loadState.tournament.state}
          </p>
          <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {formatDateRange(
              loadState.tournament.start_date,
              loadState.tournament.end_date,
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="rounded-full border border-white/10 bg-space/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {loadState.layout.name}
          </span>
          <Button
            to={`/activities/${loadState.tournament.id}`}
            variant="secondary"
            className="px-5 py-2.5"
          >
            Back to tournament
          </Button>
        </div>
      </div>

      <div className="grid gap-8 xl:min-h-0 xl:flex-1 xl:grid-cols-[320px_minmax(0,1fr)] xl:overflow-hidden">
        <aside className="space-y-6 rounded-2xl border border-white/10 bg-panel/90 p-6 backdrop-blur-sm">
          <div className="rounded-2xl border border-white/10 bg-space/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Layout stats
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {loadState.layout.total_tables}
            </p>
            <p className="mt-1 text-sm text-slate-400">Total tables across all rooms</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-space/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Rooms
            </p>
            <div className="mt-3 space-y-3">
              {rooms.map((room) => {
                const selected = room.id === selectedRoomId;
                const roomTableCount = tables.filter((table) => table.room_id === room.id).length;

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-accent/35 bg-accent/10 shadow-[0_0_30px_-20px_rgba(45,212,160,0.7)]"
                        : "border-white/10 bg-panel/70 hover:border-white/20 hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{room.name}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {room.columns} x {room.rows} grid
                        </p>
                      </div>
                      <span className="text-xs uppercase tracking-wide text-slate-500">
                        {roomTableCount} tables
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedRoom && roomObjects.length > 0 ? (
            <div className="rounded-2xl border border-white/10 bg-space/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Objects in {selectedRoom.name}
              </p>
              <div className="mt-3 space-y-2">
                {roomObjects.map((object) => {
                  const selected = object.id === selectedObjectId;
                  const objectLabel = object.label.trim() || "Unlabeled object";

                  return (
                    <button
                      key={object.id}
                      type="button"
                      onClick={() => {
                        setSelectedObjectId(object.id);
                        setSelectedTableNumber(null);
                      }}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                        selected
                          ? "border-accent/35 bg-accent/10 text-white"
                          : "border-white/10 bg-panel/70 text-slate-300 hover:border-white/20 hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{objectLabel}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {object.width_cells} x {object.height_cells} cells
                          </p>
                        </div>
                        <span className="text-xs uppercase tracking-wide text-slate-500">
                          {object.grid_x},{object.grid_y}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </aside>

        <section className="space-y-8 xl:flex xl:min-h-0 xl:min-w-0 xl:flex-col xl:overflow-hidden">
          {selectedRoom ? (
            <div className="rounded-2xl border border-white/10 bg-panel/90 p-6 backdrop-blur-sm sm:p-8 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                    Tables
                  </p>
                  <h2 className="font-display mt-3 text-3xl tracking-wide text-white">
                    {selectedRoom.name} board
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-slate-400">
                    Browse the room map with the same zoom and scroll controls the
                    director uses while editing. Tables and room objects are read-only
                    here.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/10 bg-space/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {roomTables.length} mapped
                  </span>
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-space/50 px-2 py-1">
                    <button
                      type="button"
                      onClick={() =>
                        setBoardZoom((current) =>
                          clampZoom(Number((current - BOARD_ZOOM_STEP).toFixed(2))),
                        )
                      }
                      className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
                    >
                      -
                    </button>
                    <span className="min-w-[64px] text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Zoom {Math.round(boardZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setBoardZoom((current) =>
                          clampZoom(Number((current + BOARD_ZOOM_STEP).toFixed(2))),
                        )
                      }
                      className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-space/20 p-3">
                <div
                  ref={chipViewportRef}
                  className="layout-chip-scroll overflow-x-hidden pr-1"
                  style={
                    chipViewportMaxHeight
                      ? {
                          maxHeight: `${chipViewportMaxHeight}px`,
                          overflowY: "auto",
                        }
                      : undefined
                  }
                >
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `repeat(auto-fill, minmax(${chipMinWidth}px, 1fr))`,
                    }}
                  >
                    {roomTables.map((table) => {
                      const selected = table.table_number === selectedTableNumber;

                      return (
                        <button
                          key={table.id}
                          type="button"
                          onClick={() => {
                            setSelectedTableNumber(table.table_number);
                            setSelectedObjectId(null);
                          }}
                          className={`rounded-xl transition ${
                            selected
                              ? "bg-accent text-space"
                              : "border border-white/10 bg-space/70 text-slate-300 hover:bg-white/[0.03]"
                          } ${
                            chipMode === "full"
                              ? "min-h-[68px] px-3 py-2"
                              : "min-h-[48px] px-2 py-2"
                          }`}
                          title={`Table ${table.table_number}`}
                        >
                          {chipMode === "full" ? (
                            <div className="flex flex-col items-center leading-tight">
                              <span className="text-[11px] uppercase tracking-wide opacity-80">
                                Table
                              </span>
                              <span className="mt-1 text-2xl font-semibold">
                                {table.table_number}
                              </span>
                            </div>
                          ) : (
                            <span className="text-lg font-semibold">
                              {table.table_number}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <span className="rounded-full border border-white/10 bg-space/50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Front
                </span>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-space/30 p-5 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
                <div
                  ref={boardViewportRef}
                  className="layout-board-scroll min-h-[320px] overflow-auto overscroll-contain xl:min-h-0 xl:flex-1"
                  style={
                    boardViewportHeight
                      ? {
                          height: `${boardViewportHeight}px`,
                        }
                      : undefined
                  }
                >
                  <div
                    className="grid gap-3"
                    style={{
                      gridTemplateColumns: `repeat(${selectedRoom.columns}, ${boardCellWidth}px)`,
                      gridAutoRows: `${boardCellHeight}px`,
                      width: "max-content",
                    }}
                  >
                    {Array.from(
                      { length: selectedRoom.columns * selectedRoom.rows },
                      (_, index) => {
                        const gridX = (index % selectedRoom.columns) + 1;
                        const gridY = Math.floor(index / selectedRoom.columns) + 1;
                        const cellKey = `${gridX}-${gridY}`;
                        const occupyingObject = objectCells.get(cellKey);
                        if (occupyingObject) {
                          const isAnchor =
                            occupyingObject.grid_x === gridX &&
                            occupyingObject.grid_y === gridY;
                          if (!isAnchor) {
                            return null;
                          }

                          const selected = occupyingObject.id === selectedObjectId;
                          const label = occupyingObject.label.trim() || "Object";
                          const compactObject = boardCellWidth < 96 || boardCellHeight < 76;

                          return (
                            <button
                              key={`object-${occupyingObject.id}`}
                              type="button"
                              ref={(node) => {
                                const refKey = `${selectedRoom.id}:${occupyingObject.id}`;
                                if (node) {
                                  boardObjectRefs.current.set(refKey, node);
                                } else {
                                  boardObjectRefs.current.delete(refKey);
                                }
                              }}
                              onClick={() => {
                                setSelectedObjectId(occupyingObject.id);
                                setSelectedTableNumber(null);
                              }}
                              title={label}
                              className={`flex h-full w-full flex-col items-center justify-center rounded-2xl border px-2 text-center transition ${
                                selected
                                  ? "border-amber-300/50 bg-amber-400/15 text-amber-100 shadow-[0_0_30px_-16px_rgba(251,191,36,0.55)]"
                                  : "border-amber-200/20 bg-amber-300/10 text-amber-50 hover:border-amber-200/30 hover:bg-amber-300/15"
                              }`}
                              style={{
                                gridColumn: `${gridX} / span ${occupyingObject.width_cells}`,
                                gridRow: `${gridY} / span ${occupyingObject.height_cells}`,
                              }}
                            >
                              {!compactObject ? (
                                <>
                                  <span className="text-[10px] uppercase tracking-[0.2em] text-amber-100/70">
                                    Object
                                  </span>
                                  <span className="mt-2 max-w-full truncate text-sm font-semibold">
                                    {label}
                                  </span>
                                </>
                              ) : (
                                <span className="max-w-full truncate text-xs font-semibold">
                                  {label}
                                </span>
                              )}
                            </button>
                          );
                        }

                        const occupyingTable = tableCells.get(cellKey);
                        const selected =
                          occupyingTable?.table_number === selectedTableNumber;

                        return (
                          <button
                            key={`cell-${gridX}-${gridY}`}
                            type="button"
                            ref={(node) => {
                              const refKey = occupyingTable
                                ? `${selectedRoom.id}:${occupyingTable.table_number}`
                                : null;

                              if (refKey && node) {
                                boardCellRefs.current.set(refKey, node);
                              } else if (refKey) {
                                boardCellRefs.current.delete(refKey);
                              }
                            }}
                            onClick={() => onBoardCellClick(gridX, gridY)}
                            title={
                              occupyingTable
                                ? `Table ${occupyingTable.table_number}`
                                : `Open cell ${gridX}, ${gridY}`
                            }
                            className={`h-full w-full rounded-2xl border transition ${
                              occupyingTable
                                ? selected
                                  ? "border-accent/40 bg-accent/20 text-accent shadow-[0_0_30px_-16px_rgba(45,212,160,0.6)]"
                                  : "border-white/10 bg-panel/90 text-white hover:border-accent/25 hover:bg-white/[0.03]"
                                : "border-dashed border-white/10 bg-space/50 text-slate-600"
                            }`}
                            style={{
                              gridColumn: `${gridX}`,
                              gridRow: `${gridY}`,
                            }}
                          >
                            {occupyingTable ? (
                              boardTextMode === "full" ? (
                                <div className="flex h-full flex-col items-center justify-center">
                                  <span className="text-[11px] uppercase tracking-wide text-slate-400">
                                    Table
                                  </span>
                                  <span className="mt-1 text-2xl font-semibold">
                                    {occupyingTable.table_number}
                                  </span>
                                </div>
                              ) : (
                                <span
                                  className={`font-semibold ${
                                    boardCellWidth < 72 ? "text-lg" : "text-2xl"
                                  }`}
                                >
                                  {occupyingTable.table_number}
                                </span>
                              )
                            ) : showOpenCellText ? (
                              <span className="text-xs">Open cell</span>
                            ) : null}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-center">
                <span className="rounded-full border border-white/10 bg-space/50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Back
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-panel/80 p-8 text-center text-slate-400">
              No room data is available in this layout yet.
            </div>
          )}
        </section>
      </div>

      <style>{`
        .layout-board-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .layout-board-scroll::-webkit-scrollbar {
          display: none;
        }

        .layout-chip-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .layout-chip-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
