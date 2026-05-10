import { useState } from "react";
import {
  Day,
  Grade,
  Subject,
  type Teacher,
  type UnavailabilityWindow,
} from "../types";

interface Props {
  onSave: (teacher: Teacher) => void;
  onCancel: () => void;
  existingIds: string[];
}

export default function TeacherForm({ onSave, onCancel, existingIds }: Props) {
  const [name, setName] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [dayOff, setDayOff] = useState<Day>(Day.Sunday);
  const [unavailable, setUnavailable] = useState<UnavailabilityWindow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggle = <T,>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];

  const submit = () => {
    if (!name.trim()) return setError("Name is required");
    if (subjects.length === 0) return setError("Pick at least one subject");
    if (grades.length === 0) return setError("Pick at least one grade");
    const id = makeId(name, existingIds);
    onSave({ id, name: name.trim(), subjects, grades, dayOff, unavailable });
  };

  return (
    <div className="form-card">
      <strong style={{ fontSize: 14 }}>New teacher</strong>

      <div className="form-row">
        <label>Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ms. Smith"
        />
      </div>

      <div className="form-row">
        <label>Subjects</label>
        <div className="checkbox-grid">
          {Object.values(Subject).map((s) => (
            <label key={s} className={subjects.includes(s) ? "checked" : ""}>
              <input
                type="checkbox"
                checked={subjects.includes(s)}
                onChange={() => setSubjects(toggle(subjects, s))}
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      <div className="form-row">
        <label>Grades they can teach</label>
        <div className="checkbox-grid">
          {Object.values(Grade).map((g) => (
            <label key={g} className={grades.includes(g) ? "checked" : ""}>
              <input
                type="checkbox"
                checked={grades.includes(g)}
                onChange={() => setGrades(toggle(grades, g))}
              />
              Grade {g}
            </label>
          ))}
        </div>
      </div>

      <div className="form-row">
        <label>Day off</label>
        <select value={dayOff} onChange={(e) => setDayOff(e.target.value as Day)}>
          {Object.values(Day).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label>
          Other unavailable windows{" "}
          <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>(optional)</span>
        </label>
        {unavailable.map((w, i) => (
          <div key={i} className="window-row">
            <select
              value={w.day}
              onChange={(e) => {
                const next = [...unavailable];
                next[i] = { ...next[i], day: e.target.value as Day };
                setUnavailable(next);
              }}
            >
              {Object.values(Day).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={w.fromTime ?? ""}
              onChange={(e) => {
                const next = [...unavailable];
                next[i] = { ...next[i], fromTime: e.target.value || undefined };
                setUnavailable(next);
              }}
            />
            <input
              type="time"
              value={w.toTime ?? ""}
              onChange={(e) => {
                const next = [...unavailable];
                next[i] = { ...next[i], toTime: e.target.value || undefined };
                setUnavailable(next);
              }}
            />
            <button
              className="icon-btn"
              onClick={() => setUnavailable(unavailable.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          className="add-btn"
          style={{ alignSelf: "flex-start" }}
          onClick={() =>
            setUnavailable([...unavailable, { day: Day.Sunday }])
          }
        >
          + Window
        </button>
        <small style={{ color: "var(--text-muted)" }}>
          Leave times empty to mean the entire day.
        </small>
      </div>

      {error && <div className="banner error">{error}</div>}

      <div className="form-actions">
        <button onClick={submit}>Save teacher</button>
        <button className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function makeId(name: string, existing: string[]): string {
  const base = "t-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let id = base || `t-${Date.now()}`;
  let n = 2;
  while (existing.includes(id)) id = `${base}-${n++}`;
  return id;
}
