import { useState } from "react";
import { useT } from "../i18n";
import { Grade, type SchoolClass, type Teacher } from "../types";

export interface ClassFormResult {
  /** New/edited class meta — subjects are filled in by the parent from the
   *  grade-level template. */
  cls: Omit<SchoolClass, "subjects">;
}

interface Props {
  teachers: Teacher[];
  existingIds: string[];
  /** Global default school day; used when this class doesn't override. */
  defaultStartHour: number;
  defaultEndHour: number;
  onSave: (result: ClassFormResult) => void;
  onCancel: () => void;
  /** When provided, edit this class instead of creating a new one. */
  initial?: SchoolClass;
}

export default function ClassForm({
  teachers,
  existingIds,
  defaultStartHour,
  defaultEndHour,
  onSave,
  onCancel,
  initial,
}: Props) {
  const { t } = useT();
  const isEdit = !!initial;
  const [grade, setGrade] = useState<Grade>(initial?.grade ?? Grade.A);
  const [section, setSection] = useState<number>(initial?.section ?? 1);
  const [trendName, setTrendName] = useState<string>(initial?.trendName ?? "");
  const [defaultTeacherId, setDefaultTeacherId] = useState<string>(
    initial?.defaultTeacherId ?? ""
  );
  const [startHour, setStartHour] = useState<number>(
    initial?.startHour ?? defaultStartHour
  );
  const [endHour, setEndHour] = useState<number>(
    initial?.endHour ?? defaultEndHour
  );
  const [error, setError] = useState<string | null>(null);

  const id = `${grade}${section}`;
  const idCollides =
    existingIds.includes(id) && (!isEdit || id !== initial?.id);
  // Room is always derived from the class id — one per class.
  const defaultRoomId = `room-${id}`;

  const submit = () => {
    if (idCollides) return setError(t("errClassExists", { id }));
    if (endHour <= startHour)
      return setError(t("errEndHourBeforeStart"));
    const cleanTrend = trendName.trim().toLowerCase();
    onSave({
      cls: {
        id,
        grade,
        section,
        trendName: cleanTrend || undefined,
        name: id, // the class IS its id (e.g., "A1")
        defaultTeacherId: defaultTeacherId || null,
        defaultRoomId,
        startHour: startHour === defaultStartHour ? undefined : startHour,
        endHour: endHour === defaultEndHour ? undefined : endHour,
      },
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
        <label>{t("fieldTrendSpecialization")}</label>
        <input
          type="text"
          value={trendName}
          placeholder={t("trendPlaceholder")}
          onChange={(e) => setTrendName(e.target.value)}
        />
        <small style={{ color: "var(--text-muted)" }}>
          {t("trendSpecializationHint")}
        </small>
      </div>

      <div className="form-row">
        <label>{t("fieldDefaultTeacher")}</label>
        <select
          value={defaultTeacherId}
          onChange={(e) => setDefaultTeacherId(e.target.value)}
        >
          <option value="">{t("noDefaultTeacher")}</option>
          {teachers
            .filter(
              (teacher) =>
                teacher.canBeDefault !== false ||
                teacher.id === defaultTeacherId
            )
            .map((teacher) => (
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
        <label>{t("classHoursLabel")}</label>
        <div className="min-hours-card">
          <label className="min-hours-field">
            <span className="min-hours-field-label">{t("classHoursFrom")}</span>
            <div className="min-hours-input">
              <input
                type="number"
                min={0}
                max={23}
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
              />
              <span className="min-hours-suffix">:00</span>
            </div>
          </label>
          <span className="min-hours-arrow">→</span>
          <label className="min-hours-field">
            <span className="min-hours-field-label">{t("classHoursTo")}</span>
            <div className="min-hours-input">
              <input
                type="number"
                min={1}
                max={24}
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
              />
              <span className="min-hours-suffix">:00</span>
            </div>
          </label>
          <span className="min-hours-total">
            = {Math.max(0, endHour - startHour)}h
          </span>
        </div>
        <small style={{ color: "var(--text-muted)" }}>{t("classHoursHint")}</small>
      </div>

      <div className="form-row">
        <label>{t("fieldRoomName")}</label>
        <small style={{ color: "var(--text-muted)" }}>
          {t("roomAutoLinked", { roomName: `Room ${id}` })}
        </small>
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
