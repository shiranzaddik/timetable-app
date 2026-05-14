import { useState } from "react";
import { useT } from "../i18n";
import {
  Grade,
  Subject,
  type ClassSubject,
  type SchoolClass,
  type Teacher,
} from "../types";

export interface ClassFormResult {
  cls: SchoolClass;
  roomName: string;
}

interface Props {
  teachers: Teacher[];
  existingIds: string[];
  onSave: (result: ClassFormResult) => void;
  onCancel: () => void;
  /** When provided, edit this class instead of creating a new one. */
  initial?: SchoolClass;
  /** Existing display name of the class's room (for editing). */
  initialRoomName?: string;
  /** Mandatory flags for the current grade, keyed by subject. The parent
   *  uses these so toggling mandatory in one class applies to all
   *  classes of the same grade. */
  gradeMandatoryBySubject?: Record<string, boolean>;
}

const DEFAULT_HOURS: Record<string, number> = {
  [Subject.Math]: 4,
  [Subject.Hebrew]: 4,
  [Subject.English]: 4,
  [Subject.Science]: 2,
  [Subject.Sport]: 2,
  [Subject.Music]: 1,
  [Subject.Computer]: 2,
};

const WELL_KNOWN_SUBJECTS: string[] = Object.values(Subject);

export default function ClassForm({
  teachers,
  existingIds,
  onSave,
  onCancel,
  initial,
  initialRoomName,
  gradeMandatoryBySubject,
}: Props) {
  const { t, tSubject } = useT();
  const isEdit = !!initial;
  const [grade, setGrade] = useState<Grade>(initial?.grade ?? Grade.A);
  const [section, setSection] = useState<number>(initial?.section ?? 1);
  const [defaultTeacherId, setDefaultTeacherId] = useState<string>(
    initial?.defaultTeacherId ?? ""
  );
  const [roomName, setRoomName] = useState<string>(
    initialRoomName ?? `Room ${initial?.id ?? `${Grade.A}1`}`
  );
  const [subjects, setSubjects] = useState<ClassSubject[]>(() => {
    const base =
      initial?.subjects ??
      WELL_KNOWN_SUBJECTS.map((s) => ({
        subject: s,
        hoursPerWeek: DEFAULT_HOURS[s] ?? 0,
        mandatory: true,
      }));
    // For each row, fall back to grade-wide mandatory flag if defined.
    return base.map((row) => ({
      ...row,
      mandatory:
        row.mandatory ??
        gradeMandatoryBySubject?.[row.subject] ??
        true,
    }));
  });
  const [error, setError] = useState<string | null>(null);

  const id = `${grade}${section}`;
  const idCollides =
    existingIds.includes(id) && (!isEdit || id !== initial?.id);

  const submit = () => {
    if (idCollides) return setError(t("errClassExists", { id }));
    const filtered = subjects
      .map((s) => ({
        subject: s.subject.trim().toLowerCase(),
        hoursPerWeek: s.hoursPerWeek,
        mandatory: s.mandatory ?? true,
      }))
      .filter((s) => s.subject !== "" && s.hoursPerWeek > 0);
    if (filtered.length === 0) return setError(t("errSetHours"));
    onSave({
      cls: {
        id,
        grade,
        section,
        name: `Class ${id}`,
        defaultTeacherId: defaultTeacherId || null,
        defaultRoomId: `room-${id}`,
        subjects: filtered,
      },
      roomName: roomName.trim() || `Room ${id}`,
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
          <option value="">{t("noDefaultTeacher")}</option>
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
        <label>{t("fieldRoomName")}</label>
        <input
          type="text"
          value={roomName}
          placeholder={t("roomPlaceholder")}
          onChange={(e) => setRoomName(e.target.value)}
        />
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
              <label
                className="mandatory-toggle"
                title={t("mandatoryGradeNote")}
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
        <small style={{ color: "var(--text-muted)" }}>
          {t("mandatoryGradeNote")}
        </small>
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
