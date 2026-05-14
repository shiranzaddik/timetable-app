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
  existingIds: string[];
  initial?: Teacher;
  /** Grades that actually exist among the school's classes. The form
   *  filters the per-subject grade chips to these. Falls back to the full
   *  Grade enum when no classes have been created yet. */
  availableGrades?: Grade[];
}

const WELL_KNOWN_SUBJECTS: string[] = Object.values(Subject);
const ALL_GRADES: Grade[] = Object.values(Grade);

function mergeLegacyDayOff(
  legacyDayOff: Day | undefined,
  list: UnavailabilityWindow[]
): UnavailabilityWindow[] {
  if (!legacyDayOff) return list;
  // If the same all-day entry already exists, don't duplicate.
  const already = list.some(
    (w) => w.day === legacyDayOff && !w.fromTime && !w.toTime
  );
  if (already) return list;
  return [{ day: legacyDayOff, hard: true }, ...list];
}

export default function TeacherForm({
  onSave,
  onCancel,
  existingIds,
  initial,
  availableGrades,
}: Props) {
  const { t, tDay, tSubject } = useT();
  const isEdit = !!initial;
  const gradeChipChoices = availableGrades?.length ? availableGrades : ALL_GRADES;

  const [name, setName] = useState(initial?.name ?? "");
  const [subjects, setSubjects] = useState<string[]>(initial?.subjects ?? []);
  const [customDraft, setCustomDraft] = useState("");
  const [gradesPerSubject, setGradesPerSubject] = useState<Record<string, Grade[]>>(() => {
    const out: Record<string, Grade[]> = {};
    for (const s of initial?.subjects ?? []) {
      out[s] = initial?.gradesPerSubject?.[s] ?? initial?.grades ?? [...gradeChipChoices];
    }
    return out;
  });
  const [unavailable, setUnavailable] = useState<UnavailabilityWindow[]>(
    mergeLegacyDayOff(initial?.dayOff, initial?.unavailable ?? [])
  );
  const [canBeDefault, setCanBeDefault] = useState<boolean>(
    initial?.canBeDefault !== false
  );
  const [error, setError] = useState<string | null>(null);

  const toggleGradeForSubject = (subject: string, grade: Grade) => {
    setGradesPerSubject((prev) => {
      const list = prev[subject] ?? [...gradeChipChoices];
      const next = list.includes(grade)
        ? list.filter((g) => g !== grade)
        : [...list, grade];
      return { ...prev, [subject]: next };
    });
  };

  const addSubject = (s: string) => {
    if (subjects.includes(s)) return;
    setSubjects([...subjects, s]);
    setGradesPerSubject((prev) => ({
      ...prev,
      [s]: prev[s] ?? [...gradeChipChoices],
    }));
  };

  const removeSubject = (s: string) => {
    setSubjects(subjects.filter((x) => x !== s));
    setGradesPerSubject((prev) => {
      const next = { ...prev };
      delete next[s];
      return next;
    });
  };

  const submit = () => {
    if (!name.trim()) return setError(t("errNameRequired"));
    if (subjects.length === 0) return setError(t("errPickSubject"));
    for (const s of subjects) {
      if ((gradesPerSubject[s]?.length ?? 0) === 0) {
        return setError(t("errPickGrade"));
      }
    }
    const id = isEdit ? initial!.id : makeId(name, existingIds);
    const overallGrades = Array.from(
      new Set(subjects.flatMap((s) => gradesPerSubject[s] ?? []))
    );
    onSave({
      id,
      name: name.trim(),
      subjects,
      grades: overallGrades,
      gradesPerSubject,
      // Legacy dayOff is folded into unavailable; emit undefined here so it's
      // not double-counted on the next read.
      dayOff: undefined,
      unavailable,
      canBeDefault,
    });
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
        <label>{t("fieldGradesPerSubject")}</label>
        <small style={{ color: "var(--text-muted)", marginBottom: 4 }}>
          {t("perSubjectGradesHint")}
        </small>

        <div className="checkbox-grid">
          {WELL_KNOWN_SUBJECTS.map((s) => (
            <label key={s} className={subjects.includes(s) ? "checked" : ""}>
              <input
                type="checkbox"
                checked={subjects.includes(s)}
                onChange={() =>
                  subjects.includes(s) ? removeSubject(s) : addSubject(s)
                }
              />
              {tSubject(s)}
            </label>
          ))}
        </div>

        {subjects.filter((s) => !WELL_KNOWN_SUBJECTS.includes(s)).length > 0 && (
          <div className="row" style={{ marginTop: 6 }}>
            {subjects
              .filter((s) => !WELL_KNOWN_SUBJECTS.includes(s))
              .map((s) => (
                <span key={s} className="tag">
                  {s}
                  <button
                    type="button"
                    className="tag-remove"
                    aria-label={t("delete")}
                    onClick={() => removeSubject(s)}
                  >
                    ×
                  </button>
                </span>
              ))}
          </div>
        )}

        <div
          className="window-row"
          style={{ marginTop: 4, gridTemplateColumns: "1fr auto" }}
        >
          <input
            type="text"
            value={customDraft}
            placeholder={t("subjectPlaceholder")}
            onChange={(e) => setCustomDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const v = customDraft.trim().toLowerCase();
                if (v) addSubject(v);
                setCustomDraft("");
              }
            }}
          />
          <button
            type="button"
            className="add-btn"
            onClick={() => {
              const v = customDraft.trim().toLowerCase();
              if (v) addSubject(v);
              setCustomDraft("");
            }}
          >
            {t("addSubject")}
          </button>
        </div>

        {subjects.length > 0 && (
          <div className="per-subject-grades">
            {subjects.map((s) => {
              const selected = gradesPerSubject[s] ?? [];
              return (
                <div key={s} className="per-subject-grades-row">
                  <span className={`tag subj-${s}`} style={{ alignSelf: "center" }}>
                    {tSubject(s)}
                  </span>
                  <div className="grade-chip-row">
                    {gradeChipChoices.map((g) => {
                      const on = selected.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          className={`grade-chip ${on ? "on" : ""}`}
                          onClick={() => toggleGradeForSubject(s, g)}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unified time-off / preferences */}
      <div className="form-row">
        <label>{t("fieldVacation")}</label>
        <small style={{ color: "var(--text-muted)" }}>{t("vacationHint")}</small>
        {unavailable.map((w, i) => (
          <div key={i} className="window-row vacation-row">
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
            <select
              value={w.hard === false ? "soft" : "hard"}
              onChange={(e) => {
                const next = [...unavailable];
                next[i] = { ...next[i], hard: e.target.value === "hard" };
                setUnavailable(next);
              }}
            >
              <option value="hard">{t("cantWork")}</option>
              <option value="soft">{t("preferNot")}</option>
            </select>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setUnavailable(unavailable.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="add-btn"
          style={{ alignSelf: "flex-start" }}
          onClick={() =>
            setUnavailable([
              ...unavailable,
              { day: Day.Sunday, hard: true },
            ])
          }
        >
          {t("addVacation")}
        </button>
      </div>

      <div className="form-row">
        <label className="mandatory-toggle">
          <input
            type="checkbox"
            checked={canBeDefault}
            onChange={(e) => setCanBeDefault(e.target.checked)}
          />
          <span>{t("canBeDefaultLabel")}</span>
        </label>
        <small style={{ color: "var(--text-muted)" }}>{t("canBeDefaultHint")}</small>
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
  const base =
    "t-" +
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  let id = base || `t-${Date.now()}`;
  let n = 2;
  while (existing.includes(id)) id = `${base}-${n++}`;
  return id;
}
