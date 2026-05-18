import { useState } from "react";
import { useT } from "../i18n";
import { Subject, type ClassSubject, type Grade } from "../types";

export interface GradeFormResult {
  subjects: ClassSubject[];
}

interface Props {
  grade: Grade;
  /** Specialization name within the grade (e.g., "science"). Undefined = regular. */
  trendName?: string;
  initialSubjects: ClassSubject[];
  onSave: (result: GradeFormResult) => void;
  onCancel: () => void;
}

const WELL_KNOWN_SUBJECTS: string[] = Object.values(Subject);

/** Mirror of the solver's legacy default. Sport and music are short-block
 *  subjects; everything else is paired into 2-hour blocks. */
const ONE_HOUR_SUBJECTS = new Set<string>([Subject.Sport, Subject.Music]);

function effectiveBlockSize(row: ClassSubject): 1 | 2 {
  if (row.blockSize === 1 || row.blockSize === 2) return row.blockSize;
  return ONE_HOUR_SUBJECTS.has(row.subject) ? 1 : 2;
}

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
  onSave,
  onCancel,
}: Props) {
  const { t, tSubject } = useT();
  const [subjects, setSubjects] = useState<ClassSubject[]>(initialSubjects);
  const [error, setError] = useState<string | null>(null);
  const headerLabel = trendName ? `${grade} · ${trendName}` : `${grade}`;

  const submit = () => {
    const filtered = subjects
      .map((s) => ({
        subject: s.subject.trim().toLowerCase(),
        hoursPerWeek: s.hoursPerWeek,
        mandatory: s.mandatory ?? true,
        blockSize: effectiveBlockSize(s),
      }))
      .filter((s) => s.subject !== "" && s.hoursPerWeek > 0);
    if (filtered.length === 0) return setError(t("errSetHours"));
    onSave({ subjects: filtered });
  };

  return (
    <div className="form-card">
      <strong style={{ fontSize: 14 }}>
        {t("editGradeSubjects", { grade: headerLabel })}
      </strong>

      <div className="form-row">
        <label>{t("fieldSubjectsHours")}</label>
        {subjects.map((row, i) => {
          const isMandatory = row.mandatory ?? true;
          // Subjects keep an editable name only while the row is still empty
          // (i.e., the user just clicked "+ Add subject" and hasn't typed yet).
          // Once a name is set — whether a built-in like "math" or a custom
          // like "art" — show it as a read-only label so every row looks the
          // same. To rename, delete the row and re-add it.
          const isNew = row.subject.trim() === "";
          return (
            <div key={i} className="subject-hours-row mandatory-row">
              {isNew ? (
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
              ) : (
                <span
                  style={{
                    textTransform: "capitalize",
                    fontSize: 13,
                    alignSelf: "center",
                  }}
                >
                  {tSubject(row.subject)}
                </span>
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
              <label className="block-size-control" title={t("blockSizeHint")}>
                <span>{t("blockSizeLabel")}</span>
                <select
                  value={effectiveBlockSize(row)}
                  onChange={(e) => {
                    const next = [...subjects];
                    next[i] = {
                      ...next[i],
                      blockSize: Number(e.target.value) as 1 | 2,
                    };
                    setSubjects(next);
                  }}
                >
                  <option value={1}>1h</option>
                  <option value={2}>2h</option>
                </select>
              </label>
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
