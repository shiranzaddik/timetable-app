import { useState } from "react";
import { useT } from "../i18n";
import { RoomType, type Room } from "../types";

interface Props {
  onSave: (room: Room) => void;
  onCancel: () => void;
  existingIds: string[];
  initial?: Room;
}

const ROOM_TYPE_KEYS: Record<RoomType, "roomTypeRegular" | "roomTypeSport" | "roomTypeComputer" | "roomTypeMusic"> = {
  [RoomType.Regular]: "roomTypeRegular",
  [RoomType.Sport]: "roomTypeSport",
  [RoomType.Computer]: "roomTypeComputer",
  [RoomType.Music]: "roomTypeMusic",
};

export default function RoomForm({
  onSave,
  onCancel,
  existingIds,
  initial,
}: Props) {
  const { t } = useT();
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<RoomType>(initial?.type ?? RoomType.Regular);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return setError(t("errNameRequired"));
    const id = isEdit ? initial!.id : makeId(trimmed, existingIds);
    onSave({ id, name: trimmed, type });
  };

  return (
    <div className="form-card">
      <strong style={{ fontSize: 14 }}>{isEdit ? t("editRoom") : t("newRoom")}</strong>

      <div className="form-row">
        <label>{t("fieldName")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("roomPlaceholder")}
        />
      </div>

      <div className="form-row">
        <label>{t("fieldRoomType")}</label>
        <select value={type} onChange={(e) => setType(e.target.value as RoomType)}>
          {Object.values(RoomType).map((rt) => (
            <option key={rt} value={rt}>
              {t(ROOM_TYPE_KEYS[rt])}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="banner error">{error}</div>}

      <div className="form-actions">
        <button onClick={submit}>{t("saveRoom")}</button>
        <button className="secondary" onClick={onCancel}>
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}

function makeId(name: string, existing: string[]): string {
  const base =
    "room-" +
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  let id = base || `room-${Date.now()}`;
  let n = 2;
  while (existing.includes(id)) id = `${base}-${n++}`;
  return id;
}
