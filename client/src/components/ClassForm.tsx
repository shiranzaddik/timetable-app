import { useState } from "react";
import { useT } from "../i18n";
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
  const { t, tSubject } = useT();
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
    if (!defaultTeacherId) return setError(t("errSelectTeacher"));
    if (idCollides) return setError(t("errClassExists", { id }));
    const filtered = subjects.filter((s) => s.hoursPerWeek > 0);
    if (filtered.length === 0) return setError(t("errSetHours"));
    onSave({
      id,
      grade,
      section,
      name: `Class ${id}`,
      defaultTeacherId,
      defaultRoomId: `room-${id}`,
      subjects: filtered,
    });
  };

  return (
    <div className="form-card">
      <strong style={{ fontSize: 14 }}>
        {isEdit ? t("editClass", { id: initial!.id }) : t("newClass")}
      </strong>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div className="form-row">
          <label>{t("fieldGrade")}</label>
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
          <label>{t("fieldSection")}</label>
          <input
            type="number"
            min={1}
            value={section}
            onChange={(e) => setSection(Math.max(1, Number(e.target.value)))}
          />
        </div>
      </div>

      <div className="form-row">
        <label>{t("fieldDefaultTeacher")}</label>
        <select
          value={defaultTeacherId}
          onChange={(e) => setDefaultTeacherId(e.target.value)}
        >
          <option value="" disabled>
            {t("selectDots")}
          </option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>
        <small style={{ color: "var(--text-muted)" }}>
          {t("defaultTeacherNote")}
        </small>
      </div>

      <div className="form-row">
        <label>{t("fieldSubjectsHours")}</label>
        {subjects.map((row, i) => (
          <div key={row.subject} className="subject-hours-row">
            <span style={{ textTransform: "capitalize", fontSize: 13 }}>
              {tSubject(row.subject)}
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
          {isEdit
            ? t("saveChangesToId", { id })
            : t("saveClassWithId", { id })}
        </button>
        <button className="secondary" onClick={onCancel}>
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
