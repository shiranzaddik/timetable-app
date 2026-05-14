import { useState } from "react";
import { useT } from "../i18n";
import {
  Grade,
  RoomType,
  type ClassSubject,
  type SchoolClass,
  type SchoolInput,
  type Teacher,
  type UnavailabilityWindow,
} from "../types";
import TeacherForm from "./TeacherForm";
import ClassForm, { type ClassFormResult } from "./ClassForm";
import GradeForm, { defaultGradeSubjects } from "./GradeForm";

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
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);

  const teacherById = Object.fromEntries(input.teachers.map((x) => [x.id, x]));

  // Subjects per grade — taken from any class of that grade.
  const subjectsForGrade = (grade: Grade): ClassSubject[] => {
    const cls = input.classes.find((c) => c.grade === grade);
    return cls ? cls.subjects : defaultGradeSubjects();
  };

  // Grades that have at least one class, in alphabetical order.
  const presentGrades = Array.from(
    new Set(input.classes.map((c) => c.grade))
  ).sort();

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

  const addClass = ({ cls, roomName }: ClassFormResult) => {
    const room = {
      id: `room-${cls.id}`,
      name: roomName,
      type: RoomType.Regular,
    };
    const fullCls: SchoolClass = {
      ...cls,
      defaultRoomId: room.id,
      subjects: subjectsForGrade(cls.grade),
    };
    onChange({
      ...input,
      classes: [...input.classes, fullCls],
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
    const gradeChanged = oldClass.grade !== cls.grade;
    const subjects = gradeChanged
      ? subjectsForGrade(cls.grade)
      : oldClass.subjects;
    const updatedCls: SchoolClass = {
      ...cls,
      defaultRoomId: newRoomId,
      subjects,
    };
    onChange({
      ...input,
      classes: input.classes.map((existing) =>
        existing.id === oldClass.id ? updatedCls : existing
      ),
      rooms,
    });
    setEditingClassId(null);
  };

  const saveGradeSubjects = (grade: Grade, subjects: ClassSubject[]) => {
    onChange({
      ...input,
      classes: input.classes.map((c) =>
        c.grade === grade ? { ...c, subjects } : c
      ),
    });
    setEditingGrade(null);
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

      {/* GRADES (subjects) */}
      {presentGrades.length > 0 && (
        <div className="section">
          <div className="section-header">
            <div>
              <h3 className="section-title">{t("gradesSection")}</h3>
              <div className="section-meta">
                {presentGrades.length}{" "}
                {presentGrades.length === 1
                  ? t("countGradesOne")
                  : t("countGradesMany")}
              </div>
            </div>
          </div>
          <div className="card-grid">
            {presentGrades.map((grade) =>
              editingGrade === grade ? (
                <GradeForm
                  key={grade}
                  grade={grade}
                  initialSubjects={subjectsForGrade(grade)}
                  onSave={(subjects) => saveGradeSubjects(grade, subjects)}
                  onCancel={() => setEditingGrade(null)}
                />
              ) : (
                <GradeCard
                  key={grade}
                  grade={grade}
                  subjects={subjectsForGrade(grade)}
                  classCount={input.classes.filter((c) => c.grade === grade).length}
                  onEdit={() => setEditingGrade(grade)}
                  tSubject={tSubject}
                />
              )
            )}
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
                  input.rooms.find((r) => r.id === c.defaultRoomId)?.name ??
                  c.defaultRoomId
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

function GradeCard({
  grade,
  subjects,
  classCount,
  onEdit,
  tSubject,
}: {
  grade: Grade;
  subjects: ClassSubject[];
  classCount: number;
  onEdit: () => void;
  tSubject: (s: string) => string;
}) {
  const { t } = useT();
  const total = subjects.reduce((s, x) => s + x.hoursPerWeek, 0);
  return (
    <div className="card class-card compact">
      <div className="head">
        <div className={`grade-badge grade-${grade}`}>{grade}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="teacher-name">
            {t("gradeBadgePrefix")} {grade}
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
              {tSubject(s.subject)} · {s.hoursPerWeek}h
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
  onEdit,
  onDelete,
}: {
  cls: SchoolClass;
  defaultTeacherName: string;
  defaultRoomName: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, tClassName } = useT();
  return (
    <div className="card class-card compact">
      <div className="head">
        <div className={`grade-badge grade-${cls.grade}`}>{cls.id}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="teacher-name">{tClassName(cls.id)}</p>
          <p className="teacher-role">
            {t("gradePrefix")} {cls.grade}
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
