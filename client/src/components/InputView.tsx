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
  const [addingClass, setAddingClass] = useState(false);
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
          {!addingTeacher && (
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
          {input.teachers.map((t) => (
            <TeacherCard
              key={t.id}
              teacher={t}
              onDelete={() => removeTeacher(t.id)}
            />
          ))}
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
          {!addingClass && (
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
          {input.classes.map((c) => (
            <ClassCard
              key={c.id}
              cls={c}
              defaultTeacherName={teacherById[c.defaultTeacherId]?.name ?? "—"}
              defaultRoomName={
                input.rooms.find((r) => r.id === c.defaultRoomId)?.name ?? c.defaultRoomId
              }
              onDelete={() => removeClass(c.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// --- Read-only cards ---

function TeacherCard({
  teacher,
  onDelete,
}: {
  teacher: Teacher;
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
        <button
          className="icon-btn"
          onClick={onDelete}
          aria-label={`Delete ${teacher.name}`}
        >
          ×
        </button>
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
  onDelete,
}: {
  cls: SchoolClass;
  defaultTeacherName: string;
  defaultRoomName: string;
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
        <button
          className="icon-btn"
          onClick={onDelete}
          aria-label={`Delete ${cls.name}`}
        >
          ×
        </button>
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

