import { useState } from "react";
import {
  RoomType,
  type SchoolClass,
  type SchoolInput,
  type Teacher,
  type UnavailabilityWindow,
} from "../types";
import TeacherForm from "./TeacherForm";
import ClassForm from "./ClassForm";

interface Props {
  input: SchoolInput;
  onChange: (next: SchoolInput) => void;
}

export default function InputView({ input, onChange }: Props) {
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [addingClass, setAddingClass] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  const teacherById = Object.fromEntries(input.teachers.map((t) => [t.id, t]));

  const removeTeacher = (id: string) => {
    if (
      input.classes.some((c) => c.defaultTeacherId === id) &&
      !confirm(
        "This teacher is the default teacher for one or more classes. Remove anyway?"
      )
    )
      return;
    onChange({ ...input, teachers: input.teachers.filter((t) => t.id !== id) });
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

  const addClass = (c: SchoolClass) => {
    const room = { id: `room-${c.id}`, name: `Room ${c.id}`, type: RoomType.Regular };
    onChange({
      ...input,
      classes: [...input.classes, { ...c, defaultRoomId: room.id }],
      rooms: input.rooms.some((r) => r.id === room.id)
        ? input.rooms
        : [...input.rooms, room],
    });
    setAddingClass(false);
  };

  const updateClass = (c: SchoolClass) => {
    const oldClass = input.classes.find((x) => x.id === editingClassId);
    if (!oldClass) {
      setEditingClassId(null);
      return;
    }
    // If the id changed (grade or section), swap the per-class room too.
    const idChanged = oldClass.id !== c.id;
    let rooms = input.rooms;
    if (idChanged) {
      const oldRoomId = `room-${oldClass.id}`;
      const newRoomId = `room-${c.id}`;
      rooms = input.rooms.filter((r) => r.id !== oldRoomId);
      if (!rooms.some((r) => r.id === newRoomId)) {
        rooms = [
          ...rooms,
          { id: newRoomId, name: `Room ${c.id}`, type: RoomType.Regular },
        ];
      }
    }
    onChange({
      ...input,
      classes: input.classes.map((existing) =>
        existing.id === oldClass.id ? { ...c, defaultRoomId: `room-${c.id}` } : existing
      ),
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
            <h3 className="section-title">Teachers</h3>
            <div className="section-meta">
              {input.teachers.length}{" "}
              {input.teachers.length === 1 ? "teacher" : "teachers"}
            </div>
          </div>
          {!addingTeacher && !editingTeacherId && (
            <button className="add-btn" onClick={() => setAddingTeacher(true)}>
              + Add teacher
            </button>
          )}
        </div>

        {input.teachers.length === 0 && !addingTeacher && (
          <div className="empty-state">
            No teachers yet. Click <strong>+ Add teacher</strong> to start.
          </div>
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
            <h3 className="section-title">Classes</h3>
            <div className="section-meta">
              {input.classes.length}{" "}
              {input.classes.length === 1 ? "class" : "classes"}
            </div>
          </div>
          {!addingClass && !editingClassId && (
            <button
              className="add-btn"
              onClick={() => setAddingClass(true)}
              disabled={input.teachers.length === 0}
              title={
                input.teachers.length === 0 ? "Add at least one teacher first" : ""
              }
            >
              + Add class
            </button>
          )}
        </div>

        {input.classes.length === 0 && !addingClass && (
          <div className="empty-state">
            {input.teachers.length === 0
              ? "Add at least one teacher first, then add classes."
              : "No classes yet. Click + Add class to create the first one."}
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
                teachers={input.teachers}
                existingIds={input.classes.map((x) => x.id)}
                onSave={updateClass}
                onCancel={() => setEditingClassId(null)}
              />
            ) : (
              <ClassCard
                key={c.id}
                cls={c}
                defaultTeacherName={teacherById[c.defaultTeacherId]?.name ?? "—"}
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
  return (
    <div className="card teacher-card compact">
      <div className="head">
        <div className="avatar">{initials(teacher.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="teacher-name">{teacher.name}</p>
          <p className="teacher-role">Grades {teacher.grades.join(", ") || "—"}</p>
        </div>
        <div className="card-actions">
          <button
            className="icon-btn"
            onClick={onEdit}
            aria-label={`Edit ${teacher.name}`}
            title="Edit"
          >
            ✎
          </button>
          <button
            className="icon-btn danger"
            onClick={onDelete}
            aria-label={`Delete ${teacher.name}`}
            title="Delete"
          >
            ×
          </button>
        </div>
      </div>

      <div className="row">
        {teacher.subjects.map((s) => (
          <span key={s} className={`tag subj-${s}`}>
            {s}
          </span>
        ))}
      </div>

      <div className="row">
        <span className="tag warn">Off {teacher.dayOff}</span>
        {teacher.unavailable.map((w, i) => (
          <span key={i} className="tag warn">
            {formatWindow(w)}
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
  const totalHours = cls.subjects.reduce((s, x) => s + x.hoursPerWeek, 0);
  return (
    <div className="card class-card compact">
      <div className="head">
        <div className={`grade-badge grade-${cls.grade}`}>{cls.id}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="teacher-name">{cls.name}</p>
          <p className="teacher-role">
            Grade {cls.grade} · {totalHours}h / week
          </p>
        </div>
        <div className="card-actions">
          <button
            className="icon-btn"
            onClick={onEdit}
            aria-label={`Edit ${cls.name}`}
            title="Edit"
          >
            ✎
          </button>
          <button
            className="icon-btn danger"
            onClick={onDelete}
            aria-label={`Delete ${cls.name}`}
            title="Delete"
          >
            ×
          </button>
        </div>
      </div>

      <div className="row">
        <span className="tag dot">Teacher: {defaultTeacherName}</span>
        <span className="tag muted">Room: {defaultRoomName}</span>
      </div>

      <div className="row">
        {cls.subjects.map((s) => (
          <span key={s.subject} className={`tag subj-${s.subject}`}>
            {s.subject} · {s.hoursPerWeek}h
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

function formatWindow(w: UnavailabilityWindow): string {
  if (!w.fromTime && !w.toTime) return `${w.day} all day`;
  const from = w.fromTime ?? "start";
  const to = w.toTime ?? "end";
  return `${w.day} ${from}–${to}`;
}
