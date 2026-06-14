import { useState } from "react";
import { useT } from "../i18n";
import {
  Day,
  Grade,
  type SubjectDef,
  type Teacher,
  type UnavailabilityWindow,
} from "../types";

/** A trend the school has at least one class for. Used as the unit of
 *  teacher per-subject eligibility. */
export interface TrendChoice {
  key: string; // "A" or "A:science"
  label: string; // "A" or "A · science"
  grade: Grade;
}

/** One class option for the "homeroom of" picker inside TeacherForm. */
export interface HomeroomClassOption {
  id: string;
  /** Pre-localized display id (e.g., "א1" or "A1"). */
  label: string;
  /** Current homeroom teacher (used to surface a "will reassign" hint). */
  currentHomeroomTeacherName: string | null;
}

interface Props {
  onSave: (teacher: Teacher, homeroomClassIds: string[]) => void;
  onCancel: () => void;
  existingIds: string[];
  /** All teachers currently in the school (used to block duplicate names). */
  existingTeachers: Pick<Teacher, "id" | "name" | "nameHe">[];
  initial?: Teacher;
  /** School-level subject catalogue. The checkbox grid is built from this
   *  list — to add a new subject the user goes to the Subjects section. */
  availableSubjects: SubjectDef[];
  /** Trends that actually exist among the school's classes. Each per-subject
   *  chip toggles one trend. When omitted/empty, the form falls back to
   *  generic per-grade chips. */
  availableTrends?: TrendChoice[];
  /** Class chips offered for the "homeroom of" picker. */
  availableClasses?: HomeroomClassOption[];
  /** Class IDs whose current homeroom is this teacher (used when editing). */
  initialHomeroomClassIds?: string[];
}


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
  existingTeachers,
  initial,
  availableSubjects,
  availableClasses,
  initialHomeroomClassIds,
}: Props) {
  const { t, tDay, tSubject, tGrade, lang } = useT();
  const isEdit = !!initial;

  /** The chip group below the subjects list lets the user say "this
   *  teacher teaches subject X to these grades". We always show one chip
   *  per Grade enum value (א–ו in Hebrew, A–F in English). The selected
   *  grade keys still flow through Teacher.trendsPerSubject — a key like
   *  "A" matches every A-grade trend (regular + any specialization). */
  const trendChoices: TrendChoice[] = Object.values(Grade).map((g) => ({
    key: g as string,
    label: tGrade(g),
    grade: g,
  }));
  const allTrendKeys = trendChoices.map((c) => c.key);

  /** Expand legacy gradesPerSubject (Grade enum) into trend keys covered by
   *  those grades. */
  const expandLegacyForSubject = (subject: string): string[] => {
    const grades = initial?.gradesPerSubject?.[subject] ?? initial?.grades;
    if (!grades) return [...allTrendKeys];
    const set = new Set<string>(grades as Grade[]);
    return allTrendKeys.filter((key) => {
      const g = key.split(":")[0];
      return set.has(g as Grade);
    });
  };

  // The single name input edits the name in the *current* language. Hebrew
  // mode edits nameHe (falling back to name when not yet set); English mode
  // edits name. The non-edited language is preserved as-is on save.
  const [name, setName] = useState(
    lang === "he"
      ? initial?.nameHe ?? initial?.name ?? ""
      : initial?.name ?? ""
  );
  const [subjects, setSubjects] = useState<string[]>(initial?.subjects ?? []);
  const [trendsPerSubject, setTrendsPerSubject] = useState<Record<string, string[]>>(() => {
    const out: Record<string, string[]> = {};
    for (const s of initial?.subjects ?? []) {
      out[s] = initial?.trendsPerSubject?.[s] ?? expandLegacyForSubject(s);
    }
    return out;
  });
  const [unavailable, setUnavailable] = useState<UnavailabilityWindow[]>(
    mergeLegacyDayOff(initial?.dayOff, initial?.unavailable ?? [])
  );
  const [canBeDefault, setCanBeDefault] = useState<boolean>(
    initial?.canBeDefault !== false
  );
  const [homeroomClassIds, setHomeroomClassIds] = useState<string[]>(
    initialHomeroomClassIds ?? []
  );
  const [error, setError] = useState<string | null>(null);

  const toggleTrendForSubject = (subject: string, trendKey: string) => {
    setTrendsPerSubject((prev) => {
      const list = prev[subject] ?? [...allTrendKeys];
      const next = list.includes(trendKey)
        ? list.filter((k) => k !== trendKey)
        : [...list, trendKey];
      return { ...prev, [subject]: next };
    });
  };

  const addSubject = (s: string) => {
    if (subjects.includes(s)) return;
    setSubjects([...subjects, s]);
    setTrendsPerSubject((prev) => ({
      ...prev,
      [s]: prev[s] ?? [...allTrendKeys],
    }));
  };

  const removeSubject = (s: string) => {
    setSubjects(subjects.filter((x) => x !== s));
    setTrendsPerSubject((prev) => {
      const next = { ...prev };
      delete next[s];
      return next;
    });
  };

  const submit = () => {
    if (!name.trim()) return setError(t("errNameRequired"));
    if (subjects.length === 0) return setError(t("errPickSubject"));
    for (const s of subjects) {
      if ((trendsPerSubject[s]?.length ?? 0) === 0) {
        return setError(t("errPickGrade"));
      }
    }
    // Case-insensitive duplicate-name check across both languages. The user's
    // own teacher (when editing) is excluded.
    const candidate = name.trim().toLowerCase();
    const duplicate = existingTeachers.some((other) => {
      if (initial && other.id === initial.id) return false;
      const otherName = other.name?.trim().toLowerCase();
      const otherHe = other.nameHe?.trim().toLowerCase();
      return otherName === candidate || otherHe === candidate;
    });
    if (duplicate) {
      return setError(t("errTeacherNameExists", { name: name.trim() }));
    }
    const id = isEdit ? initial!.id : makeId(name, existingIds);
    // Derive grades from selected trend keys (key form "A" or "A:science").
    const keyToGrade = new Map(trendChoices.map((c) => [c.key, c.grade]));
    const overallGrades = Array.from(
      new Set(
        subjects.flatMap((s) =>
          (trendsPerSubject[s] ?? []).map((k) => keyToGrade.get(k)).filter(Boolean)
        )
      )
    ) as Grade[];
    const trimmed = name.trim();
    // Write the input into the field for the current language, preserving the
    // other-language name as the existing value. For new teachers the
    // non-edited language stays undefined so tTeacher falls back cleanly.
    const nextName = lang === "he" ? initial?.name ?? trimmed : trimmed;
    const nextNameHe = lang === "he" ? trimmed : initial?.nameHe;
    onSave(
      {
        id,
        name: nextName,
        nameHe: nextNameHe,
        subjects,
        grades: overallGrades,
        trendsPerSubject,
        // Legacy dayOff is folded into unavailable; emit undefined here so it's
        // not double-counted on the next read.
        dayOff: undefined,
        unavailable,
        canBeDefault,
      },
      homeroomClassIds
    );
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
        {t("perSubjectGradesHint") && (
          <small style={{ color: "var(--text-muted)", marginBottom: 4 }}>
            {t("perSubjectGradesHint")}
          </small>
        )}

        <div className="checkbox-grid">
          {availableSubjects.map((def) => (
            <label key={def.key} className={subjects.includes(def.key) ? "checked" : ""}>
              <input
                type="checkbox"
                checked={subjects.includes(def.key)}
                onChange={() =>
                  subjects.includes(def.key) ? removeSubject(def.key) : addSubject(def.key)
                }
              />
              {tSubject(def.key)}
            </label>
          ))}
        </div>

        {subjects.length > 0 && (
          <div className="per-subject-grades">
            {subjects.map((s) => {
              const selected = trendsPerSubject[s] ?? [];
              return (
                <div key={s} className="per-subject-grades-row">
                  <span className={`tag subj-${s}`} style={{ alignSelf: "center" }}>
                    {tSubject(s)}
                  </span>
                  <div className="grade-chip-row">
                    {trendChoices.map((c) => {
                      const on = selected.includes(c.key);
                      return (
                        <button
                          key={c.key}
                          type="button"
                          className={`grade-chip ${on ? "on" : ""}`}
                          onClick={() => toggleTrendForSubject(s, c.key)}
                        >
                          {c.label}
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
        {t("vacationHint") && (
          <small style={{ color: "var(--text-muted)" }}>{t("vacationHint")}</small>
        )}
        {unavailable.map((w, i) => (
          <div key={i} className="vacation-row-flex">
            <label className="vacation-field">
              <span className="vacation-field-label">{t("colDay")}</span>
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
            </label>
            <label className="vacation-field vacation-field-time">
              <span className="vacation-field-label">{t("colFrom")}</span>
              <input
                type="time"
                value={w.fromTime ?? ""}
                onChange={(e) => {
                  const next = [...unavailable];
                  next[i] = { ...next[i], fromTime: e.target.value || undefined };
                  setUnavailable(next);
                }}
              />
            </label>
            <label className="vacation-field vacation-field-time">
              <span className="vacation-field-label">{t("colTo")}</span>
              <input
                type="time"
                value={w.toTime ?? ""}
                onChange={(e) => {
                  const next = [...unavailable];
                  next[i] = { ...next[i], toTime: e.target.value || undefined };
                  setUnavailable(next);
                }}
              />
            </label>
            <label className="vacation-field vacation-field-type">
              <span className="vacation-field-label">{t("colType")}</span>
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
            </label>
            <button
              type="button"
              className="icon-btn vacation-remove"
              onClick={() => setUnavailable(unavailable.filter((_, j) => j !== i))}
              aria-label={t("delete")}
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
        <label>{t("fieldHomerooms")}</label>
        {t("fieldHomeroomsHint") && (
          <small style={{ color: "var(--text-muted)", marginBottom: 4 }}>
            {t("fieldHomeroomsHint")}
          </small>
        )}
        {!availableClasses || availableClasses.length === 0 ? (
          <small style={{ color: "var(--text-muted)" }}>
            {t("fieldHomeroomsNoClasses")}
          </small>
        ) : (
          <select
            value={homeroomClassIds[0] ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setHomeroomClassIds(v ? [v] : []);
            }}
          >
            <option value="">{t("noDefaultTeacher")}</option>
            {availableClasses.map((c) => {
              const occupiedByOther =
                c.currentHomeroomTeacherName &&
                c.currentHomeroomTeacherName !== name.trim() &&
                !initialHomeroomClassIds?.includes(c.id);
              return (
                <option key={c.id} value={c.id}>
                  {occupiedByOther
                    ? `${c.label} — ${c.currentHomeroomTeacherName}`
                    : c.label}
                </option>
              );
            })}
          </select>
        )}
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
        {t("canBeDefaultHint") && (
          <small style={{ color: "var(--text-muted)" }}>{t("canBeDefaultHint")}</small>
        )}
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
