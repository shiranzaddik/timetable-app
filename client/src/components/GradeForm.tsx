import { useState } from "react";
import { useT } from "../i18n";
import { Grade, Subject, type ClassSubject, type SubjectDef } from "../types";

export interface GradeFormResult {
  subjects: ClassSubject[];
  /** Set only when the form is in "new" mode — see Props.mode. */
  grade?: Grade;
  trendName?: string;
}

interface Props {
  grade: Grade;
  /** Specialization name within the grade (e.g., "science"). Undefined = regular. */
  trendName?: string;
  initialSubjects: ClassSubject[];
  /** Subject catalogue (school-level). Each row's subject dropdown picks
   *  from this list. */
  availableSubjects: SubjectDef[];
  /** When "new", the form also surfaces a grade dropdown + trend-name input
   *  so the user picks grade/name and subjects in a single step. When
   *  omitted/"edit", grade and trendName are locked. */
  mode?: "new" | "edit";
  /** Used in "new" mode to refuse duplicate (grade + trendName) keys. */
  existingTrendKeys?: string[];
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
  availableSubjects,
  mode = "edit",
  existingTrendKeys,
  onSave,
  onCancel,
}: Props) {
  const { t, tSubject, tGrade } = useT();
  const isNew = mode === "new";
  const [gradeState, setGradeState] = useState<Grade>(grade);
  const [trendNameState, setTrendNameState] = useState<string>(trendName ?? "");
  const [subjects, setSubjects] = useState<ClassSubject[]>(initialSubjects);
  const [error, setError] = useState<string | null>(null);
  const headerLabel = isNew
    ? t("newTrend")
    : trendName
    ? `${tGrade(grade)} · ${trendName}`
    : `${tGrade(grade)}`;

  const submit = () => {
    if (isNew) {
      const cleanName = trendNameState.trim().toLowerCase() || undefined;
      const key = cleanName ? `${gradeState}:${cleanName}` : `${gradeState}`;
      if (existingTrendKeys?.includes(key)) {
        return setError(t("trendExistsAlready"));
      }
    }
    const filtered = subjects
      .map((s) => ({
        subject: s.subject.trim().toLowerCase(),
        hoursPerWeek: s.hoursPerWeek,
        mandatory: s.mandatory ?? true,
        blockSize: effectiveBlockSize(s),
      }))
      .filter((s) => s.subject !== "" && s.hoursPerWeek > 0);
    if (filtered.length === 0) return setError(t("errSetHours"));
    // Refuse two rows that resolved to the same subject name.
    const seen = new Set<string>();
    for (const s of filtered) {
      if (seen.has(s.subject)) {
        return setError(t("errSubjectDuplicate", { name: s.subject }));
      }
      seen.add(s.subject);
    }
    onSave(
      isNew
        ? {
            subjects: filtered,
            grade: gradeState,
            trendName: trendNameState.trim().toLowerCase() || undefined,
          }
        : { subjects: filtered }
    );
  };

  return (
    <div className="form-card">
      <strong style={{ fontSize: 14 }}>
        {isNew
          ? headerLabel
          : t("editGradeSubjects", { grade: headerLabel })}
      </strong>

      {isNew && (
        <>
          <div className="form-row">
            <label>{t("fieldTrendGrade")}</label>
            <select
              value={gradeState}
              onChange={(e) => {
                setGradeState(e.target.value as Grade);
                setError(null);
              }}
            >
              {Object.values(Grade).map((g) => (
                <option key={g} value={g}>
                  {tGrade(g)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>{t("fieldTrendNameOptional")}</label>
            <input
              type="text"
              value={trendNameState}
              placeholder={t("trendPlaceholder")}
              onChange={(e) => {
                setTrendNameState(e.target.value);
                setError(null);
              }}
            />
          </div>
        </>
      )}

      <div className="form-row">
        <label>{t("fieldSubjectsHours")}</label>
        {subjects.map((row, i) => {
          const isMandatory = row.mandatory ?? true;
          // Subjects already used in *other* rows are hidden from this row's
          // dropdown so the user can't accidentally pick the same subject
          // twice. The current row's own selection stays visible.
          const usedElsewhere = new Set(
            subjects.filter((_, j) => j !== i).map((s) => s.subject).filter(Boolean)
          );
          return (
            <div key={i} className="subject-hours-row mandatory-row">
              <select
                value={row.subject}
                onChange={(e) => {
                  const next = [...subjects];
                  next[i] = { ...next[i], subject: e.target.value };
                  setSubjects(next);
                }}
              >
                <option value="">{t("subjectPlaceholder")}</option>
                {availableSubjects
                  .filter((def) => !usedElsewhere.has(def.key) || def.key === row.subject)
                  .map((def) => (
                    <option key={def.key} value={def.key}>
                      {tSubject(def.key)}
                    </option>
                  ))}
              </select>
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
              <label
                className={`mandatory-toggle ${isMandatory ? "on" : ""}`}
              >
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
        <button onClick={submit}>
          {isNew ? t("saveTrend") : t("saveGradeSubjects")}
        </button>
        <button className="secondary" onClick={onCancel}>
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
