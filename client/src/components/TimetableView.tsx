import { useState } from "react";
import { useT } from "../i18n";
import { Day, type Grid, type SchoolInput, type SolveResult } from "../types";

type Mode = "byClass" | "byTeacher";

interface Props {
  input: SchoolInput;
  result: SolveResult;
  mode: Mode;
}

interface EntityRef {
  id: string;
  name: string;
}

export default function TimetableView({ input, result, mode }: Props) {
  const { tClassName } = useT();
  const entities: EntityRef[] =
    mode === "byClass"
      ? input.classes.map((c) => ({ id: c.id, name: tClassName(c.id) }))
      : input.teachers.map((teacher) => ({ id: teacher.id, name: teacher.name }));

  // ClassId enum values are strings, so we can safely treat both maps as string-keyed.
  const grids: Record<string, Grid> =
    mode === "byClass"
      ? (result.timetables.byClass as Record<string, Grid>)
      : result.timetables.byTeacher;

  const [selectedId, setSelectedId] = useState<string>(entities[0]?.id ?? "");
  const entity = entities.find((e) => e.id === selectedId) ?? entities[0];
  if (!entity) return null;
  const grid = grids[entity.id];

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
      <GridTable input={input} grid={grid} mode={mode} />
    </>
  );
}

interface GridProps {
  input: SchoolInput;
  grid: Grid;
  mode: Mode;
}

/** Turn an "HH:MM" slot start into "HH:MM-HH+1:MM" — slots are always 1h. */
function slotRangeLabel(start: string): string {
  const [hStr, mStr = "00"] = start.split(":");
  const h = Number.parseInt(hStr, 10);
  const end = `${String(h + 1).padStart(2, "0")}:${mStr}`;
  return `${start}-${end}`;
}

function GridTable({ input, grid, mode }: GridProps) {
  const { tDay, tSubject, tClassName } = useT();
  const { days, slotLabels } = input.config;

  return (
    <div className="timetable-wrap">
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
                if (!cell)
                  return (
                    <td key={dayIdx} className="empty">
                      —
                    </td>
                  );
                return (
                  <td key={dayIdx} className={`subj-${cell.subject}`}>
                    <div className="cell-subject">{tSubject(cell.subject)}</div>
                    <div className="cell-meta">
                      {mode === "byClass"
                        ? cell.teacherName
                        : tClassName(cell.classId)}
                    </div>
                    <div className="cell-meta">{cell.roomName}</div>
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
