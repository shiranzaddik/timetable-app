import { useState } from "react";
import { useT } from "../i18n";
import { Grade, type SchoolClass, type Teacher } from "../types";

export interface ClassFormResult {
  /** New/edited class meta — subjects are filled in by the parent from the
   *  grade-level template. */
  cls: Omit<SchoolClass, "subjects">;
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
}

export default function ClassForm({
  teachers,
  existingIds,
  onSave,
  onCancel,
  initial,
  initialRoomName,
}: Props) {
  const { t } = useT();
  const isEdit = !!initial;
  const [grade, setGrade] = useState<Grade>(initial?.grade ?? Grade.A);
  const [section, setSection] = useState<number>(initial?.section ?? 1);
  const [defaultTeacherId, setDefaultTeacherId] = useState<string>(
    initial?.defaultTeacherId ?? ""
  );
  const [roomName, setRoomName] = useState<string>(
    initialRoomName ?? `Room ${initial?.id ?? `${Grade.A}1`}`
  );
  const [error, setError] = useState<string | null>(null);

  const id = `${grade}${section}`;
  const idCollides =
    existingIds.includes(id) && (!isEdit || id !== initial?.id);

  const submit = () => {
    if (idCollides) return setError(t("errClassExists", { id }));
    onSave({
      cls: {
        id,
        grade,
        section,
        name: `Class ${id}`,
        defaultTeacherId: defaultTeacherId || null,
        defaultRoomId: `room-${id}`,
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
