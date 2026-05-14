import { useState } from "react";
import { useT } from "../i18n";
import { Subject, type ClassSubject, type Grade } from "../types";

export interface GradeFormResult {
  subjects: ClassSubject[];
  startHour?: number;
  endHour?: number;
}

interface Props {
  grade: Grade;
  /** Specialization name within the grade (e.g., "science"). Undefined = regular. */
  trendName?: string;
  initialSubjects: ClassSubject[];
  initialStartHour?: number;
  initialEndHour?: number;
  /** Global config defaults; used when this trend has no override. */
  defaultStartHour: number;
  defaultEndHour: number;
  onSave: (result: GradeFormResult) => void;
  onCancel: () => void;
}

const WELL_KNOWN_SUBJECTS: string[] = Object.values(Subject);

/** Default hours/week per subject — totals 25h so every class fills a 5-hour
 *  school day across 5 weekdays (08:00 → 13:00). The user can adjust. */
const DEFAULT_HOURS: Record<string, number> = {
  [Subject.Math]: 4,
  [Subject.Hebrew]: 4,
  [Subject.English]: 4,
  [Subject.Science]: 4,
  [Subject.Sport]: 3,
  [Subject.Music]: 2,
  [Subject.Computer]: 4,
};

export function defaultGradeSubjects(): ClassSubject[] {
  return WELL_KNOWN_SUBJECTS.map((s) => ({
    subject: s,
    hoursPerWeek: DEFAULT_HOURS[s] ?? 2,
    mandatory: true,
  }));
}

export default function GradeForm({
  grade,
  trendName,
  initialSubjects,
  initialStartHour,
  initialEndHour,
  defaultStartHour,
  defaultEndHour,
  onSave,
  onCancel,
}: Props) {
  const { t, tSubject } = useT();
  const [subjects, setSubjects] = useState<ClassSubject[]>(initialSubjects);
  const [startHour, setStartHour] = useState<number>(initialStartHour ?? defaultStartHour);
  const [endHour, setEndHour] = useState<number>(initialEndHour ?? defaultEndHour);
  const [error, setError] = useState<string | null>(null);
  const headerLabel = trendName ? `${grade} · ${trendName}` : `${grade}`;

  const submit = () => {
    const filtered = subjects
      .map((s) => ({
        subject: s.subject.trim().toLowerCase(),
        hoursPerWeek: s.hoursPerWeek,
        mandatory: s.mandatory ?? true,
      }))
      .filter((s) => s.subject !== "" && s.hoursPerWeek > 0);
    if (filtered.length === 0) return setError(t("errSetHours"));
    if (endHour <= startHour)
      return setError("End hour must be greater than start hour");
    onSave({
      subjects: filtered,
      startHour: startHour === defaultStartHour ? undefined : startHour,
      endHour: endHour === defaultEndHour ? undefined : endHour,
    });
  };

  return (
    <div className="form-card">
      <strong style={{ fontSize: 14 }}>
        {t("editGradeSubjects", { grade: headerLabel })}
      </strong>

      <div className="form-row">
        <label>{t("trendHoursLabel")}</label>
        <div className="school-day-inputs">
          <input
            type="number"
            min={0}
            max={23}
            value={startHour}
            onChange={(e) => setStartHour(Number(e.target.value))}
          />
          <span>→</span>
          <input
            type="number"
            min={1}
            max={24}
            value={endHour}
            onChange={(e) => setEndHour(Number(e.target.value))}
          />
        </div>
        <small style={{ color: "var(--text-muted)" }}>{t("trendHoursHint")}</small>
      </div>

      <div className="form-row">
        <label>{t("fieldSubjectsHours")}</label>
        {subjects.map((row, i) => {
          const isKnown = WELL_KNOWN_SUBJECTS.includes(row.subject);
          const isMandatory = row.mandatory ?? true;
          return (
            <div key={i} className="subject-hours-row mandatory-row">
              {isKnown ? (
                <span
                  style={{ textTransform: "capitalize", fontSize: 13, alignSelf: "center" }}
                >
                  {tSubject(row.subject)}
                </span>
              ) : (
                <input
                  type="text"
                  value={row.subject}
                  placeholder={t("subjectPlaceholder")}
                  onChange={(e) => {
                    const next = [...subjects];
                    next[i] = { ...next[i], subject: e.target.value };
                    setSubjects(next);
                  }}
                />
              )}
              <input
                type="number"
                min={0}
                value={row.hoursPerWeek}
                onChange={(e) => {
                  const next = [...subjects];
                  next[i] = {
                    ...next[i],
                    hoursPerWeek: Math.max(0, Number(e.target.value)),
                  };
                  setSubjects(next);
                }}
              />
              <label className="mandatory-toggle">
                <input
                  type="checkbox"
                  checked={isMandatory}
                  onChange={(e) => {
                    const next = [...subjects];
                    next[i] = { ...next[i], mandatory: e.target.checked };
                    setSubjects(next);
                  }}
                />
                <span>{t("mandatoryLabel")}</span>
              </label>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSubjects(subjects.filter((_, j) => j !== i))}
                title={t("delete")}
                aria-label={t("delete")}
              >
                ×
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className="add-btn"
          style={{ alignSelf: "flex-start", marginTop: 4 }}
          onClick={() =>
            setSubjects([
              ...subjects,
              { subject: "", hoursPerWeek: 2, mandatory: true },
            ])
          }
        >
          {t("addSubject")}
        </button>
      </div>

      {error && <div className="banner error">{error}</div>}

      <div className="form-actions">
        <button onClick={submit}>{t("saveGradeSubjects")}</button>
        <button className="secondary" onClick={onCancel}>
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
