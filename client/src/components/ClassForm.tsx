import { useState } from "react";
import { useT } from "../i18n";
import {
  Grade,
  RoomType,
  type Room,
  type SchoolClass,
  type Teacher,
} from "../types";

const ROOM_TYPE_LABEL_KEY: Record<
  RoomType,
  "roomTypeRegular" | "roomTypeSport" | "roomTypeComputer" | "roomTypeMusic"
> = {
  [RoomType.Regular]: "roomTypeRegular",
  [RoomType.Sport]: "roomTypeSport",
  [RoomType.Computer]: "roomTypeComputer",
  [RoomType.Music]: "roomTypeMusic",
};

export interface ClassFormResult {
  /** New/edited class meta — subjects are filled in by the parent from the
   *  grade-level template. */
  cls: Omit<SchoolClass, "subjects">;
}

interface Props {
  teachers: Teacher[];
  rooms: Room[];
  existingIds: string[];
  onSave: (result: ClassFormResult) => void;
  onCancel: () => void;
  /** When provided, edit this class instead of creating a new one. */
  initial?: SchoolClass;
}

export default function ClassForm({
  teachers,
  rooms,
  existingIds,
  onSave,
  onCancel,
  initial,
}: Props) {
  const { t } = useT();
  const isEdit = !!initial;
  const [grade, setGrade] = useState<Grade>(initial?.grade ?? Grade.A);
  const [section, setSection] = useState<number>(initial?.section ?? 1);
  const [defaultTeacherId, setDefaultTeacherId] = useState<string>(
    initial?.defaultTeacherId ?? ""
  );

  const regularRooms = rooms.filter((r) => r.type === RoomType.Regular);
  const [defaultRoomId, setDefaultRoomId] = useState<string>(
    initial?.defaultRoomId ?? regularRooms[0]?.id ?? ""
  );

  const [error, setError] = useState<string | null>(null);

  const id = `${grade}${section}`;
  const idCollides =
    existingIds.includes(id) && (!isEdit || id !== initial?.id);

  const submit = () => {
    if (idCollides) return setError(t("errClassExists", { id }));
    if (!defaultRoomId) return setError(t("addRoomsFirst"));
    onSave({
      cls: {
        id,
        grade,
        section,
        name: `Class ${id}`,
        defaultTeacherId: defaultTeacherId || null,
        defaultRoomId,
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
        {regularRooms.length === 0 ? (
          <div className="banner error" style={{ fontSize: 12 }}>
            {t("addRoomsFirst")}
          </div>
        ) : (
          <select
            value={defaultRoomId}
            onChange={(e) => setDefaultRoomId(e.target.value)}
          >
            <option value="" disabled>
              {t("pickRoom")}
            </option>
            {regularRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {t(ROOM_TYPE_LABEL_KEY[r.type])}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <div className="banner error">{error}</div>}

      <div className="form-actions">
        <button onClick={submit} disabled={regularRooms.length === 0}>
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
