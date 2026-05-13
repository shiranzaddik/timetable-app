import { useState } from "react";
import { useT } from "../i18n";
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
  /** Existing ids — used for collision detection when adding a new teacher. */
  existingIds: string[];
  /** When provided, the form edits this teacher instead of creating a new one. */
  initial?: Teacher;
}

const WELL_KNOWN_SUBJECTS: string[] = Object.values(Subject);

export default function TeacherForm({ onSave, onCancel, existingIds, initial }: Props) {
  const { t, tDay, tSubject } = useT();
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [subjects, setSubjects] = useState<string[]>(initial?.subjects ?? []);
  const [customDraft, setCustomDraft] = useState("");
  const [grades, setGrades] = useState<Grade[]>(initial?.grades ?? []);
  const [dayOff, setDayOff] = useState<Day>(initial?.dayOff ?? Day.Sunday);
  const [unavailable, setUnavailable] = useState<UnavailabilityWindow[]>(
    initial?.unavailable ?? []
  );
  const [error, setError] = useState<string | null>(null);

  const toggle = <T,>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];

  const submit = () => {
    if (!name.trim()) return setError(t("errNameRequired"));
    if (subjects.length === 0) return setError(t("errPickSubject"));
    if (grades.length === 0) return setError(t("errPickGrade"));
    const id = isEdit ? initial!.id : makeId(name, existingIds);
    onSave({ id, name: name.trim(), subjects, grades, dayOff, unavailable });
  };

  return (
    <div className="form-card">
      <strong style={{ fontSize: 14 }}>
        {isEdit ? t("editTeacher") : t("newTeacher")}
      </strong>

      <div className="form-row">
        <label>{t("fieldName")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("fieldNamePlaceholder")}
        />
      </div>

      <div className="form-row">
        <label>{t("fieldSubjects")}</label>
        <div className="checkbox-grid">
          {WELL_KNOWN_SUBJECTS.map((s) => (
            <label key={s} className={subjects.includes(s) ? "checked" : ""}>
              <input
                type="checkbox"
                checked={subjects.includes(s)}
                onChange={() => setSubjects(toggle(subjects, s))}
              />
              {tSubject(s)}
            </label>
          ))}
        </div>
        {/* Custom subjects */}
        <div className="row" style={{ marginTop: 8 }}>
          {subjects
            .filter((s) => !WELL_KNOWN_SUBJECTS.includes(s))
            .map((s) => (
              <span key={s} className="tag">
                {s}
                <button
                  type="button"
                  className="tag-remove"
                  aria-label={t("delete")}
                  onClick={() => setSubjects(subjects.filter((x) => x !== s))}
                >
                  ×
                </button>
              </span>
            ))}
        </div>
        <div className="window-row" style={{ marginTop: 4, gridTemplateColumns: "1fr auto" }}>
          <input
            type="text"
            value={customDraft}
            placeholder={t("subjectPlaceholder")}
            onChange={(e) => setCustomDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const v = customDraft.trim().toLowerCase();
                if (v && !subjects.includes(v)) setSubjects([...subjects, v]);
                setCustomDraft("");
              }
            }}
          />
          <button
            type="button"
            className="add-btn"
            onClick={() => {
              const v = customDraft.trim().toLowerCase();
              if (v && !subjects.includes(v)) setSubjects([...subjects, v]);
              setCustomDraft("");
            }}
          >
            {t("addSubject")}
          </button>
        </div>
      </div>

      <div className="form-row">
        <label>{t("fieldGrades")}</label>
        <div className="checkbox-grid">
          {Object.values(Grade).map((g) => (
            <label key={g} className={grades.includes(g) ? "checked" : ""}>
              <input
                type="checkbox"
                checked={grades.includes(g)}
                onChange={() => setGrades(toggle(grades, g))}
              />
              {t("gradePrefix")} {g}
            </label>
          ))}
        </div>
      </div>

      <div className="form-row">
        <label>{t("fieldDayOff")}</label>
        <select value={dayOff} onChange={(e) => setDayOff(e.target.value as Day)}>
          {Object.values(Day).map((d) => (
            <option key={d} value={d}>
              {tDay(d)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label>
          {t("fieldUnavailable")}{" "}
          <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>
            {t("optional")}
          </span>
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
                  {tDay(d)}
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
          onClick={() => setUnavailable([...unavailable, { day: Day.Sunday }])}
        >
          {t("addWindow")}
        </button>
        <small style={{ color: "var(--text-muted)" }}>
          {t("leaveTimesEmpty")}
        </small>
      </div>

      {error && <div className="banner error">{error}</div>}

      <div className="form-actions">
        <button onClick={submit}>
          {isEdit ? t("saveChanges") : t("saveTeacher")}
        </button>
        <button className="secondary" onClick={onCancel}>
          {t("cancel")}
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
