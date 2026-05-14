import { useState } from "react";
import { useT } from "../i18n";
import {
  RoomType,
  type SchoolClass,
  type SchoolInput,
  type Teacher,
  type UnavailabilityWindow,
} from "../types";
import TeacherForm from "./TeacherForm";
import ClassForm, { type ClassFormResult } from "./ClassForm";

interface Props {
  input: SchoolInput;
  onChange: (next: SchoolInput) => void;
}

export default function InputView({ input, onChange }: Props) {
  const { t } = useT();
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [addingClass, setAddingClass] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  const teacherById = Object.fromEntries(input.teachers.map((x) => [x.id, x]));

  // For each grade, derive the "mandatory" flag per subject from any class in
  // that grade. Used both as the form's default and to propagate edits.
  const gradeMandatoryMap: Record<string, Record<string, boolean>> = {};
  for (const c of input.classes) {
    const m = (gradeMandatoryMap[c.grade] ??= {});
    for (const s of c.subjects) {
      if (!(s.subject in m)) m[s.subject] = s.mandatory !== false;
    }
  }

  /** Propagate a class's subject.mandatory edits to every class in the same grade. */
  const syncMandatoryAcrossGrade = (
    classes: SchoolClass[],
    targetCls: SchoolClass
  ): SchoolClass[] => {
    const targetMandatoryBySubject: Record<string, boolean> = {};
    for (const s of targetCls.subjects) {
      targetMandatoryBySubject[s.subject] = s.mandatory ?? true;
    }
    return classes.map((c) => {
      if (c.grade !== targetCls.grade || c.id === targetCls.id) return c;
      const updatedSubjects = c.subjects.map((s) =>
        s.subject in targetMandatoryBySubject
          ? { ...s, mandatory: targetMandatoryBySubject[s.subject] }
          : s
      );
      return { ...c, subjects: updatedSubjects };
    });
  };

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

  const addTeacher = (t: Teacher) => {
    onChange({ ...input, teachers: [...input.teachers, t] });
    setAddingTeacher(false);
  };

  const updateTeacher = (t: Teacher) => {
    onChange({
      ...input,
      teachers: input.teachers.map((existing) =>
        existing.id === t.id ? t : existing
      ),
    });
    setEditingTeacherId(null);
  };

  const addClass = ({ cls, roomName }: ClassFormResult) => {
    const room = {
      id: `room-${cls.id}`,
      name: roomName,
      type: RoomType.Regular,
    };
    const newCls = { ...cls, defaultRoomId: room.id };
    const synced = syncMandatoryAcrossGrade(input.classes, newCls);
    onChange({
      ...input,
      classes: [...synced, newCls],
      rooms: input.rooms.some((r) => r.id === room.id)
        ? input.rooms.map((r) => (r.id === room.id ? room : r))
        : [...input.rooms, room],
    });
    setAddingClass(false);
  };

  const updateClass = ({ cls, roomName }: ClassFormResult) => {
    const oldClass = input.classes.find((x) => x.id === editingClassId);
    if (!oldClass) {
      setEditingClassId(null);
      return;
    }
    const newRoomId = `room-${cls.id}`;
    const idChanged = oldClass.id !== cls.id;
    let rooms = input.rooms;
    if (idChanged) {
      const oldRoomId = `room-${oldClass.id}`;
      rooms = input.rooms.filter((r) => r.id !== oldRoomId);
    }
    const existingIdx = rooms.findIndex((r) => r.id === newRoomId);
    if (existingIdx >= 0) {
      rooms = rooms.map((r, i) =>
        i === existingIdx ? { ...r, name: roomName } : r
      );
    } else {
      rooms = [
        ...rooms,
        { id: newRoomId, name: roomName, type: RoomType.Regular },
      ];
    }
    const updatedCls = { ...cls, defaultRoomId: newRoomId };
    const classesAfterEdit = input.classes.map((existing) =>
      existing.id === oldClass.id ? updatedCls : existing
    );
    onChange({
      ...input,
      classes: syncMandatoryAcrossGrade(classesAfterEdit, updatedCls),
      rooms,
    });
    setEditingClassId(null);
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
              existingIds={input.teachers.map((t) => t.id)}
            />
          )}
          {input.teachers.map((t) =>
            editingTeacherId === t.id ? (
              <TeacherForm
                key={t.id}
                initial={t}
                onSave={updateTeacher}
                onCancel={() => setEditingTeacherId(null)}
                existingIds={input.teachers.map((x) => x.id)}
              />
            ) : (
              <TeacherCard
                key={t.id}
                teacher={t}
                onEdit={() => setEditingTeacherId(t.id)}
                onDelete={() => removeTeacher(t.id)}
              />
            )
          )}
        </div>
      </div>

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
              existingIds={input.classes.map((c) => c.id)}
            />
          )}
          {input.classes.map((c) =>
            editingClassId === c.id ? (
              <ClassForm
                key={c.id}
                initial={c}
                initialRoomName={
                  input.rooms.find((r) => r.id === c.defaultRoomId)?.name
                }
                teachers={input.teachers}
                existingIds={input.classes.map((x) => x.id)}
                gradeMandatoryBySubject={gradeMandatoryMap[c.grade]}
                onSave={updateClass}
                onCancel={() => setEditingClassId(null)}
              />
            ) : (
              <ClassCard
                key={c.id}
                cls={c}
                defaultTeacherName={
                  c.defaultTeacherId
                    ? teacherById[c.defaultTeacherId]?.name ?? "—"
                    : ""
                }
                defaultRoomName={
                  input.rooms.find((r) => r.id === c.defaultRoomId)?.name ?? c.defaultRoomId
                }
                onEdit={() => setEditingClassId(c.id)}
                onDelete={() => removeClass(c.id)}
              />
            )
          )}
        </div>
      </div>
    </>
  );
}

// --- Read-only cards ---

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
        <span className="tag warn">
          {t("off")} {tDay(teacher.dayOff)}
        </span>
        {teacher.unavailable.map((w, i) => (
          <span key={i} className="tag warn">
            {formatWindow(w, tDay, t("allDay"))}
          </span>
        ))}
      </div>
    </div>
  );
}

function ClassCard({
  cls,
  defaultTeacherName,
  defaultRoomName,
  onEdit,
  onDelete,
}: {
  cls: SchoolClass;
  defaultTeacherName: string;
  defaultRoomName: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, tSubject, tClassName } = useT();
  const totalHours = cls.subjects.reduce((s, x) => s + x.hoursPerWeek, 0);
  return (
    <div className="card class-card compact">
      <div className="head">
        <div className={`grade-badge grade-${cls.grade}`}>{cls.id}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="teacher-name">{tClassName(cls.id)}</p>
          <p className="teacher-role">
            {t("gradePrefix")} {cls.grade} · {totalHours}h / {t("statHours")}
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
        </span>
      </div>

      <div className="row">
        {cls.subjects.map((s) => (
          <span key={s.subject} className={`tag subj-${s.subject}`}>
            {tSubject(s.subject)} · {s.hoursPerWeek}h
          </span>
        ))}
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
