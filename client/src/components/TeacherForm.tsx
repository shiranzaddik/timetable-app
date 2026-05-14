import { useState } from "react";
import { useT } from "../i18n";
import {
  Day,
  Grade,
  Subject,
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

interface Props {
  onSave: (teacher: Teacher) => void;
  onCancel: () => void;
  existingIds: string[];
  initial?: Teacher;
  /** Trends that actually exist among the school's classes. Each per-subject
   *  chip toggles one trend. When omitted/empty, the form falls back to
   *  generic per-grade chips. */
  availableTrends?: TrendChoice[];
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
  availableTrends,
}: Props) {
  const { t, tDay, tSubject } = useT();
  const isEdit = !!initial;

  /** Trend choices: prefer the school's actual trends. Fall back to the
   *  Grade enum so the form still works before any classes exist. */
  const trendChoices: TrendChoice[] =
    availableTrends?.length
      ? availableTrends
      : ALL_GRADES.map((g) => ({ key: g as string, label: g as string, grade: g }));
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

  const [name, setName] = useState(initial?.name ?? "");
  const [subjects, setSubjects] = useState<string[]>(initial?.subjects ?? []);
  const [customDraft, setCustomDraft] = useState("");
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
    onSave({
      id,
      name: name.trim(),
      subjects,
      grades: overallGrades,
      trendsPerSubject,
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
        <small style={{ color: "var(--text-muted)" }}>{t("vacationHint")}</small>
        {unavailable.length > 0 && (
          <div className="window-row vacation-row vacation-row-header">
            <span>{t("colDay")}</span>
            <span>{t("colFrom")}</span>
            <span>{t("colTo")}</span>
            <span>{t("colType")}</span>
            <span />
          </div>
        )}
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
