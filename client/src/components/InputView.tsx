import { useState } from "react";
import { useT } from "../i18n";
import {
  Grade,
  RoomType,
  type ClassSubject,
  type Room,
  type SchoolClass,
  type SchoolInput,
  type Teacher,
  type UnavailabilityWindow,
} from "../types";
import TeacherForm from "./TeacherForm";
import ClassForm, { type ClassFormResult } from "./ClassForm";
import GradeForm, { defaultGradeSubjects } from "./GradeForm";
import RoomForm from "./RoomForm";

interface Props {
  input: SchoolInput;
  onChange: (next: SchoolInput) => void;
}

export default function InputView({ input, onChange }: Props) {
  const { t, tSubject } = useT();
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [addingClass, setAddingClass] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingTrendKey, setEditingTrendKey] = useState<string | null>(null);
  const [addingRoom, setAddingRoom] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  const teacherById = Object.fromEntries(input.teachers.map((x) => [x.id, x]));

  /** Trend id = grade + optional ":" + trendName (so "A regular" → "A" and
   *  "A science" → "A:science"). Used as a stable grouping key. */
  const trendKeyOf = (grade: Grade, trendName?: string) =>
    trendName ? `${grade}:${trendName}` : `${grade}`;
  const parseTrendKey = (key: string): { grade: Grade; trendName?: string } => {
    const [g, t] = key.split(":");
    return { grade: g as Grade, trendName: t || undefined };
  };

  // Subjects for a (grade, trendName) tuple — taken from any class with that combo.
  const subjectsForTrend = (grade: Grade, trendName?: string): ClassSubject[] => {
    const cls = input.classes.find(
      (c) => c.grade === grade && (c.trendName ?? "") === (trendName ?? "")
    );
    return cls ? cls.subjects : defaultGradeSubjects();
  };

  // Trends that have at least one class, sorted.
  const presentTrendKeys = Array.from(
    new Set(input.classes.map((c) => trendKeyOf(c.grade, c.trendName)))
  ).sort();
  const presentGrades = Array.from(
    new Set(input.classes.map((c) => c.grade))
  ).sort() as Grade[];

  const removeTeacher = (id: string) => {
    if (
      input.classes.some((c) => c.defaultTeacherId === id) &&
      !confirm(t("confirmRemoveTeacher"))
    )
      return;
    onChange({ ...input, teachers: input.teachers.filter((x) => x.id !== id) });
  };

  const removeClass = (id: string) => {
    onChange({
      ...input,
      classes: input.classes.filter((c) => c.id !== id),
      rooms: input.rooms.filter((r) => r.id !== `room-${id}`),
    });
  };

  const addTeacher = (teacher: Teacher) => {
    onChange({ ...input, teachers: [...input.teachers, teacher] });
    setAddingTeacher(false);
  };

  const updateTeacher = (teacher: Teacher) => {
    onChange({
      ...input,
      teachers: input.teachers.map((existing) =>
        existing.id === teacher.id ? teacher : existing
      ),
    });
    setEditingTeacherId(null);
  };

  const addClass = ({ cls }: ClassFormResult) => {
    const fullCls: SchoolClass = {
      ...cls,
      subjects: subjectsForTrend(cls.grade, cls.trendName),
    };
    onChange({ ...input, classes: [...input.classes, fullCls] });
    setAddingClass(false);
  };

  const updateClass = ({ cls }: ClassFormResult) => {
    const oldClass = input.classes.find((x) => x.id === editingClassId);
    if (!oldClass) {
      setEditingClassId(null);
      return;
    }
    const oldKey = trendKeyOf(oldClass.grade, oldClass.trendName);
    const newKey = trendKeyOf(cls.grade, cls.trendName);
    const trendChanged = oldKey !== newKey;
    const subjects = trendChanged
      ? subjectsForTrend(cls.grade, cls.trendName)
      : oldClass.subjects;
    const updatedCls: SchoolClass = { ...cls, subjects };
    onChange({
      ...input,
      classes: input.classes.map((existing) =>
        existing.id === oldClass.id ? updatedCls : existing
      ),
    });
    setEditingClassId(null);
  };

  const addRoom = (room: Room) => {
    onChange({ ...input, rooms: [...input.rooms, room] });
    setAddingRoom(false);
  };

  const updateRoom = (room: Room) => {
    onChange({
      ...input,
      rooms: input.rooms.map((r) => (r.id === room.id ? room : r)),
    });
    setEditingRoomId(null);
  };

  const removeRoom = (id: string) => {
    const inUse = input.classes.some((c) => c.defaultRoomId === id);
    if (inUse && !confirm(t("confirmRemoveRoom"))) return;
    onChange({ ...input, rooms: input.rooms.filter((r) => r.id !== id) });
  };

  const saveTrendSubjects = (
    grade: Grade,
    trendName: string | undefined,
    subjects: ClassSubject[]
  ) => {
    onChange({
      ...input,
      classes: input.classes.map((c) =>
        c.grade === grade && (c.trendName ?? "") === (trendName ?? "")
          ? { ...c, subjects }
          : c
      ),
    });
    setEditingTrendKey(null);
  };

  return (
    <>
      {/* TEACHERS */}
      <div className="section">
        <div className="section-header">
          <div>
            <h3 className="section-title">{t("teachersSection")}</h3>
            <div className="section-meta">
              {input.teachers.length}{" "}
              {input.teachers.length === 1
                ? t("countTeachersOne")
                : t("countTeachersMany")}
            </div>
          </div>
          {!addingTeacher && !editingTeacherId && (
            <button className="add-btn" onClick={() => setAddingTeacher(true)}>
              {t("addTeacher")}
            </button>
          )}
        </div>

        {input.teachers.length === 0 && !addingTeacher && (
          <div className="empty-state">{t("emptyTeachers")}</div>
        )}

        <div className="card-grid">
          {addingTeacher && (
            <TeacherForm
              onSave={addTeacher}
              onCancel={() => setAddingTeacher(false)}
              existingIds={input.teachers.map((teacher) => teacher.id)}
              availableGrades={presentGrades}
            />
          )}
          {input.teachers.map((teacher) =>
            editingTeacherId === teacher.id ? (
              <TeacherForm
                key={teacher.id}
                initial={teacher}
                onSave={updateTeacher}
                onCancel={() => setEditingTeacherId(null)}
                existingIds={input.teachers.map((x) => x.id)}
                availableGrades={presentGrades}
              />
            ) : (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                onEdit={() => setEditingTeacherId(teacher.id)}
                onDelete={() => removeTeacher(teacher.id)}
              />
            )
          )}
        </div>
      </div>

      {/* ROOMS */}
      <div className="section">
        <div className="section-header">
          <div>
            <h3 className="section-title">{t("roomsSection")}</h3>
            <div className="section-meta">
              {input.rooms.length}{" "}
              {input.rooms.length === 1 ? t("countRoomsOne") : t("countRoomsMany")}
            </div>
          </div>
          {!addingRoom && !editingRoomId && (
            <button className="add-btn" onClick={() => setAddingRoom(true)}>
              {t("addRoom")}
            </button>
          )}
        </div>
        {input.rooms.length === 0 && !addingRoom && (
          <div className="empty-state">{t("emptyRooms")}</div>
        )}
        <div className="card-grid">
          {addingRoom && (
            <RoomForm
              onSave={addRoom}
              onCancel={() => setAddingRoom(false)}
              existingIds={input.rooms.map((r) => r.id)}
            />
          )}
          {input.rooms.map((room) =>
            editingRoomId === room.id ? (
              <RoomForm
                key={room.id}
                initial={room}
                onSave={updateRoom}
                onCancel={() => setEditingRoomId(null)}
                existingIds={input.rooms.map((r) => r.id)}
              />
            ) : (
              <RoomCard
                key={room.id}
                room={room}
                onEdit={() => setEditingRoomId(room.id)}
                onDelete={() => removeRoom(room.id)}
              />
            )
          )}
        </div>
      </div>

      {/* TRENDS (subjects per grade + specialization) */}
      {presentTrendKeys.length > 0 && (
        <div className="section">
          <div className="section-header">
            <div>
              <h3 className="section-title">{t("gradesSection")}</h3>
              <div className="section-meta">
                {presentTrendKeys.length}{" "}
                {presentTrendKeys.length === 1
                  ? t("countGradesOne")
                  : t("countGradesMany")}
              </div>
            </div>
          </div>
          <div className="card-grid">
            {presentTrendKeys.map((key) => {
              const { grade, trendName } = parseTrendKey(key);
              const subjects = subjectsForTrend(grade, trendName);
              const classCount = input.classes.filter(
                (c) =>
                  c.grade === grade && (c.trendName ?? "") === (trendName ?? "")
              ).length;
              const label = trendName ? `${grade} ${trendName}` : `${grade}`;
              return editingTrendKey === key ? (
                <GradeForm
                  key={key}
                  grade={grade}
                  trendLabel={label}
                  initialSubjects={subjects}
                  onSave={(s) => saveTrendSubjects(grade, trendName, s)}
                  onCancel={() => setEditingTrendKey(null)}
                />
              ) : (
                <GradeCard
                  key={key}
                  grade={grade}
                  trendLabel={label}
                  subjects={subjects}
                  classCount={classCount}
                  onEdit={() => setEditingTrendKey(key)}
                  tSubject={tSubject}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* CLASSES */}
      <div className="section">
        <div className="section-header">
          <div>
            <h3 className="section-title">{t("classesSection")}</h3>
            <div className="section-meta">
              {input.classes.length}{" "}
              {input.classes.length === 1
                ? t("countClassesOne")
                : t("countClassesMany")}
            </div>
          </div>
          {!addingClass && !editingClassId && (
            <button
              className="add-btn"
              onClick={() => setAddingClass(true)}
              disabled={input.teachers.length === 0}
              title={input.teachers.length === 0 ? t("addTeacherFirst") : ""}
            >
              {t("addClass")}
            </button>
          )}
        </div>

        {input.classes.length === 0 && !addingClass && (
          <div className="empty-state">
            {input.teachers.length === 0
              ? t("emptyClassesNoTeachers")
              : t("emptyClasses")}
          </div>
        )}

        <div className="card-grid">
          {addingClass && (
            <ClassForm
              onSave={addClass}
              onCancel={() => setAddingClass(false)}
              teachers={input.teachers}
              rooms={input.rooms}
              existingIds={input.classes.map((c) => c.id)}
            />
          )}
          {input.classes.map((c) =>
            editingClassId === c.id ? (
              <ClassForm
                key={c.id}
                initial={c}
                teachers={input.teachers}
                rooms={input.rooms}
                existingIds={input.classes.map((x) => x.id)}
                onSave={updateClass}
                onCancel={() => setEditingClassId(null)}
              />
            ) : (
              (() => {
                const room = input.rooms.find((r) => r.id === c.defaultRoomId);
                return (
                  <ClassCard
                    key={c.id}
                    cls={c}
                    defaultTeacherName={
                      c.defaultTeacherId
                        ? teacherById[c.defaultTeacherId]?.name ?? "—"
                        : ""
                    }
                    defaultRoomName={room?.name ?? c.defaultRoomId}
                    defaultRoomType={room?.type}
                    onEdit={() => setEditingClassId(c.id)}
                    onDelete={() => removeClass(c.id)}
                  />
                );
              })()
            )
          )}
        </div>
      </div>
    </>
  );
}

// --- Cards ---

function TeacherCard({
  teacher,
  onEdit,
  onDelete,
}: {
  teacher: Teacher;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, tDay, tSubject } = useT();
  return (
    <div className="card teacher-card compact">
      <div className="head">
        <div className="avatar">{initials(teacher.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="teacher-name">{teacher.name}</p>
          <p className="teacher-role">
            {t("grades")} {teacher.grades.join(", ") || "—"}
          </p>
        </div>
        <div className="card-actions">
          <button
            className="icon-btn"
            onClick={onEdit}
            aria-label={t("edit")}
            title={t("edit")}
          >
            ✎
          </button>
          <button
            className="icon-btn danger"
            onClick={onDelete}
            aria-label={t("delete")}
            title={t("delete")}
          >
            ×
          </button>
        </div>
      </div>

      <div className="row">
        {teacher.subjects.map((s) => (
          <span key={s} className={`tag subj-${s}`}>
            {tSubject(s)}
          </span>
        ))}
      </div>

      <div className="row">
        {teacher.dayOff && (
          <span className="tag warn">
            {t("off")} {tDay(teacher.dayOff)} · {t("cantWork")}
          </span>
        )}
        {teacher.unavailable.map((w, i) => {
          const isSoft = w.hard === false;
          return (
            <span
              key={i}
              className={`tag ${isSoft ? "muted" : "warn"}`}
            >
              {formatWindow(w, tDay, t("allDay"))} · {isSoft ? t("preferNot") : t("cantWork")}
            </span>
          );
        })}
        {teacher.canBeDefault === false && (
          <span className="tag muted">{t("canBeDefaultLabel")}: —</span>
        )}
      </div>
    </div>
  );
}

function GradeCard({
  grade,
  trendLabel,
  subjects,
  classCount,
  onEdit,
  tSubject,
}: {
  grade: Grade;
  trendLabel?: string;
  subjects: ClassSubject[];
  classCount: number;
  onEdit: () => void;
  tSubject: (s: string) => string;
}) {
  const { t } = useT();
  const total = subjects.reduce((s, x) => s + x.hoursPerWeek, 0);
  const title = trendLabel ?? `${grade}`;
  return (
    <div className="card class-card compact">
      <div className="head">
        <div className={`grade-badge grade-${grade}`}>{grade}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="teacher-name">
            {t("gradeBadgePrefix")} {title}
          </p>
          <p className="teacher-role">
            {t("classesInGrade", { n: classCount })} · {total}h / {t("statHours")}
          </p>
        </div>
        <div className="card-actions">
          <button
            className="icon-btn"
            onClick={onEdit}
            aria-label={t("edit")}
            title={t("edit")}
          >
            ✎
          </button>
        </div>
      </div>

      <div className="row">
        {subjects.map((s) => {
          const mandatory = s.mandatory !== false;
          return (
            <span
              key={s.subject}
              className={`tag subj-${s.subject}`}
              style={{ opacity: mandatory ? 1 : 0.55 }}
              title={mandatory ? undefined : t("mandatoryLabel") + ": —"}
            >
              {tSubject(s.subject)} {s.hoursPerWeek}h
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ClassCard({
  cls,
  defaultTeacherName,
  defaultRoomName,
  defaultRoomType,
  onEdit,
  onDelete,
}: {
  cls: SchoolClass;
  defaultTeacherName: string;
  defaultRoomName: string;
  defaultRoomType?: RoomType;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useT();
  const typeLabel =
    defaultRoomType === RoomType.Sport
      ? t("roomTypeSport")
      : defaultRoomType === RoomType.Computer
      ? t("roomTypeComputer")
      : defaultRoomType === RoomType.Music
      ? t("roomTypeMusic")
      : defaultRoomType === RoomType.Regular
      ? t("roomTypeRegular")
      : null;
  const trendLabel = cls.trendName
    ? `${cls.grade} ${cls.trendName}`
    : `${cls.grade}`;
  return (
    <div className="card class-card compact">
      <div className="head">
        <div className={`grade-badge grade-${cls.grade}`}>{cls.id}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="teacher-name">{cls.id}</p>
          <p className="teacher-role">
            {t("gradePrefix")} {trendLabel}
          </p>
        </div>
        <div className="card-actions">
          <button
            className="icon-btn"
            onClick={onEdit}
            aria-label={t("edit")}
            title={t("edit")}
          >
            ✎
          </button>
          <button
            className="icon-btn danger"
            onClick={onDelete}
            aria-label={t("delete")}
            title={t("delete")}
          >
            ×
          </button>
        </div>
      </div>

      <div className="row">
        {defaultTeacherName ? (
          <span className="tag dot">
            {t("teacherLabel")}: {defaultTeacherName}
          </span>
        ) : (
          <span className="tag muted">{t("noDefaultTeacher")}</span>
        )}
        <span className="tag muted">
          {t("roomLabel")}: {defaultRoomName}
          {typeLabel ? ` · ${typeLabel}` : ""}
        </span>
      </div>
    </div>
  );
}

function RoomCard({
  room,
  onEdit,
  onDelete,
}: {
  room: Room;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useT();
  const typeKey =
    room.type === RoomType.Sport
      ? "roomTypeSport"
      : room.type === RoomType.Computer
      ? "roomTypeComputer"
      : room.type === RoomType.Music
      ? "roomTypeMusic"
      : "roomTypeRegular";
  return (
    <div className="card class-card compact">
      <div className="head">
        <div
          className="grade-badge"
          style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
        >
          R
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="teacher-name">{room.name}</p>
        </div>
        <div className="card-actions">
          <button className="icon-btn" onClick={onEdit} title={t("edit")} aria-label={t("edit")}>
            ✎
          </button>
          <button
            className="icon-btn danger"
            onClick={onDelete}
            title={t("delete")}
            aria-label={t("delete")}
          >
            ×
          </button>
        </div>
      </div>

      <div className="row">
        <span className={`tag ${room.type === RoomType.Regular ? "muted" : "warn"}`}>
          {t(typeKey)}
        </span>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatWindow(
  w: UnavailabilityWindow,
  tDay: (d: typeof w.day) => string,
  allDay: string
): string {
  const day = tDay(w.day);
  if (!w.fromTime && !w.toTime) return `${day} ${allDay}`;
  const from = w.fromTime ?? "…";
  const to = w.toTime ?? "…";
  return `${day} ${from}–${to}`;
}
