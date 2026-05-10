import { useState } from "react";
import type { Grid, SchoolInput, SolveResult } from "../types";

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
  const entities: EntityRef[] =
    mode === "byClass" ? input.classes : input.teachers;
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

function GridTable({ input, grid, mode }: GridProps) {
  const { days, slotLabels } = input.config;

  return (
    <div className="timetable-wrap">
      <table className="timetable">
        <thead>
          <tr>
            <th></th>
            {days.map((d) => (
              <th key={d}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slotLabels.map((label, slotIdx) => (
            <tr key={slotIdx}>
              <td className="slot-label">{label}</td>
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
                    <div className="cell-subject">{cell.subject}</div>
                    <div className="cell-meta">
                      {mode === "byClass" ? cell.teacherName : cell.className}
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
