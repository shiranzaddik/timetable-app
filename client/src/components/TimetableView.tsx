import { useMemo, useState } from "react";
import { useT } from "../i18n";
import {
  Day,
  type Grid,
  type SchoolInput,
  type SolveResult,
  type TimetableCell,
} from "../types";

type Mode = "byClass" | "byTeacher";

interface Props {
  input: SchoolInput;
  result: SolveResult;
  mode: Mode;
  onResultChange: (next: SolveResult) => void;
}

interface EntityRef {
  id: string;
  name: string;
}

export default function TimetableView({
  input,
  result,
  mode,
  onResultChange,
}: Props) {
  const { tClassName, tTeacher } = useT();
  const entities: EntityRef[] =
    mode === "byClass"
      ? input.classes.map((c) => ({ id: c.id, name: tClassName(c.id) }))
      : input.teachers.map((teacher) => ({ id: teacher.id, name: tTeacher(teacher) }));

  const grids: Record<string, Grid> =
    mode === "byClass"
      ? (result.timetables.byClass as Record<string, Grid>)
      : result.timetables.byTeacher;

  const [selectedId, setSelectedId] = useState<string>(entities[0]?.id ?? "");
  const entity = entities.find((e) => e.id === selectedId) ?? entities[0];
  if (!entity) return null;
  const grid = grids[entity.id];

  // Conflicts only need to be recomputed when the grids change.
  const conflictMap = useMemo(
    () => computeConflicts(result.timetables.byClass as Record<string, Grid>),
    [result.timetables.byClass]
  );

  const handleSwap = (d1: number, s1: number, d2: number, s2: number) => {
    if (mode !== "byClass") return; // editing is only allowed in the by-class view
    if (d1 === d2 && s1 === s2) return;
    const next = swapCellsInClass(result, entity.id, d1, s1, d2, s2);
    onResultChange(next);
  };

  return (
    <>
      <div className="tabs">
        {entities.map((e) => (
          <button
            key={e.id}
            className={`tab ${selectedId === e.id ? "active" : ""}`}
            onClick={() => setSelectedId(e.id)}
          >
            {e.name}
          </button>
        ))}
      </div>
      <GridTable
        input={input}
        grid={grid}
        mode={mode}
        editableEntityId={mode === "byClass" ? entity.id : null}
        conflictMap={conflictMap}
        onSwap={handleSwap}
      />
      {/* Hidden one-per-class block used by "Print all classes". A body class
       *  flips the print stylesheet so this becomes the only visible content
       *  while the regular grid above is hidden. */}
      <div className="print-all-classes" aria-hidden="true">
        {input.classes.map((c) => {
          const classGrid = (
            result.timetables.byClass as Record<string, Grid>
          )[c.id];
          if (!classGrid) return null;
          return (
            <div key={c.id} className="print-class-page">
              <h2 className="print-class-title">{tClassName(c.id)}</h2>
              <GridTable
                input={input}
                grid={classGrid}
                mode="byClass"
                editableEntityId={null}
                conflictMap={conflictMap}
                onSwap={() => {}}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

interface GridProps {
  input: SchoolInput;
  grid: Grid;
  mode: Mode;
  /** Class id whose grid is editable; null disables editing (e.g., teacher view). */
  editableEntityId: string | null;
  /** "classId:day:slot" → true when this slot has a teacher/room conflict. */
  conflictMap: Set<string>;
  onSwap: (d1: number, s1: number, d2: number, s2: number) => void;
}

function slotRangeLabel(start: string): string {
  const [hStr, mStr = "00"] = start.split(":");
  const h = Number.parseInt(hStr, 10);
  const end = `${String(h + 1).padStart(2, "0")}:${mStr}`;
  return `${start}-${end}`;
}

function GridTable({
  input,
  grid,
  mode,
  editableEntityId,
  conflictMap,
  onSwap,
}: GridProps) {
  const { t, tDay, tSubject, tClassName, tTeacher, tRoom } = useT();
  const { days, slotLabels } = input.config;
  const teacherById = new Map(input.teachers.map((tch) => [tch.id, tch]));
  const roomById = new Map(input.rooms.map((r) => [r.id, r]));
  const [pending, setPending] = useState<{ day: number; slot: number } | null>(
    null
  );

  const editable = editableEntityId !== null;

  const onCellClick = (day: number, slot: number) => {
    if (!editable) return;
    if (!pending) {
      setPending({ day, slot });
      return;
    }
    if (pending.day === day && pending.slot === slot) {
      setPending(null);
      return;
    }
    onSwap(pending.day, pending.slot, day, slot);
    setPending(null);
  };

  return (
    <div className="timetable-wrap">
      {editable && (
        <div className="timetable-edit-hint">
          {pending ? t("editingClickSecond") : t("editingClickFirst")}
          {pending && (
            <button
              type="button"
              className="secondary"
              onClick={() => setPending(null)}
              style={{ marginInlineStart: 8, padding: "2px 10px", fontSize: 12 }}
            >
              {t("cancel")}
            </button>
          )}
        </div>
      )}
      <table className="timetable">
        <thead>
          <tr>
            <th></th>
            {days.map((d) => (
              <th key={d}>{tDay(d as Day)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slotLabels.map((label, slotIdx) => (
            <tr key={slotIdx}>
              <td className="slot-label">{slotRangeLabel(label)}</td>
              {days.map((_, dayIdx) => {
                const cell = grid[dayIdx][slotIdx];
                const isPending =
                  !!pending && pending.day === dayIdx && pending.slot === slotIdx;
                const isConflict =
                  editableEntityId !== null &&
                  conflictMap.has(`${editableEntityId}:${dayIdx}:${slotIdx}`);
                const baseClass = editable ? "editable" : "";
                const pendingClass = isPending ? "pending" : "";
                const conflictClass = isConflict ? "conflict" : "";
                if (!cell) {
                  return (
                    <td
                      key={dayIdx}
                      className={`empty ${baseClass} ${pendingClass}`}
                      onClick={() => onCellClick(dayIdx, slotIdx)}
                    >
                      —
                    </td>
                  );
                }
                return (
                  <td
                    key={dayIdx}
                    className={`subj-${cell.subject} ${baseClass} ${pendingClass} ${conflictClass}`}
                    onClick={() => onCellClick(dayIdx, slotIdx)}
                  >
                    <div className="cell-subject">{tSubject(cell.subject)}</div>
                    <div className="cell-meta">
                      {mode === "byClass"
                        ? (teacherById.get(cell.teacherId)
                            ? tTeacher(teacherById.get(cell.teacherId)!)
                            : cell.teacherName)
                        : tClassName(cell.classId)}
                    </div>
                    <div className="cell-meta">
                      {roomById.get(cell.roomId)
                        ? tRoom(roomById.get(cell.roomId)!)
                        : cell.roomName}
                    </div>
                    {isConflict && (
                      <div className="cell-conflict-tag">
                        {t("cellConflict")}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Swap two cells inside a single class's grid and return a fresh SolveResult
 *  with byTeacher rebuilt to stay in sync. */
function swapCellsInClass(
  result: SolveResult,
  classId: string,
  d1: number,
  s1: number,
  d2: number,
  s2: number
): SolveResult {
  const byClass: Record<string, Grid> = {};
  for (const [cid, grid] of Object.entries(result.timetables.byClass)) {
    byClass[cid] = grid.map((row) => row.slice());
  }
  const classGrid = byClass[classId];
  const a = classGrid[d1][s1];
  const b = classGrid[d2][s2];
  classGrid[d1][s1] = b;
  classGrid[d2][s2] = a;

  // Rebuild byTeacher from the new byClass — if any teacher ends up double-booked
  // the conflict view will surface it, but we still render every cell.
  const teacherIds = new Set<string>();
  for (const grid of Object.values(byClass)) {
    for (const row of grid) {
      for (const cell of row) {
        if (cell) teacherIds.add(cell.teacherId);
      }
    }
  }
  const days = classGrid.length;
  const slots = classGrid[0]?.length ?? 0;
  const byTeacher: Record<string, Grid> = {};
  for (const tid of teacherIds) {
    byTeacher[tid] = Array.from({ length: days }, () =>
      Array.from({ length: slots }, () => null as TimetableCell | null)
    );
  }
  for (const grid of Object.values(byClass)) {
    for (let d = 0; d < days; d++) {
      for (let s = 0; s < slots; s++) {
        const cell = grid[d][s];
        if (cell && byTeacher[cell.teacherId]) {
          // If the teacher's slot is already occupied (conflict), keep whichever
          // we see first — both classes will still appear in the conflict map.
          if (byTeacher[cell.teacherId][d][s] === null) {
            byTeacher[cell.teacherId][d][s] = cell;
          }
        }
      }
    }
  }
  return {
    ...result,
    timetables: { byClass, byTeacher },
  };
}

/** Inspect every (day, slot) and flag class cells whose teacher or room is
 *  used by another class at the same time. Returns a set of conflict keys
 *  shaped "classId:day:slot". */
function computeConflicts(byClass: Record<string, Grid>): Set<string> {
  const teacherSeen = new Map<string, string[]>(); // "tid:d:s" → [classId]
  const roomSeen = new Map<string, string[]>(); // "rid:d:s" → [classId]
  for (const [cid, grid] of Object.entries(byClass)) {
    for (let d = 0; d < grid.length; d++) {
      for (let s = 0; s < grid[d].length; s++) {
        const cell = grid[d][s];
        if (!cell) continue;
        const tk = `${cell.teacherId}:${d}:${s}`;
        const rk = `${cell.roomId}:${d}:${s}`;
        if (!teacherSeen.has(tk)) teacherSeen.set(tk, []);
        teacherSeen.get(tk)!.push(cid);
        if (!roomSeen.has(rk)) roomSeen.set(rk, []);
        roomSeen.get(rk)!.push(cid);
      }
    }
  }
  const conflicts = new Set<string>();
  const markConflicts = (
    seen: Map<string, string[]>,
    parseKey: (key: string) => { d: number; s: number }
  ) => {
    for (const [key, classIds] of seen) {
      if (classIds.length < 2) continue;
      const { d, s } = parseKey(key);
      for (const cid of classIds) conflicts.add(`${cid}:${d}:${s}`);
    }
  };
  const parseKey = (key: string) => {
    const parts = key.split(":");
    return { d: Number(parts[1]), s: Number(parts[2]) };
  };
  markConflicts(teacherSeen, parseKey);
  markConflicts(roomSeen, parseKey);
  return conflicts;
}
