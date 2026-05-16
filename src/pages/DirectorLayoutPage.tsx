import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type DirectorStatus =
  | { status: "loading" }
  | { status: "forbidden" }
  | { status: "error"; error: string }
  | { status: "not_found" }
  | { status: "ready" };

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

type Feedback = {
  kind: "error" | "success";
  message: string;
};

type RoomFormState = {
  name: string;
  columns: string;
  rows: string;
};

type ObjectFormState = {
  label: string;
  width: string;
  height: string;
};

const MAX_ROOM_COLUMNS = 20;
const MAX_ROOM_ROWS = 20;
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
const defaultNewRoom: RoomFormState = {
  name: "",
  columns: "8",
  rows: "8",
};
const defaultNewObject: ObjectFormState = {
  label: "",
  width: "2",
  height: "1",
};

function clampPositiveInteger(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clampZoom(value: number) {
  return Math.min(MAX_BOARD_ZOOM, Math.max(MIN_BOARD_ZOOM, value));
}

function getObjectCoveredKeys(object: Pick<DirectorLayoutObjectRecord, "grid_x" | "grid_y" | "width_cells" | "height_cells">) {
  const keys: string[] = [];
  for (let rowOffset = 0; rowOffset < object.height_cells; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < object.width_cells; columnOffset += 1) {
      keys.push(`${object.grid_x + columnOffset}-${object.grid_y + rowOffset}`);
    }
  }
  return keys;
}

function formatLayoutTableInsertError(message: string) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("director_layout_tables") &&
    normalized.includes("violates check constraint")
  ) {
    return "Your database still looks like it has the old layout size constraint. Re-run docs/supabase-layout-workshop.sql in Supabase SQL Editor, then try adding tables again.";
  }

  return message;
}

export function DirectorLayoutPage() {
  const auth = useAuth();
  const { layoutId } = useParams<{ layoutId: string }>();

  const [directorStatus, setDirectorStatus] = useState<DirectorStatus>({
    status: "loading",
  });
  const [layout, setLayout] = useState<DirectorLayoutRecord | null>(null);
  const [rooms, setRooms] = useState<DirectorLayoutRoomRecord[]>([]);
  const [layoutTables, setLayoutTables] = useState<DirectorLayoutTableRecord[]>([]);
  const [layoutObjects, setLayoutObjects] = useState<DirectorLayoutObjectRecord[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [layoutNameDraft, setLayoutNameDraft] = useState("");
  const [roomForm, setRoomForm] = useState<RoomFormState>(defaultNewRoom);
  const [selectedRoomForm, setSelectedRoomForm] = useState<RoomFormState>(defaultNewRoom);
  const [tableBatchCount, setTableBatchCount] = useState("1");
  const [objectForm, setObjectForm] = useState<ObjectFormState>(defaultNewObject);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportRoomIds, setExportRoomIds] = useState<string[]>([]);
  const [boardZoom, setBoardZoom] = useState(1);
  const [boardViewportHeight, setBoardViewportHeight] = useState<number | null>(null);
  const [chipViewportWidth, setChipViewportWidth] = useState(0);
  const [savingName, setSavingName] = useState(false);
  const [savingPositions, setSavingPositions] = useState(false);
  const [addingTable, setAddingTable] = useState(false);
  const [addingRoom, setAddingRoom] = useState(false);
  const [addingObject, setAddingObject] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);
  const [savingObject, setSavingObject] = useState(false);
  const [deletingObject, setDeletingObject] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;
  const roomTables = useMemo(
    () =>
      selectedRoomId
        ? layoutTables.filter((table) => table.room_id === selectedRoomId)
        : [],
    [layoutTables, selectedRoomId],
  );
  const roomObjects = useMemo(
    () =>
      selectedRoomId
        ? layoutObjects.filter((object) => object.room_id === selectedRoomId)
        : [],
    [layoutObjects, selectedRoomId],
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
  const blockedCells = useMemo(() => {
    const cells = new Set<string>(tableCells.keys());
    for (const key of objectCells.keys()) {
      cells.add(key);
    }
    return cells;
  }, [tableCells, objectCells]);
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

  async function loadLayout(userId: string, targetLayoutId: string) {
    const { data, error } = await supabase
      .from("director_layouts")
      .select("id, director_id, name, total_tables, created_at, updated_at")
      .eq("id", targetLayoutId)
      .eq("director_id", userId)
      .maybeSingle();

    if (error) {
      setDirectorStatus({ status: "error", error: error.message });
      return;
    }

    if (!data) {
      setDirectorStatus({ status: "not_found" });
      return;
    }

    const layoutRow = data as DirectorLayoutRecord;
    setLayout(layoutRow);
    setLayoutNameDraft(layoutRow.name);

    const { data: roomData, error: roomError } = await supabase
      .from("director_layout_rooms")
      .select("id, layout_id, name, columns, rows, sort_order, created_at, updated_at")
      .eq("layout_id", targetLayoutId)
      .order("sort_order", { ascending: true });

    if (roomError) {
      setDirectorStatus({ status: "error", error: roomError.message });
      return;
    }

    const loadedRooms = (roomData ?? []) as DirectorLayoutRoomRecord[];
    setRooms(loadedRooms);
    setSelectedRoomId((current) => {
      if (current && loadedRooms.some((room) => room.id === current)) {
        return current;
      }
      return loadedRooms[0]?.id ?? null;
    });

    const { data: tableData, error: tableError } = await supabase
      .from("director_layout_tables")
      .select(
        "id, layout_id, room_id, table_number, grid_x, grid_y, created_at, updated_at",
      )
      .eq("layout_id", targetLayoutId)
      .order("table_number", { ascending: true });

    if (tableError) {
      setDirectorStatus({ status: "error", error: tableError.message });
      return;
    }

    const rows = (tableData ?? []) as DirectorLayoutTableRecord[];
    setLayoutTables(rows);

    const { data: objectData, error: objectError } = await supabase
      .from("director_layout_objects")
      .select(
        "id, layout_id, room_id, label, grid_x, grid_y, width_cells, height_cells, created_at, updated_at",
      )
      .eq("layout_id", targetLayoutId)
      .order("created_at", { ascending: true });

    if (objectError) {
      setDirectorStatus({ status: "error", error: objectError.message });
      return;
    }

    setLayoutObjects((objectData ?? []) as DirectorLayoutObjectRecord[]);
    setDirectorStatus({ status: "ready" });
  }

  useEffect(() => {
    if (auth.status === "loading") {
      return;
    }

    if (auth.status === "anonymous") {
      setDirectorStatus({ status: "forbidden" });
      return;
    }

    if (!layoutId) {
      setDirectorStatus({ status: "not_found" });
      return;
    }

    const userId = auth.user.id;
    const targetLayoutId = layoutId;
    let cancelled = false;

    async function bootstrap() {
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

      await loadLayout(userId, targetLayoutId);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [auth, layoutId]);

  useEffect(() => {
    if (!selectedRoom) {
      setSelectedRoomForm(defaultNewRoom);
      setSelectedTableNumber(null);
      setSelectedObjectId(null);
      setObjectForm(defaultNewObject);
      return;
    }

    setSelectedRoomForm({
      name: selectedRoom.name,
      columns: selectedRoom.columns.toString(),
      rows: selectedRoom.rows.toString(),
    });

    setSelectedTableNumber((current) => {
      if (
        current !== null &&
        roomTables.some((table) => table.table_number === current)
      ) {
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
    if (!selectedObject) {
      setObjectForm(defaultNewObject);
      return;
    }

    setObjectForm({
      label: selectedObject.label,
      width: selectedObject.width_cells.toString(),
      height: selectedObject.height_cells.toString(),
    });
  }, [selectedObject]);

  useEffect(() => {
    setExportRoomIds((current) => {
      const validIds = current.filter((roomId) =>
        rooms.some((room) => room.id === roomId),
      );

      if (validIds.length > 0) {
        return validIds;
      }

      return rooms.map((room) => room.id);
    });
  }, [rooms]);

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
    observer.observe(node);

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
  }, [
    selectedRoomId,
    boardZoom,
    roomTables.length,
    roomObjects.length,
    selectedRoomForm.columns,
    selectedRoomForm.rows,
  ]);

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

  function canPlaceObjectAt(
    object: Pick<DirectorLayoutObjectRecord, "grid_x" | "grid_y" | "width_cells" | "height_cells">,
    room: DirectorLayoutRoomRecord,
    objectIdToIgnore?: string,
  ) {
    const maxX = object.grid_x + object.width_cells - 1;
    const maxY = object.grid_y + object.height_cells - 1;
    if (object.grid_x < 1 || object.grid_y < 1 || maxX > room.columns || maxY > room.rows) {
      return false;
    }

    for (const key of getObjectCoveredKeys(object)) {
      if (tableCells.has(key)) {
        return false;
      }

      const occupyingObject = objectCells.get(key);
      if (occupyingObject && occupyingObject.id !== objectIdToIgnore) {
        return false;
      }
    }

    return true;
  }

  function findFirstObjectPlacement(
    room: DirectorLayoutRoomRecord,
    widthCells: number,
    heightCells: number,
  ) {
    for (let row = 1; row <= room.rows - heightCells + 1; row += 1) {
      for (let column = 1; column <= room.columns - widthCells + 1; column += 1) {
        const candidate = {
          grid_x: column,
          grid_y: row,
          width_cells: widthCells,
          height_cells: heightCells,
        };
        if (canPlaceObjectAt(candidate, room)) {
          return candidate;
        }
      }
    }

    return null;
  }

  function onGridCellClick(gridX: number, gridY: number) {
    if (!selectedRoomId) {
      return;
    }

    const occupyingTable = tableCells.get(`${gridX}-${gridY}`);
    if (occupyingTable) {
      setSelectedTableNumber(occupyingTable.table_number);
      setSelectedObjectId(null);
      setFeedback(null);
      return;
    }

    const occupyingObject = objectCells.get(`${gridX}-${gridY}`);
    if (occupyingObject) {
      setSelectedObjectId(occupyingObject.id);
      setSelectedTableNumber(null);
      setFeedback(null);
      return;
    }

    if (selectedObject && selectedRoom) {
      const candidate = {
        ...selectedObject,
        grid_x: gridX,
        grid_y: gridY,
      };

      if (!canPlaceObjectAt(candidate, selectedRoom, selectedObject.id)) {
        setFeedback({
          kind: "error",
          message: "That object will not fit there without overlapping another table or object.",
        });
        return;
      }

      setLayoutObjects((current) =>
        current.map((object) =>
          object.id === selectedObject.id
            ? {
                ...object,
                grid_x: gridX,
                grid_y: gridY,
              }
            : object,
        ),
      );
      setFeedback(null);
      return;
    }

    if (!selectedTableNumber) {
      return;
    }

    setLayoutTables((current) =>
      current.map((table) =>
        table.room_id === selectedRoomId && table.table_number === selectedTableNumber
          ? {
              ...table,
              grid_x: gridX,
              grid_y: gridY,
            }
          : table,
      ),
    );
    setSelectedObjectId(null);
    setFeedback(null);
  }

  async function onSaveName() {
    if (!layout || auth.status !== "authenticated") {
      return;
    }

    setSavingName(true);
    setFeedback(null);

    const { error } = await supabase
      .from("director_layouts")
      .update({
        name: layoutNameDraft.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", layout.id)
      .eq("director_id", auth.user.id);

    if (error) {
      setSavingName(false);
      setFeedback({ kind: "error", message: error.message });
      return;
    }

    await loadLayout(auth.user.id, layout.id);
    setSavingName(false);
    setFeedback({ kind: "success", message: "Layout name updated." });
  }

  async function onAddRoom() {
    if (!layout || auth.status !== "authenticated") {
      return;
    }

    const columns = clampPositiveInteger(roomForm.columns);
    const rows = clampPositiveInteger(roomForm.rows);
    if (!columns || !rows || columns > MAX_ROOM_COLUMNS || rows > MAX_ROOM_ROWS) {
      setFeedback({
        kind: "error",
        message: `Room dimensions need whole numbers between 1 and ${MAX_ROOM_COLUMNS}.`,
      });
      return;
    }

    setAddingRoom(true);
    setFeedback(null);

    const nextSortOrder = rooms.reduce((max, room) => Math.max(max, room.sort_order), 0) + 1;
    const { error } = await supabase.from("director_layout_rooms").insert({
      layout_id: layout.id,
      name: roomForm.name.trim(),
      columns,
      rows,
      sort_order: nextSortOrder,
    });

    if (error) {
      setAddingRoom(false);
      setFeedback({ kind: "error", message: error.message });
      return;
    }

    await loadLayout(auth.user.id, layout.id);
    setRoomForm(defaultNewRoom);
    setAddingRoom(false);
    setFeedback({ kind: "success", message: "Room created." });
  }

  async function onSaveRoomSettings() {
    if (!selectedRoom || auth.status !== "authenticated") {
      return;
    }

    const columns = clampPositiveInteger(selectedRoomForm.columns);
    const rows = clampPositiveInteger(selectedRoomForm.rows);
    if (!columns || !rows || columns > MAX_ROOM_COLUMNS || rows > MAX_ROOM_ROWS) {
      setFeedback({
        kind: "error",
        message: `Room dimensions need whole numbers between 1 and ${MAX_ROOM_COLUMNS}.`,
      });
      return;
    }

    const outOfBoundsTable = roomTables.find(
      (table) => table.grid_x > columns || table.grid_y > rows,
    );
    if (outOfBoundsTable) {
      setFeedback({
        kind: "error",
        message: `Move table ${outOfBoundsTable.table_number} inside the smaller grid before shrinking this room.`,
      });
      return;
    }

    const outOfBoundsObject = roomObjects.find(
      (object) =>
        object.grid_x + object.width_cells - 1 > columns ||
        object.grid_y + object.height_cells - 1 > rows,
    );
    if (outOfBoundsObject) {
      setFeedback({
        kind: "error",
        message: `Move or shrink the "${outOfBoundsObject.label || "custom object"}" block before shrinking this room.`,
      });
      return;
    }

    setSavingRoom(true);
    setFeedback(null);

    const { error } = await supabase
      .from("director_layout_rooms")
      .update({
        name: selectedRoomForm.name.trim(),
        columns,
        rows,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedRoom.id)
      .eq("layout_id", selectedRoom.layout_id);

    if (error) {
      setSavingRoom(false);
      setFeedback({ kind: "error", message: error.message });
      return;
    }

    await loadLayout(auth.user.id, selectedRoom.layout_id);
    setSavingRoom(false);
    setFeedback({ kind: "success", message: "Room settings updated." });
  }

  async function onSavePositions() {
    if (!layout || auth.status !== "authenticated") {
      return;
    }

    setSavingPositions(true);
    setFeedback(null);

    const { error } = await supabase.from("director_layout_tables").upsert(
      layoutTables.map((table) => ({
        id: table.id,
        layout_id: table.layout_id,
        room_id: table.room_id,
        table_number: table.table_number,
        grid_x: table.grid_x,
        grid_y: table.grid_y,
        updated_at: new Date().toISOString(),
      })),
    );

    if (error) {
      setSavingPositions(false);
      setFeedback({ kind: "error", message: error.message });
      return;
    }

    const { error: objectError } = await supabase.from("director_layout_objects").upsert(
      layoutObjects.map((object) => ({
        id: object.id,
        layout_id: object.layout_id,
        room_id: object.room_id,
        label: object.label,
        grid_x: object.grid_x,
        grid_y: object.grid_y,
        width_cells: object.width_cells,
        height_cells: object.height_cells,
        updated_at: new Date().toISOString(),
      })),
    );

    if (objectError) {
      setSavingPositions(false);
      setFeedback({ kind: "error", message: objectError.message });
      return;
    }

    await loadLayout(auth.user.id, layout.id);
    setSavingPositions(false);
    setFeedback({ kind: "success", message: "Layout positions saved." });
  }

  async function onAddTable() {
    if (!layout || !selectedRoom || auth.status !== "authenticated") {
      return;
    }

    const requestedTableCount = clampPositiveInteger(tableBatchCount);
    if (!requestedTableCount) {
      setFeedback({
        kind: "error",
        message: "Enter a whole-number table count before adding tables.",
      });
      return;
    }

    setAddingTable(true);
    setFeedback(null);

    const availableCells = selectedRoom.columns * selectedRoom.rows - blockedCells.size;
    if (availableCells <= 0) {
      setAddingTable(false);
      setFeedback({
        kind: "error",
        message:
          "This room is full. Increase the room dimensions before adding another table.",
      });
      return;
    }

    if (requestedTableCount > availableCells) {
      setAddingTable(false);
      setFeedback({
        kind: "error",
        message: `This room only has ${availableCells} open ${
          availableCells === 1 ? "cell" : "cells"
        } left. Reduce the batch size or increase the room dimensions first.`,
      });
      return;
    }

    const targetCells: Array<{ gridX: number; gridY: number }> = [];
    for (let row = 1; row <= selectedRoom.rows; row += 1) {
      for (let column = 1; column <= selectedRoom.columns; column += 1) {
        if (!blockedCells.has(`${column}-${row}`)) {
          targetCells.push({ gridX: column, gridY: row });
          if (targetCells.length === requestedTableCount) {
            break;
          }
        }
      }
      if (targetCells.length === requestedTableCount) {
        break;
      }
    }

    if (targetCells.length < requestedTableCount) {
      setAddingTable(false);
      setFeedback({
        kind: "error",
        message: "We could not find enough open cells in the selected room.",
      });
      return;
    }

    const nextTableNumberStart =
      layoutTables.reduce((max, table) => Math.max(max, table.table_number), 0) + 1;

    const rowsToInsert = targetCells.map((cell, index) => ({
      layout_id: layout.id,
      room_id: selectedRoom.id,
      table_number: nextTableNumberStart + index,
      grid_x: cell.gridX,
      grid_y: cell.gridY,
    }));

    const { error: insertError } = await supabase
      .from("director_layout_tables")
      .insert(rowsToInsert);

    if (insertError) {
      setAddingTable(false);
      setFeedback({
        kind: "error",
        message: formatLayoutTableInsertError(insertError.message),
      });
      return;
    }

    const { error: updateError } = await supabase
      .from("director_layouts")
      .update({
        total_tables: layout.total_tables + requestedTableCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", layout.id)
      .eq("director_id", auth.user.id);

    if (updateError) {
      setAddingTable(false);
      setFeedback({ kind: "error", message: updateError.message });
      return;
    }

    await loadLayout(auth.user.id, layout.id);
    setSelectedRoomId(selectedRoom.id);
    setSelectedTableNumber(nextTableNumberStart);
    setTableBatchCount("1");
    setAddingTable(false);
    setFeedback({
      kind: "success",
      message:
        requestedTableCount === 1
          ? `Added table ${nextTableNumberStart} to ${selectedRoom.name}.`
          : `Added ${requestedTableCount} tables to ${selectedRoom.name}.`,
    });
  }

  async function onAddObject() {
    if (!layout || !selectedRoom || auth.status !== "authenticated") {
      return;
    }

    const widthCells = clampPositiveInteger(objectForm.width);
    const heightCells = clampPositiveInteger(objectForm.height);
    if (
      !widthCells ||
      !heightCells ||
      widthCells > selectedRoom.columns ||
      heightCells > selectedRoom.rows
    ) {
      setFeedback({
        kind: "error",
        message: "Object dimensions need to fit inside the selected room.",
      });
      return;
    }

    const placement = findFirstObjectPlacement(selectedRoom, widthCells, heightCells);
    if (!placement) {
      setFeedback({
        kind: "error",
        message: "No open area is large enough for that object in the selected room.",
      });
      return;
    }

    setAddingObject(true);
    setFeedback(null);

    const { error } = await supabase.from("director_layout_objects").insert({
      layout_id: layout.id,
      room_id: selectedRoom.id,
      label: objectForm.label.trim(),
      grid_x: placement.grid_x,
      grid_y: placement.grid_y,
      width_cells: widthCells,
      height_cells: heightCells,
    });

    if (error) {
      setAddingObject(false);
      setFeedback({ kind: "error", message: error.message });
      return;
    }

    await loadLayout(auth.user.id, layout.id);
    setSelectedRoomId(selectedRoom.id);
    setObjectForm(defaultNewObject);
    setAddingObject(false);
    setFeedback({
      kind: "success",
      message: `Added a ${widthCells} x ${heightCells} object to ${selectedRoom.name}.`,
    });
  }

  async function onSaveObject() {
    if (!selectedObject || !selectedRoom || auth.status !== "authenticated") {
      return;
    }

    const widthCells = clampPositiveInteger(objectForm.width);
    const heightCells = clampPositiveInteger(objectForm.height);
    if (
      !widthCells ||
      !heightCells ||
      widthCells > selectedRoom.columns ||
      heightCells > selectedRoom.rows
    ) {
      setFeedback({
        kind: "error",
        message: "Object dimensions need to fit inside the selected room.",
      });
      return;
    }

    const candidate = {
      ...selectedObject,
      label: objectForm.label.trim(),
      width_cells: widthCells,
      height_cells: heightCells,
    };
    if (!canPlaceObjectAt(candidate, selectedRoom, selectedObject.id)) {
      setFeedback({
        kind: "error",
        message: "That object size or position overlaps another table or object.",
      });
      return;
    }

    setSavingObject(true);
    setFeedback(null);

    const { error } = await supabase
      .from("director_layout_objects")
      .update({
        label: candidate.label,
        width_cells: widthCells,
        height_cells: heightCells,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedObject.id)
      .eq("layout_id", selectedObject.layout_id);

    if (error) {
      setSavingObject(false);
      setFeedback({ kind: "error", message: error.message });
      return;
    }

    await loadLayout(auth.user.id, selectedObject.layout_id);
    setSelectedObjectId(selectedObject.id);
    setSavingObject(false);
    setFeedback({ kind: "success", message: "Object updated." });
  }

  async function onDeleteObject() {
    if (!selectedObject || !layout || auth.status !== "authenticated") {
      return;
    }

    setDeletingObject(true);
    setFeedback(null);

    const { error } = await supabase
      .from("director_layout_objects")
      .delete()
      .eq("id", selectedObject.id)
      .eq("layout_id", layout.id);

    if (error) {
      setDeletingObject(false);
      setFeedback({ kind: "error", message: error.message });
      return;
    }

    await loadLayout(auth.user.id, layout.id);
    setSelectedObjectId(null);
    setDeletingObject(false);
    setFeedback({ kind: "success", message: "Object removed." });
  }

  function toggleExportRoom(roomId: string) {
    setExportRoomIds((current) =>
      current.includes(roomId)
        ? current.filter((value) => value !== roomId)
        : [...current, roomId],
    );
  }

  async function onExportPdf() {
    if (!layout) {
      return;
    }

    const selectedRooms = rooms.filter((room) => exportRoomIds.includes(room.id));
    if (selectedRooms.length === 0) {
      setFeedback({
        kind: "error",
        message: "Select at least one room before exporting the layout PDF.",
      });
      return;
    }

    setExportingPdf(true);
    setFeedback(null);

    const exportWindow = window.open(
      "",
      "_blank",
      "noopener,noreferrer,width=1280,height=900",
    );

    if (!exportWindow) {
      setExportingPdf(false);
      setFeedback({
        kind: "error",
        message: "Your browser blocked the PDF export window. Allow pop-ups and try again.",
      });
      return;
    }

    const roomMarkup = selectedRooms
      .map((room) => {
        const roomBoard = new Map(
          layoutTables
            .filter((table) => table.room_id === room.id)
            .map((table) => [`${table.grid_x}-${table.grid_y}`, table]),
        );
        const roomObjectsForExport = layoutObjects.filter((object) => object.room_id === room.id);
        const roomObjectCells = new Map<string, DirectorLayoutObjectRecord>();
        for (const object of roomObjectsForExport) {
          for (const key of getObjectCoveredKeys(object)) {
            roomObjectCells.set(key, object);
          }
        }

        const cells = Array.from({ length: room.columns * room.rows }, (_, index) => {
          const gridX = (index % room.columns) + 1;
          const gridY = Math.floor(index / room.columns) + 1;
          const cellKey = `${gridX}-${gridY}`;
          const object = roomObjectCells.get(cellKey);

          if (object) {
            const isAnchor = object.grid_x === gridX && object.grid_y === gridY;
            if (!isAnchor) {
              return "";
            }

            return `<div class="cell cell-object" style="grid-column: ${gridX} / span ${object.width_cells}; grid-row: ${gridY} / span ${object.height_cells};"><span class="cell-object-label">${escapeHtml(
              object.label.trim() || "Object",
            )}</span></div>`;
          }

          const table = roomBoard.get(cellKey);
          if (!table) {
            return `<div class="cell cell-empty" style="grid-column: ${gridX}; grid-row: ${gridY};">Open cell</div>`;
          }

          return `<div class="cell cell-table" style="grid-column: ${gridX}; grid-row: ${gridY};"><span class="cell-label">Table</span><span class="cell-number">${table.table_number}</span></div>`;
        }).join("");

        return `
          <section class="room">
            <div class="room-header">
              <div>
                <p class="eyebrow">Room</p>
                <h2>${escapeHtml(room.name)}</h2>
              </div>
              <div class="room-meta">
                <span>${room.columns} columns</span>
                <span>${room.rows} rows</span>
                <span>${layoutTables.filter((table) => table.room_id === room.id).length} tables</span>
                <span>${roomObjectsForExport.length} objects</span>
              </div>
            </div>
            <div class="board-scroll">
              <div class="board" style="grid-template-columns: repeat(${room.columns}, ${BOARD_CELL_WIDTH}px); grid-auto-rows: ${BOARD_CELL_HEIGHT}px;">
                ${cells}
              </div>
            </div>
          </section>
        `;
      })
      .join("");

    const exportHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(layout.name)} Layout Export</title>
    <style>
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        color: #0f172a;
        background: #ffffff;
      }

      .page {
        padding: 32px;
      }

      .page-header {
        margin-bottom: 24px;
      }

      .eyebrow {
        margin: 0;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #0f766e;
      }

      h1 {
        margin: 10px 0 8px;
        font-size: 32px;
      }

      .subtitle {
        margin: 0;
        color: #475569;
        font-size: 14px;
      }

      .room {
        margin-top: 28px;
        page-break-inside: avoid;
      }

      .room-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-end;
        margin-bottom: 12px;
      }

      .room-header h2 {
        margin: 6px 0 0;
        font-size: 22px;
      }

      .room-meta {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        color: #475569;
        font-size: 13px;
      }

      .board-scroll {
        overflow: auto;
        border: 1px solid #cbd5e1;
        border-radius: 16px;
        padding: 16px;
      }

      .board {
        display: grid;
        gap: 12px;
        width: max-content;
      }

      .cell {
        width: ${BOARD_CELL_WIDTH}px;
        height: ${BOARD_CELL_HEIGHT}px;
        border-radius: 16px;
        border: 1px solid #cbd5e1;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
      }

      .cell-empty {
        border-style: dashed;
        color: #94a3b8;
        font-size: 12px;
      }

      .cell-table {
        background: #f8fafc;
        flex-direction: column;
      }

      .cell-object {
        background: #fef3c7;
        border-color: #f59e0b;
        padding: 8px;
      }

      .cell-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #64748b;
      }

      .cell-number {
        margin-top: 6px;
        font-size: 24px;
        font-weight: 700;
        color: #0f172a;
      }

      .cell-object-label {
        font-size: 14px;
        font-weight: 700;
        color: #92400e;
      }

      @media print {
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        .page {
          padding: 18px;
        }

        .board-scroll {
          overflow: visible;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="page-header">
        <p class="eyebrow">Director Layout Export</p>
        <h1>${escapeHtml(layout.name)}</h1>
        <p class="subtitle">Rooms included: ${selectedRooms.map((room) => escapeHtml(room.name)).join(", ")}</p>
      </header>
      ${roomMarkup}
    </main>
    <script>
      window.addEventListener("load", () => {
        setTimeout(() => {
          window.print();
        }, 150);
      });
    </script>
  </body>
</html>`;

    exportWindow.document.open();
    exportWindow.document.write(exportHtml);
    exportWindow.document.close();

    setExportModalOpen(false);
    setExportingPdf(false);
    setFeedback({
      kind: "success",
      message: "Print dialog opened. Choose Save as PDF to download the selected rooms.",
    });
  }

  if (auth.status === "loading" || directorStatus.status === "loading") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-slate-400">
        Loading layout editor…
      </div>
    );
  }

  if (auth.status === "anonymous" || directorStatus.status === "forbidden") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-panel/90 p-8 text-center backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Layout workshop
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-wide text-white sm:text-5xl">
            Director access required
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
            Saved club layouts belong to the director side. Sign in with a director
            account to open the full-screen board editor.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button to="/login?next=/directors" className="px-5 py-2.5">
              Director sign in
            </Button>
            <Button to="/directors" variant="secondary" className="px-5 py-2.5">
              Back to director console
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (directorStatus.status === "error") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-red-400/20 bg-panel/90 p-8 text-center backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
            Layout editor error
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-wide text-white sm:text-5xl">
            We could not load this saved layout
          </h1>
          <p className="mt-4 text-sm text-red-300">{directorStatus.error}</p>
        </div>
      </div>
    );
  }

  if (directorStatus.status === "not_found" || !layout) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-dashed border-white/10 bg-panel/80 p-8 text-center text-slate-400">
          This saved layout could not be found.
          <div className="mt-6">
            <Button to="/directors" variant="secondary" className="px-5 py-2.5">
              Back to director console
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
            Layout workshop
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-wide text-white sm:text-5xl">
            {layout.name}
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-400">
            Build reusable floor plans room by room. Each room can have its own grid
            size, its own table cluster, and its own saved arrangement for future
            tournaments.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            className="px-5 py-2.5"
            onClick={() => setExportModalOpen(true)}
          >
            Export PDF
          </Button>
          <Button to="/directors" variant="secondary" className="px-5 py-2.5">
            Back to director console
          </Button>
        </div>
      </div>

      <div className="grid gap-8 xl:min-h-0 xl:flex-1 xl:grid-cols-[340px_minmax(0,1fr)] xl:overflow-hidden">
        <aside className="space-y-6 rounded-2xl border border-white/10 bg-panel/90 p-6 backdrop-blur-sm">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
              Layout name
            </label>
            <input
              type="text"
              value={layoutNameDraft}
              onChange={(event) => setLayoutNameDraft(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
            />
            <div className="mt-3 flex gap-3">
              <Button
                type="button"
                className="px-5 py-2.5"
                disabled={savingName || !layoutNameDraft.trim()}
                onClick={() => void onSaveName()}
              >
                {savingName ? "Saving name…" : "Save name"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-space/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Layout stats
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">{layout.total_tables}</p>
            <p className="mt-1 text-sm text-slate-400">Total tables across all rooms</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-space/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Add room
            </p>
            <div className="mt-3 space-y-3">
              <input
                type="text"
                value={roomForm.name}
                onChange={(event) =>
                  setRoomForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                placeholder="Room 2"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min="1"
                  max={MAX_ROOM_COLUMNS}
                  value={roomForm.columns}
                  onChange={(event) =>
                    setRoomForm((current) => ({
                      ...current,
                      columns: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                  placeholder="Columns"
                />
                <input
                  type="number"
                  min="1"
                  max={MAX_ROOM_ROWS}
                  value={roomForm.rows}
                  onChange={(event) =>
                    setRoomForm((current) => ({
                      ...current,
                      rows: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                  placeholder="Rows"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="px-5 py-2.5"
                disabled={addingRoom || !roomForm.name.trim()}
                onClick={() => void onAddRoom()}
              >
                {addingRoom ? "Adding room…" : "Add room"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-space/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Rooms
            </p>
            <div className="mt-3 space-y-3">
              {rooms.map((room) => {
                const selected = room.id === selectedRoomId;
                const roomTableCount = layoutTables.filter(
                  (table) => table.room_id === room.id,
                ).length;

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

          <div className="rounded-2xl border border-white/10 bg-space/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Custom objects
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Add room blocks like desks, walkways, barriers, or check-in areas. They
              occupy real board space and block tables from being placed on top.
            </p>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={objectForm.label}
                onChange={(event) =>
                  setObjectForm((current) => ({ ...current, label: event.target.value }))
                }
                className="w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                placeholder="Desk, walkway, umpire desk…"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min="1"
                  max={MAX_ROOM_COLUMNS}
                  value={objectForm.width}
                  onChange={(event) =>
                    setObjectForm((current) => ({
                      ...current,
                      width: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                  placeholder="Width"
                />
                <input
                  type="number"
                  min="1"
                  max={MAX_ROOM_ROWS}
                  value={objectForm.height}
                  onChange={(event) =>
                    setObjectForm((current) => ({
                      ...current,
                      height: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                  placeholder="Height"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="px-5 py-2.5"
                disabled={addingObject || !selectedRoom}
                onClick={() => void onAddObject()}
              >
                {addingObject
                  ? "Adding object…"
                  : selectedRoom
                    ? `Add object to ${selectedRoom.name}`
                    : "Select a room first"}
              </Button>
            </div>

            {selectedObject ? (
              <div className="mt-5 border-t border-white/10 pt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Selected object
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Edit the label or footprint here, then save it back into the room.
                </p>
                <div className="mt-4 space-y-3">
                  <input
                    type="text"
                    value={objectForm.label}
                    onChange={(event) =>
                      setObjectForm((current) => ({
                        ...current,
                        label: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    placeholder="Object label"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="number"
                      min="1"
                      max={MAX_ROOM_COLUMNS}
                      value={objectForm.width}
                      onChange={(event) =>
                        setObjectForm((current) => ({
                          ...current,
                          width: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                      placeholder="Width"
                    />
                    <input
                      type="number"
                      min="1"
                      max={MAX_ROOM_ROWS}
                      value={objectForm.height}
                      onChange={(event) =>
                        setObjectForm((current) => ({
                          ...current,
                          height: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-white/10 bg-panel/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                      placeholder="Height"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      className="px-5 py-2.5"
                      disabled={savingObject}
                      onClick={() => void onSaveObject()}
                    >
                      {savingObject ? "Saving object…" : "Save object"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-5 py-2.5 text-red-300 hover:text-red-200"
                      disabled={deletingObject}
                      onClick={() => void onDeleteObject()}
                    >
                      {deletingObject ? "Removing…" : "Remove object"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {selectedRoom && roomObjects.length > 0 ? (
              <div className="mt-5 border-t border-white/10 pt-5">
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
          </div>

          {feedback ? (
            <div
              className={`rounded-2xl border p-4 text-sm ${
                feedback.kind === "error"
                  ? "border-red-400/20 bg-space/40 text-red-300"
                  : "border-accent/20 bg-accent/10 text-accent"
              }`}
              role={feedback.kind === "error" ? "alert" : "status"}
            >
              {feedback.message}
            </div>
          ) : null}
        </aside>

        <section className="space-y-8 xl:grid xl:min-h-0 xl:min-w-0 xl:grid-rows-[auto_minmax(0,1fr)] xl:gap-8 xl:space-y-0 xl:overflow-hidden">
          {selectedRoom ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-panel/90 p-6 backdrop-blur-sm sm:p-8 xl:min-w-0 xl:shrink-0">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                      Selected room
                    </p>
                    <h2 className="font-display mt-3 text-3xl tracking-wide text-white">
                      {selectedRoom.name}
                    </h2>
                    <p className="mt-4 text-sm leading-relaxed text-slate-400">
                      Adjust the room dimensions here when you need a larger board.
                      Shrinking only works if every existing table still fits inside the
                      smaller grid. Bigger rooms scroll instead of shrinking the board
                      down until it becomes hard to read.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <input
                      type="number"
                      min="1"
                      value={tableBatchCount}
                      onChange={(event) => setTableBatchCount(event.target.value)}
                      className="w-[112px] rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                      placeholder="Qty"
                      aria-label="Number of tables to add"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-5 py-2.5"
                      disabled={addingTable}
                      onClick={() => void onAddTable()}
                    >
                      {addingTable
                        ? "Adding table…"
                        : Number(tableBatchCount) > 1
                          ? `Add tables to ${selectedRoom.name}`
                          : `Add table to ${selectedRoom.name}`}
                    </Button>
                    <Button
                      type="button"
                      className="px-5 py-2.5"
                      disabled={savingPositions || layoutTables.length === 0}
                      onClick={() => void onSavePositions()}
                    >
                      {savingPositions ? "Saving board…" : "Save layout positions"}
                    </Button>
                  </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_140px_140px_auto]">
                  <input
                    type="text"
                    value={selectedRoomForm.name}
                    onChange={(event) =>
                      setSelectedRoomForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    placeholder="Room name"
                  />
                  <input
                    type="number"
                    min="1"
                    max={MAX_ROOM_COLUMNS}
                    value={selectedRoomForm.columns}
                    onChange={(event) =>
                      setSelectedRoomForm((current) => ({
                        ...current,
                        columns: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    placeholder="Columns"
                  />
                  <input
                    type="number"
                    min="1"
                    max={MAX_ROOM_ROWS}
                    value={selectedRoomForm.rows}
                    onChange={(event) =>
                      setSelectedRoomForm((current) => ({
                        ...current,
                        rows: event.target.value,
                      }))
                    }
                    className="rounded-lg border border-white/10 bg-space/80 px-3 py-2.5 text-sm text-white outline-none ring-accent/40 focus:border-accent/50 focus:ring-2"
                    placeholder="Rows"
                  />
                  <Button
                    type="button"
                    className="px-5 py-2.5"
                    disabled={savingRoom || !selectedRoomForm.name.trim()}
                    onClick={() => void onSaveRoomSettings()}
                  >
                    {savingRoom ? "Saving room…" : "Save room"}
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-panel/90 p-6 backdrop-blur-sm sm:p-8 xl:flex xl:min-h-0 xl:min-w-0 xl:flex-col xl:overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                      Tables
                    </p>
                    <h2 className="font-display mt-3 text-3xl tracking-wide text-white">
                      {selectedRoom.name} board
                    </h2>
                    <p className="mt-4 text-sm leading-relaxed text-slate-400">
                      Click a table chip to select it. Clicking an occupied cell now
                      just selects that table instead of swapping positions. Clicking an
                      empty cell moves the currently selected table there. If the room
                      grows beyond the visible space, scroll the board to inspect the
                      whole floor plan.
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
                            onClick={() => setSelectedTableNumber(table.table_number)}
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
                                  setFeedback(null);
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
                              onClick={() => onGridCellClick(gridX, gridY)}
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
                                  : "border-dashed border-white/10 bg-space/50 text-slate-600 hover:border-white/20"
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
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-panel/80 p-8 text-center text-slate-400">
              Add your first room on the left to start building the layout.
            </div>
          )}
        </section>
      </div>

      {exportModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-space/80 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-panel p-6 shadow-2xl shadow-black/40 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  Export layout PDF
                </p>
                <h2 className="font-display mt-3 text-3xl tracking-wide text-white">
                  Choose rooms to include
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-400">
                  Pick one room, several rooms, or all of them. Your browser&apos;s
                  print dialog will open so you can save the export as a PDF.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="rounded-full border border-white/10 bg-space/60 px-3 py-1 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                className="px-5 py-2.5"
                onClick={() => setExportRoomIds(rooms.map((room) => room.id))}
              >
                Select all rooms
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="px-5 py-2.5"
                onClick={() => setExportRoomIds([])}
              >
                Clear selection
              </Button>
            </div>

            <div className="mt-6 max-h-[320px] space-y-3 overflow-y-auto pr-1">
              {rooms.map((room) => {
                const checked = exportRoomIds.includes(room.id);
                const roomTableCount = layoutTables.filter(
                  (table) => table.room_id === room.id,
                ).length;

                return (
                  <label
                    key={room.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                      checked
                        ? "border-accent/35 bg-accent/10"
                        : "border-white/10 bg-space/40 hover:border-white/20"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleExportRoom(room.id)}
                      className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
                    />
                    <div>
                      <p className="font-semibold text-white">{room.name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {room.columns} x {room.rows} grid • {roomTableCount} tables
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                className="px-5 py-2.5"
                onClick={() => setExportModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="px-5 py-2.5"
                disabled={exportingPdf}
                onClick={() => void onExportPdf()}
              >
                {exportingPdf ? "Preparing PDF…" : "Open print dialog"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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
