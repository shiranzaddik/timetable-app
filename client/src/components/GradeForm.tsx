import { useState } from "react";
import { useT } from "../i18n";
import { Subject, type ClassSubject, type Grade } from "../types";

interface Props {
  grade: Grade;
  initialSubjects: ClassSubject[];
  onSave: (subjects: ClassSubject[]) => void;
  onCancel: () => void;
}

const WELL_KNOWN_SUBJECTS: string[] = Object.values(Subject);

const DEFAULT_HOURS: Record<string, number> = {
  [Subject.Math]: 2,
  [Subject.Hebrew]: 2,
  [Subject.English]: 2,
  [Subject.Science]: 2,
  [Subject.Sport]: 1,
  [Subject.Music]: 1,
  [Subject.Computer]: 2,
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
  initialSubjects,
  onSave,
  onCancel,
}: Props) {
  const { t, tSubject } = useT();
  const [subjects, setSubjects] = useState<ClassSubject[]>(initialSubjects);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const filtered = subjects
      .map((s) => ({
        subject: s.subject.trim().toLowerCase(),
        hoursPerWeek: s.hoursPerWeek,
        mandatory: s.mandatory ?? true,
      }))
      .filter((s) => s.subject !== "" && s.hoursPerWeek > 0);
    if (filtered.length === 0) return setError(t("errSetHours"));
    onSave(filtered);
  };

  return (
    <div className="form-card">
      <strong style={{ fontSize: 14 }}>
        {t("editGradeSubjects", { grade })}
      </strong>

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
