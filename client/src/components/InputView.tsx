import { useState } from "react";
import { useT } from "../i18n";
import {
  Grade,
  RoomType,
  type ClassSubject,
  type Room,
  type SchoolClass,
  type SchoolInput,
  type SubjectDef,
  type Teacher,
  type Trend,
  type UnavailabilityWindow,
} from "../types";
import TeacherForm, { type TrendChoice } from "./TeacherForm";
import ClassForm, { type ClassFormResult } from "./ClassForm";
import GradeForm, { defaultGradeSubjects, type GradeFormResult } from "./GradeForm";
import SubjectForm from "./SubjectForm";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  input: SchoolInput;
  onChange: (next: SchoolInput) => void;
}

export default function InputView({ input, onChange }: Props) {
  const { t, tSubject, tGrade, tClassId, tTeacher } = useT();
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [teacherSort, setTeacherSort] = useState<"name" | "subject" | "grade">(
    "name"
  );
  const [teacherQuery, setTeacherQuery] = useState("");
  const [addingClass, setAddingClass] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingTrendKey, setEditingTrendKey] = useState<string | null>(null);
  const [addingTrend, setAddingTrend] = useState(false);
  const [addingSubject, setAddingSubject] = useState(false);
  const [editingSubjectKey, setEditingSubjectKey] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<{
    teacherId: string;
    teacherName: string;
    classes: { id: string; name: string }[];
  } | null>(null);

  const teacherById = Object.fromEntries(input.teachers.map((x) => [x.id, x]));

  /** Trend id = grade + optional ":" + trendName (so "A regular" → "A" and
   *  "A science" → "A:science"). Used as a stable grouping key. */
  const trendKeyOf = (grade: Grade, trendName?: string) =>
    trendName ? `${grade}:${trendName}` : `${grade}`;
  const parseTrendKey = (key: string): { grade: Grade; trendName?: string } => {
    const [g, t] = key.split(":");
    return { grade: g as Grade, trendName: t || undefined };
  };

  // Subjects for a (grade, trendName) tuple — taken from the registered trend.
  const subjectsForTrend = (grade: Grade, trendName?: string): ClassSubject[] => {
    const trend = input.trends.find(
      (tr) => tr.grade === grade && (tr.trendName ?? "") === (trendName ?? "")
    );
    return trend ? trend.subjects : defaultGradeSubjects();
  };

  // All registered trends, sorted — independent of whether any class uses them.
  const presentTrendKeys = Array.from(
    new Set(input.trends.map((tr) => trendKeyOf(tr.grade, tr.trendName)))
  ).sort();

  // For each grade, the list of trend names available to assign to a class.
  // The empty string represents the regular (unnamed) trend, which is always
  // offered even when no trend has been registered yet so it can be the form's
  // default.
  const trendsByGrade: Record<Grade, string[]> = Object.values(Grade).reduce(
    (acc, g) => {
      acc[g as Grade] = [""];
      return acc;
    },
    {} as Record<Grade, string[]>
  );
  input.trends.forEach((tr) => {
    const list = trendsByGrade[tr.grade];
    const name = tr.trendName ?? "";
    if (!list.includes(name)) list.push(name);
  });

  const configStartHour =
    input.config.startHour ??
    Number.parseInt(input.config.slotLabels[0]?.split(":")[0] ?? "8", 10);
  const configEndHour =
    input.config.endHour ?? configStartHour + input.config.slotLabels.length;

  /** Trend chips offered to teachers — one per trend the school actually has. */
  const availableTrends: TrendChoice[] = presentTrendKeys.map((key) => {
    const { grade, trendName } = parseTrendKey(key);
    return {
      key,
      label: trendName ? `${tGrade(grade)} · ${trendName}` : `${tGrade(grade)}`,
      grade,
    };
  });

  /** Map every teacher id → the classes they're the homeroom of. Used both
   *  for the delete-confirmation modal and for the "Homeroom of …" badge on
   *  the teacher card. */
  const homeroomByTeacher: Record<string, { id: string; name: string }[]> = {};
  for (const cls of input.classes) {
    if (!cls.defaultTeacherId) continue;
    if (!homeroomByTeacher[cls.defaultTeacherId])
      homeroomByTeacher[cls.defaultTeacherId] = [];
    homeroomByTeacher[cls.defaultTeacherId].push({ id: cls.id, name: cls.name });
  }

  /** teacherId → first class they are homeroom of. A teacher can only be the
   *  homeroom of one class at a time, so the ClassForm uses this to hide
   *  teachers already occupied elsewhere. */
  const homeroomTeacherToClass: Record<string, { classId: string; className: string }> = {};
  for (const cls of input.classes) {
    if (!cls.defaultTeacherId) continue;
    if (homeroomTeacherToClass[cls.defaultTeacherId]) continue;
    homeroomTeacherToClass[cls.defaultTeacherId] = { classId: cls.id, className: cls.name };
  }

  /** Class chips passed into TeacherForm so the user can toggle which classes
   *  this teacher is the homeroom of, directly from the teacher side. */
  const availableClasses = input.classes.map((c) => {
    const currentTeacher = c.defaultTeacherId
      ? teacherById[c.defaultTeacherId]
      : null;
    return {
      id: c.id,
      label: tClassId(c.id),
      currentHomeroomTeacherName: currentTeacher ? tTeacher(currentTeacher) : null,
    };
  });
  const homeroomClassIdsForTeacher = (teacherId: string): string[] =>
    input.classes.filter((c) => c.defaultTeacherId === teacherId).map((c) => c.id);

  const availableSubjects: SubjectDef[] = input.subjects ?? [];
  const subjectKeyInUse = (key: string): boolean =>
    input.trends.some((tr) => tr.subjects.some((s) => s.subject === key)) ||
    input.teachers.some((te) => te.subjects.includes(key));
  const addSubject = (def: SubjectDef) => {
    onChange({ ...input, subjects: [...availableSubjects, def] });
    setAddingSubject(false);
  };
  const updateSubject = (def: SubjectDef) => {
    onChange({
      ...input,
      subjects: availableSubjects.map((s) => (s.key === def.key ? def : s)),
    });
    setEditingSubjectKey(null);
  };
  const removeSubject = (key: string) => {
    if (subjectKeyInUse(key)) {
      window.alert(t("errCannotRemoveSubjectInUse"));
      return;
    }
    const def = availableSubjects.find((s) => s.key === key);
    const display = def ? tSubject(def.key) : key;
    if (!window.confirm(t("confirmDeleteSubject", { name: display }))) return;
    onChange({
      ...input,
      subjects: availableSubjects.filter((s) => s.key !== key),
    });
  };

  const removeTeacher = (id: string) => {
    const teacher = input.teachers.find((x) => x.id === id);
    if (!teacher) return;
    const usedBy = homeroomByTeacher[id] ?? [];
    if (usedBy.length > 0) {
      // The homeroom case opens the richer modal that already has its own
      // confirm/cancel buttons — no extra window.confirm needed.
      setDeleteCandidate({
        teacherId: id,
        teacherName: tTeacher(teacher),
        classes: usedBy,
      });
      return;
    }
    if (
      !window.confirm(t("confirmDeleteTeacherSimple", { name: tTeacher(teacher) }))
    ) {
      return;
    }
    onChange({ ...input, teachers: input.teachers.filter((x) => x.id !== id) });
  };

  /** Confirmed deletion path. Also nulls out the teacher from any class's
   *  defaultTeacherId so the class doesn't end up pointing at a missing id —
   *  the solver re-assigns a homeroom for those classes on the next run. */
  const confirmDeleteTeacher = () => {
    if (!deleteCandidate) return;
    const id = deleteCandidate.teacherId;
    onChange({
      ...input,
      teachers: input.teachers.filter((x) => x.id !== id),
      classes: input.classes.map((c) =>
        c.defaultTeacherId === id ? { ...c, defaultTeacherId: null } : c
      ),
    });
    setDeleteCandidate(null);
  };

  const removeClass = (id: string) => {
    const cls = input.classes.find((c) => c.id === id);
    if (!cls) return;
    if (
      !window.confirm(
        t("confirmDeleteClassSimple", { name: tClassId(cls.id) })
      )
    ) {
      return;
    }
    onChange({
      ...input,
      classes: input.classes.filter((c) => c.id !== id),
      rooms: input.rooms.filter((r) => r.id !== `room-${id}`),
    });
  };

  /** Apply homeroom assignments coming back from the teacher form. The form
   *  emits the *full* set of classes this teacher should be homeroom of:
   *   - Any class in `homeroomClassIds` gets its defaultTeacherId set to this
   *     teacher (overriding whichever teacher was there before).
   *   - Any class NOT in `homeroomClassIds` that previously pointed at this
   *     teacher gets cleared. */
  const applyHomeroomAssignments = (
    classes: SchoolClass[],
    teacherId: string,
    homeroomClassIds: string[]
  ): SchoolClass[] => {
    const desired = new Set(homeroomClassIds);
    return classes.map((c) => {
      if (desired.has(c.id) && c.defaultTeacherId !== teacherId) {
        return { ...c, defaultTeacherId: teacherId };
      }
      if (!desired.has(c.id) && c.defaultTeacherId === teacherId) {
        return { ...c, defaultTeacherId: null };
      }
      return c;
    });
  };

  const addTeacher = (teacher: Teacher, homeroomClassIds: string[]) => {
    onChange({
      ...input,
      teachers: [...input.teachers, teacher],
      classes: applyHomeroomAssignments(input.classes, teacher.id, homeroomClassIds),
    });
    setAddingTeacher(false);
  };

  const updateTeacher = (teacher: Teacher, homeroomClassIds: string[]) => {
    onChange({
      ...input,
      teachers: input.teachers.map((existing) =>
        existing.id === teacher.id ? teacher : existing
      ),
      classes: applyHomeroomAssignments(input.classes, teacher.id, homeroomClassIds),
    });
    setEditingTeacherId(null);
  };

  /** Make sure the per-class room exists in input.rooms. */
  const ensureRoom = (roomId: string, classId: string): Room[] => {
    if (input.rooms.some((r) => r.id === roomId)) return input.rooms;
    return [
      ...input.rooms,
      { id: roomId, name: `Room ${classId}`, type: RoomType.Regular },
    ];
  };

  /** Make sure the (grade, trendName) trend is registered. New trends inherit
   *  the default subjects template so the user has something to edit. */
  const ensureTrend = (grade: Grade, trendName?: string): Trend[] => {
    const exists = input.trends.some(
      (tr) => tr.grade === grade && (tr.trendName ?? "") === (trendName ?? "")
    );
    if (exists) return input.trends;
    return [
      ...input.trends,
      { grade, trendName, subjects: defaultGradeSubjects() },
    ];
  };

  const addClass = ({ cls }: ClassFormResult) => {
    const trends = ensureTrend(cls.grade, cls.trendName);
    const subjects =
      trends.find(
        (tr) => tr.grade === cls.grade && (tr.trendName ?? "") === (cls.trendName ?? "")
      )?.subjects ?? defaultGradeSubjects();
    const fullCls: SchoolClass = { ...cls, subjects };
    onChange({
      ...input,
      classes: [...input.classes, fullCls],
      rooms: ensureRoom(cls.defaultRoomId, cls.id),
      trends,
    });
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
    const trends = ensureTrend(cls.grade, cls.trendName);
    const subjects = trendChanged
      ? trends.find(
          (tr) =>
            tr.grade === cls.grade && (tr.trendName ?? "") === (cls.trendName ?? "")
        )?.subjects ?? oldClass.subjects
      : oldClass.subjects;
    const updatedCls: SchoolClass = { ...cls, subjects };
    onChange({
      ...input,
      classes: input.classes.map((existing) =>
        existing.id === oldClass.id ? updatedCls : existing
      ),
      rooms: ensureRoom(cls.defaultRoomId, cls.id),
      trends,
    });
    setEditingClassId(null);
  };

  const saveTrendSubjects = (
    grade: Grade,
    trendName: string | undefined,
    result: GradeFormResult
  ) => {
    onChange({
      ...input,
      trends: input.trends.map((tr) =>
        tr.grade === grade && (tr.trendName ?? "") === (trendName ?? "")
          ? { ...tr, subjects: result.subjects }
          : tr
      ),
      classes: input.classes.map((c) =>
        c.grade === grade && (c.trendName ?? "") === (trendName ?? "")
          ? { ...c, subjects: result.subjects }
          : c
      ),
    });
    setEditingTrendKey(null);
  };

  const removeTrend = (grade: Grade, trendName: string | undefined) => {
    const usedBy = input.classes.filter(
      (c) => c.grade === grade && (c.trendName ?? "") === (trendName ?? "")
    );
    // The regular (unnamed) trend is the fallback target for displaced
    // classes — we can't delete it while classes still rely on it.
    if (!trendName && usedBy.length > 0) {
      window.alert(t("errCannotRemoveDefaultTrend"));
      return;
    }
    if (usedBy.length > 0) {
      if (!window.confirm(t("confirmRemoveTrendWithClasses"))) return;
    }
    const trendsAfterDelete = input.trends.filter(
      (tr) => !(tr.grade === grade && (tr.trendName ?? "") === (trendName ?? ""))
    );
    // The regular trend is guaranteed to exist for this grade if we reach
    // this branch (we refused above when it was the one being deleted).
    const regularSubjects =
      trendsAfterDelete.find((tr) => tr.grade === grade && !tr.trendName)
        ?.subjects ?? defaultGradeSubjects();
    const classes = input.classes.map((c) =>
      c.grade === grade && (c.trendName ?? "") === (trendName ?? "")
        ? { ...c, trendName: undefined, subjects: regularSubjects }
        : c
    );
    onChange({ ...input, trends: trendsAfterDelete, classes });
  };

  return (
    <>
      {/* TEACHERS */}
      <div className="section" id="section-teachers">
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
          <div className="section-actions">
            <input
              type="search"
              className="teacher-search"
              placeholder={t("teacherSearchPlaceholder")}
              value={teacherQuery}
              onChange={(e) => setTeacherQuery(e.target.value)}
            />
            <label className="sort-control">
              <span>{t("sortBy")}</span>
              <select
                value={teacherSort}
                onChange={(e) =>
                  setTeacherSort(e.target.value as typeof teacherSort)
                }
              >
                <option value="name">{t("sortByName")}</option>
                <option value="subject">{t("sortBySubject")}</option>
                <option value="grade">{t("sortByGrade")}</option>
              </select>
            </label>
            {!addingTeacher && !editingTeacherId && (
              <button className="add-btn" onClick={() => setAddingTeacher(true)}>
                {t("addTeacher")}
              </button>
            )}
          </div>
        </div>

        {input.teachers.length === 0 && !addingTeacher && (
          <div className="empty-state">{t("emptyTeachers")}</div>
        )}

        {addingTeacher && (
          <div className="card-grid">
            <TeacherForm
              onSave={addTeacher}
              onCancel={() => setAddingTeacher(false)}
              existingIds={input.teachers.map((teacher) => teacher.id)}
              existingTeachers={input.teachers}
              availableSubjects={availableSubjects}
              availableTrends={availableTrends}
              availableClasses={availableClasses}
              initialHomeroomClassIds={[]}
            />
          </div>
        )}

        {(() => {
          const filteredTeachers = filterTeachers(
            input.teachers,
            teacherQuery,
            tSubject,
            tGrade
          );
          if (filteredTeachers.length === 0 && teacherQuery.trim()) {
            return (
              <div className="empty-state">{t("teacherSearchEmpty")}</div>
            );
          }
          return teacherSort === "name" ? (
            <div className="card-grid">
              {sortedByName(filteredTeachers).map((teacher) =>
                editingTeacherId === teacher.id ? (
                  <TeacherForm
                    key={teacher.id}
                    initial={teacher}
                    onSave={updateTeacher}
                    onCancel={() => setEditingTeacherId(null)}
                    existingIds={input.teachers.map((x) => x.id)}
                    existingTeachers={input.teachers}
                    availableSubjects={availableSubjects}
                    availableTrends={availableTrends}
                    availableClasses={availableClasses}
                    initialHomeroomClassIds={homeroomClassIdsForTeacher(teacher.id)}
                  />
                ) : (
                  <TeacherCard
                    key={teacher.id}
                    teacher={teacher}
                    homeroomOf={homeroomByTeacher[teacher.id] ?? []}
                    onEdit={() => setEditingTeacherId(teacher.id)}
                    onDelete={() => removeTeacher(teacher.id)}
                  />
                )
              )}
            </div>
          ) : (
            groupTeachersBy(
              filteredTeachers,
              teacherSort,
              tSubject,
              tGrade,
              t("grades")
            ).map(({ key, label, teachers }) => (
            <div key={key} className="teacher-group">
              <h4 className="teacher-group-title">{label}</h4>
              <div className="card-grid">
                {teachers.map((teacher) =>
                  editingTeacherId === teacher.id ? (
                    <TeacherForm
                      key={teacher.id}
                      initial={teacher}
                      onSave={updateTeacher}
                      onCancel={() => setEditingTeacherId(null)}
                      existingIds={input.teachers.map((x) => x.id)}
                      existingTeachers={input.teachers}
                      availableSubjects={availableSubjects}
                      availableTrends={availableTrends}
                      availableClasses={availableClasses}
                      initialHomeroomClassIds={homeroomClassIdsForTeacher(teacher.id)}
                    />
                  ) : (
                    <TeacherCard
                      key={teacher.id}
                      teacher={teacher}
                      homeroomOf={homeroomByTeacher[teacher.id] ?? []}
                      onEdit={() => setEditingTeacherId(teacher.id)}
                      onDelete={() => removeTeacher(teacher.id)}
                    />
                  )
                )}
              </div>
            </div>
            ))
          );
        })()}
      </div>

      {/* SUBJECTS catalogue (school-level subject list) */}
      <div className="section" id="section-subjects">
        <div className="section-header">
          <div>
            <h3 className="section-title">{t("subjectsSection")}</h3>
            <div className="section-meta">
              {availableSubjects.length}{" "}
              {availableSubjects.length === 1
                ? t("countSubjectsOne")
                : t("countSubjectsMany")}
            </div>
          </div>
          {!addingSubject && !editingSubjectKey && (
            <button className="add-btn" onClick={() => setAddingSubject(true)}>
              {t("addSubjectSection")}
            </button>
          )}
        </div>
        {availableSubjects.length === 0 && !addingSubject && (
          <div className="empty-state">{t("emptySubjects")}</div>
        )}
        <div className="card-grid">
          {addingSubject && (
            <SubjectForm
              existingKeys={availableSubjects.map((s) => s.key)}
              onSave={addSubject}
              onCancel={() => setAddingSubject(false)}
            />
          )}
          {availableSubjects.map((def) => {
            if (editingSubjectKey === def.key) {
              return (
                <SubjectForm
                  key={def.key}
                  initial={def}
                  existingKeys={availableSubjects.map((s) => s.key)}
                  onSave={updateSubject}
                  onCancel={() => setEditingSubjectKey(null)}
                />
              );
            }
            const inUse = subjectKeyInUse(def.key);
            return (
              <div key={def.key} className="card compact subject-card">
                <div className="head">
                  <span className={`tag subj-${def.key}`}>{tSubject(def.key)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="teacher-name">{tSubject(def.key)}</p>
                    <p className="teacher-role">{def.key}</p>
                  </div>
                  <div className="card-actions">
                    <button
                      className="icon-btn edit-trigger"
                      onClick={() => setEditingSubjectKey(def.key)}
                      aria-label={t("edit")}
                      title={t("edit")}
                    >
                      ✎
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => removeSubject(def.key)}
                      aria-label={t("delete")}
                      title={inUse ? t("errCannotRemoveSubjectInUse") : t("delete")}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TRENDS (subjects per grade + specialization) */}
      <div className="section" id="section-trends">
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
          {!addingTrend && (
            <button className="add-btn" onClick={() => setAddingTrend(true)}>
              {t("addTrend")}
            </button>
          )}
        </div>
        {presentTrendKeys.length === 0 && !addingTrend && (
          <div className="empty-state">{t("emptyTrends")}</div>
        )}
        <div className="card-grid">
          {addingTrend && (
            <GradeForm
              mode="new"
              grade={Grade.A}
              initialSubjects={[]}
              availableSubjects={availableSubjects}
              existingTrendKeys={presentTrendKeys}
              onSave={(r) => {
                const cleanName = r.trendName?.trim().toLowerCase() || undefined;
                onChange({
                  ...input,
                  trends: [
                    ...input.trends.filter(
                      (tr) =>
                        !(tr.grade === r.grade &&
                          (tr.trendName ?? "") === (cleanName ?? ""))
                    ),
                    {
                      grade: r.grade!,
                      trendName: cleanName,
                      subjects: r.subjects,
                    },
                  ],
                });
                setAddingTrend(false);
              }}
              onCancel={() => setAddingTrend(false)}
            />
          )}
          {presentTrendKeys.map((key) => {
            const { grade, trendName } = parseTrendKey(key);
            const subjects = subjectsForTrend(grade, trendName);
            const classIds = input.classes
              .filter(
                (c) =>
                  c.grade === grade &&
                  (c.trendName ?? "") === (trendName ?? "")
              )
              .map((c) => c.id);
            return editingTrendKey === key ? (
              <GradeForm
                key={key}
                grade={grade}
                trendName={trendName}
                initialSubjects={subjects}
                availableSubjects={availableSubjects}
                onSave={(r) => saveTrendSubjects(grade, trendName, r)}
                onCancel={() => setEditingTrendKey(null)}
              />
            ) : (
              <GradeCard
                key={key}
                grade={grade}
                trendName={trendName}
                subjects={subjects}
                classIds={classIds}
                onEdit={() => setEditingTrendKey(key)}
                onDelete={() => removeTrend(grade, trendName)}
                tSubject={tSubject}
              />
            );
          })}
        </div>
      </div>

      {/* CLASSES */}
      <div className="section" id="section-classes">
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
              defaultStartHour={configStartHour}
              defaultEndHour={configEndHour}
              trendsByGrade={trendsByGrade}
              homeroomTeacherToClass={homeroomTeacherToClass}
            />
          )}
          {input.classes.map((c) =>
            editingClassId === c.id ? (
              <ClassForm
                key={c.id}
                initial={c}
                teachers={input.teachers}
                existingIds={input.classes.map((x) => x.id)}
                defaultStartHour={configStartHour}
                defaultEndHour={configEndHour}
                trendsByGrade={trendsByGrade}
                homeroomTeacherToClass={homeroomTeacherToClass}
                onSave={updateClass}
                onCancel={() => setEditingClassId(null)}
              />
            ) : (
              <ClassCard
                key={c.id}
                cls={c}
                defaultTeacherName={
                  c.defaultTeacherId && teacherById[c.defaultTeacherId]
                    ? tTeacher(teacherById[c.defaultTeacherId])
                    : ""
                }
                startHour={c.startHour ?? configStartHour}
                endHour={c.endHour ?? configEndHour}
                onEdit={() => setEditingClassId(c.id)}
                onDelete={() => removeClass(c.id)}
              />
            )
          )}
        </div>
      </div>

      {deleteCandidate && (
        <ConfirmDialog
          title={t("deleteTeacherTitle", { name: deleteCandidate.teacherName })}
          message={
            <>
              {t(
                deleteCandidate.classes.length === 1
                  ? "deleteTeacherBodyOne"
                  : "deleteTeacherBodyMany",
                {
                  name: deleteCandidate.teacherName,
                  classes: deleteCandidate.classes
                    .map((c) => tClassId(c.id))
                    .join(", "),
                }
              )}
              {t("deleteTeacherFootnote") && (
                <div className="modal-footnote">
                  {t("deleteTeacherFootnote")}
                </div>
              )}
            </>
          }
          confirmLabel={t("deleteTeacherConfirm")}
          cancelLabel={t("cancel")}
          danger
          onConfirm={confirmDeleteTeacher}
          onCancel={() => setDeleteCandidate(null)}
        />
      )}
    </>
  );
}

// --- Cards ---

function TeacherCard({
  teacher,
  homeroomOf,
  onEdit,
  onDelete,
}: {
  teacher: Teacher;
  homeroomOf: { id: string; name: string }[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, tDay, tSubject, tGrade, tClassId, tTeacher } = useT();
  const displayName = tTeacher(teacher);
  const gradesLabel =
    teacher.grades.length > 0
      ? teacher.grades.map((g) => tGrade(g)).join(", ")
      : "—";
  return (
    <div className="card teacher-card compact" id={`teacher-${teacher.id}`}>
      <div className="head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="teacher-name">{displayName}</p>
          <p className="teacher-role">
            {t("grades")} {gradesLabel}
          </p>
        </div>
        <div className="card-actions">
          <button
            className="icon-btn edit-trigger"
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

      {(homeroomOf.length > 0 || teacher.dayOff) && (
        <div className="row">
          {homeroomOf.map((c) => (
            <span key={c.id} className="tag homeroom-tag">
              ★ {t("homeroomOfShort", { className: tClassId(c.id) })}
            </span>
          ))}
          {teacher.dayOff && (
            <span className="tag dayoff-tag">
              {t("off", { day: tDay(teacher.dayOff) })}
            </span>
          )}
        </div>
      )}
      <div className="row">
        {teacher.subjects.map((s) => (
          <span key={s} className={`tag subj-${s}`}>
            {tSubject(s)}
          </span>
        ))}
      </div>

      <div className="row">
        {teacher.unavailable.map((w, i) => {
          const isSoft = w.hard === false;
          const isFullDay = !w.fromTime && !w.toTime;
          if (isFullDay && isSoft) {
            return (
              <span key={i} className="tag muted">
                {t("preferOff", { day: tDay(w.day) })}
              </span>
            );
          }
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
  trendName,
  subjects,
  classIds,
  onEdit,
  onDelete,
  tSubject,
}: {
  grade: Grade;
  /** Specialization name (e.g., "science"). Empty/undefined = the regular trend. */
  trendName?: string;
  subjects: ClassSubject[];
  classIds: string[];
  onEdit: () => void;
  /** Provided only when the trend is empty — otherwise deletion is blocked. */
  onDelete?: () => void;
  tSubject: (s: string) => string;
}) {
  const { t, tGrade, tClassId } = useT();
  const total = subjects.reduce((s, x) => s + x.hoursPerWeek, 0);
  const classList = classIds.map(tClassId).join(", ");
  const trendKey = trendName ? `${grade}:${trendName}` : `${grade}`;
  return (
    <div className="card class-card compact" id={`trend-${trendKey}`}>
      <div className="head">
        <div className={`grade-badge grade-${grade}`}>{tGrade(grade)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="teacher-name">
            {t("gradeBadgePrefix")} {tGrade(grade)}
            {trendName ? ` · ${trendName}` : ""}
          </p>
          <p className="teacher-role">
            {t("classesInTrend", { n: classIds.length })}
            {classList ? ` (${classList})` : ""} · {total} {t("hoursShort")} / {t("statHours")}
          </p>
        </div>
        <div className="card-actions">
          <button
            className="icon-btn edit-trigger"
            onClick={onEdit}
            aria-label={t("edit")}
            title={t("edit")}
          >
            ✎
          </button>
          {onDelete && (
            <button
              className="icon-btn danger"
              onClick={onDelete}
              aria-label={t("delete")}
              title={t("delete")}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="trend-subjects-tags">
        {subjects.map((s) => {
          const mandatory = s.mandatory !== false;
          return (
            <span
              key={s.subject}
              className={`tag tag-compact subj-${s.subject}`}
              style={{ opacity: mandatory ? 1 : 0.55 }}
              title={`${s.hoursPerWeek} ${t("hoursShort")}`}
            >
              {tSubject(s.subject)} {s.hoursPerWeek}
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
  startHour,
  endHour,
  onEdit,
  onDelete,
}: {
  cls: SchoolClass;
  defaultTeacherName: string;
  startHour: number;
  endHour: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, tGrade, tClassId } = useT();
  const trendLabel = cls.trendName
    ? `${tGrade(cls.grade)} · ${cls.trendName}`
    : `${tGrade(cls.grade)}`;
  const displayId = tClassId(cls.id);
  return (
    <div className="card class-card compact" id={`class-${cls.id}`}>
      <div className="head">
        <div className={`grade-badge grade-${cls.grade}`}>{displayId}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="teacher-name">{displayId}</p>
          <p className="teacher-role">
            {t("gradeBadgePrefix")} {trendLabel}
          </p>
        </div>
        <div className="card-actions">
          <button
            className="icon-btn edit-trigger"
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
          {`${formatHourMinute(startHour)} - ${formatHourMinute(endHour)}`}
        </span>
      </div>
    </div>
  );
}

function formatHourMinute(hour: number): string {
  const safe = Number.isFinite(hour) ? hour : 0;
  const h = Math.max(0, Math.min(23, Math.floor(safe)));
  const m = Math.max(0, Math.min(59, Math.round((safe - h) * 60)));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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

function sortedByName(teachers: Teacher[]): Teacher[] {
  return [...teachers].sort((a, b) => a.name.localeCompare(b.name));
}

/** Case-insensitive substring match against name, subjects (raw + translated),
 *  and grades. Empty query returns the list unchanged. */
function filterTeachers(
  teachers: Teacher[],
  query: string,
  tSubject: (s: string) => string,
  tGrade: (g: Grade) => string
): Teacher[] {
  const q = query.trim().toLowerCase();
  if (!q) return teachers;
  return teachers.filter((teacher) => {
    if (teacher.name.toLowerCase().includes(q)) return true;
    if (teacher.nameHe && teacher.nameHe.toLowerCase().includes(q)) return true;
    for (const s of teacher.subjects) {
      if (s.toLowerCase().includes(q)) return true;
      if (tSubject(s).toLowerCase().includes(q)) return true;
    }
    for (const g of teacher.grades) {
      if (g.toLowerCase().includes(q)) return true;
      if (tGrade(g).toLowerCase().includes(q)) return true;
    }
    return false;
  });
}

/** Build subject- or grade-grouped views for the teachers section.
 *  A teacher appears once per group key they belong to (a math+hebrew
 *  teacher shows up in both the math and the hebrew group). */
function groupTeachersBy(
  teachers: Teacher[],
  by: "subject" | "grade",
  tSubject: (s: string) => string,
  tGrade: (g: Grade) => string,
  gradesLabel: string
): { key: string; label: string; teachers: Teacher[] }[] {
  const groups: Map<string, { label: string; teachers: Teacher[] }> = new Map();
  for (const teacher of teachers) {
    const keys =
      by === "subject"
        ? teacher.subjects
        : teacher.grades.map((g) => `${gradesLabel} ${tGrade(g)}`);
    for (const key of keys) {
      const label = by === "subject" ? tSubject(key) : key;
      if (!groups.has(key)) groups.set(key, { label, teachers: [] });
      groups.get(key)!.teachers.push(teacher);
    }
  }
  return Array.from(groups.entries())
    .sort(([, a], [, b]) => a.label.localeCompare(b.label))
    .map(([key, { label, teachers }]) => ({
      key,
      label,
      teachers: [...teachers].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
