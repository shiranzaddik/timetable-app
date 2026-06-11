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
  /** Trend names (incl. "" for regular) already used by classes of each grade.
   *  Drives the trend dropdown so users pick from existing trends. */
  trendsByGrade: Record<Grade, string[]>;
  /** teacherId → { classId, className } for teachers already locked in as
   *  another class's homeroom. The form hides those teachers from the
   *  default-teacher dropdown (except the one currently picked for THIS
   *  class). */
  homeroomTeacherToClass: Record<string, { classId: string; className: string }>;
  onSave: (result: ClassFormResult) => void;
  onCancel: () => void;
  /** When provided, edit this class instead of creating a new one. */
  initial?: SchoolClass;
}

const NEW_TREND_SENTINEL = "__new__";

export default function ClassForm({
  teachers,
  existingIds,
  defaultStartHour,
  defaultEndHour,
  trendsByGrade,
  homeroomTeacherToClass,
  onSave,
  onCancel,
  initial,
}: Props) {
  const { t, tGrade, tClassId, tTeacher } = useT();
  const isEdit = !!initial;
  const [grade, setGrade] = useState<Grade>(initial?.grade ?? Grade.A);
  const [section, setSection] = useState<number>(initial?.section ?? 1);
  const [trendName, setTrendName] = useState<string>(initial?.trendName ?? "");
  const [addingNewTrend, setAddingNewTrend] = useState(false);
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
    if (idCollides) return setError(t("errClassExists", { id: tClassId(id) }));
    if (endHour <= startHour)
      return setError(t("errEndHourBeforeStart"));
    // Belt-and-braces: the dropdown already hides occupied teachers, but
    // catch the case where someone edits state out from under us.
    if (defaultTeacherId) {
      const occupied = homeroomTeacherToClass[defaultTeacherId];
      if (occupied && occupied.classId !== initial?.id) {
        return setError(
          t("errTeacherAlreadyHomeroom", {
            className: tClassId(occupied.classId),
          })
        );
      }
    }
    const cleanTrend = trendName.trim().toLowerCase();
    if (addingNewTrend && !cleanTrend) return setError(t("errTrendNameRequired"));
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
        {isEdit ? t("editClass", { id: tClassId(initial!.id) }) : t("newClass")}
      </strong>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div className="form-row">
          <label>{t("fieldGrade")}</label>
          <select
            value={grade}
            onChange={(e) => {
              const next = e.target.value as Grade;
              setGrade(next);
              const available = trendsByGrade[next] ?? [""];
              if (!addingNewTrend && !available.includes(trendName)) {
                setTrendName("");
              }
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
        <select
          value={addingNewTrend ? NEW_TREND_SENTINEL : trendName}
          onChange={(e) => {
            const v = e.target.value;
            if (v === NEW_TREND_SENTINEL) {
              setAddingNewTrend(true);
              setTrendName("");
            } else {
              setAddingNewTrend(false);
              setTrendName(v);
            }
          }}
        >
          {(trendsByGrade[grade] ?? [""]).map((name) => (
            <option key={name || "__regular__"} value={name}>
              {name
                ? `${t("gradeBadgePrefix")} ${tGrade(grade)} · ${name}`
                : `${t("gradeBadgePrefix")} ${tGrade(grade)}`}
            </option>
          ))}
          <option value={NEW_TREND_SENTINEL}>{t("trendAddNew")}</option>
        </select>
        {addingNewTrend && (
          <input
            type="text"
            value={trendName}
            placeholder={t("trendPlaceholder")}
            onChange={(e) => setTrendName(e.target.value)}
            style={{ marginTop: 6 }}
            autoFocus
          />
        )}
        {t("trendSpecializationHint") && (
          <small style={{ color: "var(--text-muted)" }}>
            {t("trendSpecializationHint")}
          </small>
        )}
      </div>

      <div className="form-row">
        <label>{t("fieldDefaultTeacher")}</label>
        <select
          value={defaultTeacherId}
          onChange={(e) => setDefaultTeacherId(e.target.value)}
        >
          <option value="">{t("noDefaultTeacher")}</option>
          {teachers
            .filter((teacher) => {
              const isCurrentSelection = teacher.id === defaultTeacherId;
              if (teacher.canBeDefault === false && !isCurrentSelection) {
                return false;
              }
              // Hide teachers who are already a homeroom of a DIFFERENT class.
              const occupied = homeroomTeacherToClass[teacher.id];
              if (occupied && occupied.classId !== initial?.id && !isCurrentSelection) {
                return false;
              }
              return true;
            })
            .map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {tTeacher(teacher)}
              </option>
            ))}
        </select>
        {t("defaultTeacherNote") && (
          <small style={{ color: "var(--text-muted)" }}>
            {t("defaultTeacherNote")}
          </small>
        )}
      </div>

      <div className="form-row">
        <label>{t("classHoursLabel")}</label>
        <div className="min-hours-card">
          <label className="min-hours-field">
            <span className="min-hours-field-label">{t("classHoursFrom")}</span>
            <input
              type="time"
              value={hourToHHMM(startHour)}
              onChange={(e) => setStartHour(hhmmToHour(e.target.value, startHour))}
              className="min-hours-time"
            />
          </label>
          <span className="min-hours-arrow">-</span>
          <label className="min-hours-field">
            <span className="min-hours-field-label">{t("classHoursTo")}</span>
            <input
              type="time"
              value={hourToHHMM(endHour)}
              onChange={(e) => setEndHour(hhmmToHour(e.target.value, endHour))}
              className="min-hours-time"
            />
          </label>
          <span className="min-hours-total">
            = {formatDuration(Math.max(0, endHour - startHour))}
          </span>
        </div>
        <small style={{ color: "var(--text-muted)" }}>{t("classHoursHint")}</small>
      </div>

      {error && <div className="banner error">{error}</div>}

      <div className="form-actions">
        <button onClick={submit}>
          {isEdit
            ? t("saveChangesToId", { id: tClassId(id) })
            : t("saveClassWithId", { id: tClassId(id) })}
        </button>
        <button className="secondary" onClick={onCancel}>
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}

/** Convert a (possibly fractional) hour to "HH:MM". 8 → "08:00", 8.5 → "08:30". */
function hourToHHMM(hour: number): string {
  const safe = Number.isFinite(hour) ? hour : 0;
  const h = Math.max(0, Math.min(23, Math.floor(safe)));
  const m = Math.max(0, Math.min(59, Math.round((safe - h) * 60)));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Parse "HH:MM" into a fractional hour. Falls back to the previous value
 *  when the string is empty (some browsers fire onChange with "" mid-edit). */
function hhmmToHour(value: string, fallback: number): number {
  if (!value) return fallback;
  const [h, m] = value.split(":").map((n) => Number.parseInt(n, 10));
  if (Number.isNaN(h)) return fallback;
  return h + (Number.isNaN(m) ? 0 : m / 60);
}

/** Render a (fractional) hour count as e.g. "5h 30m" or "5h". */
function formatDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
