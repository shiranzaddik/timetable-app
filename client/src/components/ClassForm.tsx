import { useState } from "react";
import {
  Grade,
  Subject,
  type ClassSubject,
  type SchoolClass,
  type Teacher,
} from "../types";

interface Props {
  teachers: Teacher[];
  existingIds: string[];
  onSave: (cls: SchoolClass) => void;
  onCancel: () => void;
  /** When provided, edit this class instead of creating a new one. */
  initial?: SchoolClass;
}

const DEFAULT_HOURS: Record<Subject, number> = {
  [Subject.Math]: 4,
  [Subject.Hebrew]: 4,
  [Subject.English]: 4,
  [Subject.Science]: 2,
  [Subject.Sport]: 2,
  [Subject.Music]: 1,
  [Subject.Computer]: 2,
};

export default function ClassForm({
  teachers,
  existingIds,
  onSave,
  onCancel,
  initial,
}: Props) {
  const isEdit = !!initial;
  const [grade, setGrade] = useState<Grade>(initial?.grade ?? Grade.A);
  const [section, setSection] = useState<number>(initial?.section ?? 1);
  const [defaultTeacherId, setDefaultTeacherId] = useState<string>(
    initial?.defaultTeacherId ?? teachers[0]?.id ?? ""
  );
  const [subjects, setSubjects] = useState<ClassSubject[]>(
    initial?.subjects ??
      Object.values(Subject).map((s) => ({
        subject: s,
        hoursPerWeek: DEFAULT_HOURS[s],
      }))
  );
  const [error, setError] = useState<string | null>(null);

  const id = `${grade}${section}`;
  const idCollides =
    existingIds.includes(id) && (!isEdit || id !== initial?.id);

  const submit = () => {
    if (!defaultTeacherId) return setError("Select a default teacher");
    if (idCollides) return setError(`Class "${id}" already exists`);
    const filtered = subjects.filter((s) => s.hoursPerWeek > 0);
    if (filtered.length === 0)
      return setError("Set hours/week for at least one subject");
    onSave({
      id,
      grade,
      section,
      name: `Class ${id}`,
      defaultTeacherId,
      defaultRoomId: `room-${id}`, // parent reconciles the rooms list
      subjects: filtered,
    });
  };

  return (
    <div className="form-card">
      <strong style={{ fontSize: 14 }}>
        {isEdit ? `Edit class ${initial!.id}` : "New class"}
      </strong>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div className="form-row">
          <label>Grade</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value as Grade)}
          >
            {Object.values(Grade).map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label>Section</label>
          <input
            type="number"
            min={1}
            value={section}
            onChange={(e) => setSection(Math.max(1, Number(e.target.value)))}
          />
        </div>
      </div>

      <div className="form-row">
        <label>Default teacher</label>
        <select
          value={defaultTeacherId}
          onChange={(e) => setDefaultTeacherId(e.target.value)}
        >
          <option value="" disabled>
            Select…
          </option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <small style={{ color: "var(--text-muted)" }}>
          For subjects this teacher can teach, they will be forced for this class.
        </small>
      </div>

      <div className="form-row">
        <label>Subjects (hours / week)</label>
        {subjects.map((row, i) => (
          <div key={row.subject} className="subject-hours-row">
            <span style={{ textTransform: "capitalize", fontSize: 13 }}>
              {row.subject}
            </span>
            <input
              type="number"
              min={0}
              value={row.hoursPerWeek}
              onChange={(e) => {
                const next = [...subjects];
                next[i] = { ...next[i], hoursPerWeek: Math.max(0, Number(e.target.value)) };
                setSubjects(next);
              }}
            />
            <span style={{ color: "var(--text-dim)", fontSize: 12 }}>h</span>
          </div>
        ))}
      </div>

      {error && <div className="banner error">{error}</div>}

      <div className="form-actions">
        <button onClick={submit}>
          {isEdit ? `Save changes to ${id}` : `Save class (${id})`}
        </button>
        <button className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
