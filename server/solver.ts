// Timetable solver using backtracking constraint satisfaction.
//
// Hard constraints:
//   - Teacher availability (dayOff + unavailable windows compiled into a matrix).
//   - A teacher cannot be in two places at once.
//   - A class cannot have two lessons at the same slot.
//   - Sport requires the sport hall; computer requires the computer lab.
//     Each special room can host only one class per slot.
//   - Each subject is delivered in 2-hour blocks except sport and music (1-hour).
//   - A class's default teacher must teach that class for any subject they can teach.
//   - Teacher eligibility for a class is by grade letter (Teacher.grades vs SchoolClass.grade).
//   - Per-day hour quota per class — sums to total weekly hours, all days > 0
//     so every class has at least one lesson every day.
//   - Within a day, a class's lessons form a contiguous block (no gaps).

import {
  RoomType,
  Subject,
  type AssignedHomeroom,
  type ClassId,
  type Config,
  type DayOffSuggestion,
  type DroppedBlock,
  type Grid,
  type Room,
  type SchoolClass,
  type SchoolInput,
  type SolveResult,
  type Teacher,
  type TeacherRef,
  type TimetableCell,
  type Timetables,
  type UnavailabilityWindow,
} from "./types.js";

const SPECIAL_ROOM_BY_SUBJECT: Record<string, RoomType> = {
  [Subject.Sport]: RoomType.Sport,
  [Subject.Computer]: RoomType.Computer,
};

const ONE_HOUR_SUBJECTS = new Set<string>([Subject.Sport, Subject.Music]);

interface Block {
  id: string;
  classId: ClassId;
  subject: string;
  duration: number;
  requiredRoomType: RoomType | null;
  /** Mandatory blocks must be placed for the solver to succeed.
   *  Non-mandatory blocks are placed greedily after mandatory ones and
   *  may be dropped (reported in SolveResult.droppedBlocks). */
  mandatory: boolean;
}

interface Assignment {
  blockId: string;
  classId: ClassId;
  subject: string;
  teacherId: string;
  day: number;
  slot: number;
  roomId: string;
}

interface SolveState {
  teacherBusy: Record<string, boolean[][]>;
  classBusy: Record<string, boolean[][]>;
  /** Per-room (special AND regular) contention. Keyed by `${roomId}:${day}:${slot}`. */
  roomBusy: Set<string>;
  assignments: Assignment[];
  classesById: Record<string, SchoolClass>;
  rooms: Room[];
  teacherAvail: Record<string, boolean[][]>;
  /** [classId][day] → hours still allowed on this day for this class. */
  classDayHoursLeft: Record<string, number[]>;
  /** [classId][day] → first/last slot used so far on this day, or -1 if empty. */
  classDayMin: Record<string, number[]>;
  classDayMax: Record<string, number[]>;
  /** [classId] → permissible slot range. The first slot index the class may
   *  use is `startSlot`; the last (inclusive) is `startSlot + slotCount - 1`. */
  classSlotRange: Record<string, { startSlot: number; slotCount: number }>;
}

interface SolveContext {
  config: Config;
  teachers: Teacher[];
  classesById: Record<string, SchoolClass>;
  teacherAvail: Record<string, boolean[][]>;
  /** When set, search will bail out (return false) past this timestamp. */
  deadlineMs?: number;
  /** Mutates to true once the deadline has been observed; sticky. */
  timedOut: { value: boolean };
  /** When true, every class day must begin at slot 0 (hard constraint). */
  requireMorningStart: boolean;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function buildAvailability(teacher: Teacher, config: Config): boolean[][] {
  const matrix = config.days.map(() => config.slotLabels.map(() => true));
  // Legacy: dayOff field is treated as a whole-day hard entry.
  if (teacher.dayOff) {
    const dayOffIdx = config.days.indexOf(teacher.dayOff);
    if (dayOffIdx >= 0) matrix[dayOffIdx] = matrix[dayOffIdx].map(() => false);
  }
  for (const w of teacher.unavailable) {
    // hard === false means "prefer not" — solver currently still treats it as
    // available (the schedule fills it only if no other slot fits). When hard
    // is true or undefined, the window blocks placement.
    if (w.hard === false) continue;
    applyUnavailability(matrix, w, config);
  }
  return matrix;
}

function applyUnavailability(
  matrix: boolean[][],
  window: UnavailabilityWindow,
  config: Config
): void {
  const dIdx = config.days.indexOf(window.day);
  if (dIdx < 0) return;
  if (!window.fromTime && !window.toTime) {
    matrix[dIdx] = matrix[dIdx].map(() => false);
    return;
  }
  const from = window.fromTime ? timeToMinutes(window.fromTime) : -Infinity;
  const to = window.toTime ? timeToMinutes(window.toTime) : Infinity;
  config.slotLabels.forEach((label, sIdx) => {
    const slotStart = timeToMinutes(label);
    if (slotStart >= from && slotStart < to) matrix[dIdx][sIdx] = false;
  });
}

function buildBlocks(classes: SchoolClass[]): Block[] {
  const blocks: Block[] = [];
  let blockId = 0;
  for (const cls of classes) {
    for (const { subject, hoursPerWeek, mandatory } of cls.subjects) {
      const isOneHour = ONE_HOUR_SUBJECTS.has(subject);
      const blockDuration = isOneHour ? 1 : 2;
      let remaining = hoursPerWeek;
      while (remaining > 0) {
        const duration = Math.min(blockDuration, remaining);
        blocks.push({
          id: `b${blockId++}`,
          classId: cls.id,
          subject,
          duration,
          requiredRoomType: SPECIAL_ROOM_BY_SUBJECT[subject] ?? null,
          mandatory: mandatory !== false, // default true when undefined
        });
        remaining -= duration;
      }
    }
  }
  return blocks;
}

function trendKeyOf(grade: string, trendName?: string): string {
  return trendName ? `${grade}:${trendName}` : `${grade}`;
}

/** Whether a teacher is allowed to teach a subject for a specific (grade, trend).
 *  Priority: trendsPerSubject → gradesPerSubject → overall grades. */
function teacherEligibleForTrend(
  teacher: Teacher,
  subject: string,
  grade: string,
  trendName: string | undefined
): boolean {
  if (!teacher.subjects.includes(subject)) return false;
  const classTrend = trendKeyOf(grade, trendName);
  const trendList = teacher.trendsPerSubject?.[subject];
  if (trendList) return trendList.includes(classTrend);
  const gradeList = teacher.gradesPerSubject?.[subject] ?? teacher.grades;
  return gradeList.includes(grade as never);
}

function candidateTeachers(
  block: Block,
  cls: SchoolClass,
  teachers: Teacher[]
): Teacher[] {
  if (cls.defaultTeacherId) {
    const defaultTeacher = teachers.find((t) => t.id === cls.defaultTeacherId);
    if (
      defaultTeacher &&
      teacherEligibleForTrend(defaultTeacher, block.subject, cls.grade, cls.trendName)
    ) {
      return [defaultTeacher];
    }
  }
  return teachers.filter((t) =>
    teacherEligibleForTrend(t, block.subject, cls.grade, cls.trendName)
  );
}

// Schedule one class fully before moving to the next. Within a class, place
// REGULAR-classroom blocks first (so the class claims slot 0 of each day in
// its own classroom), then special-room blocks (sport, computer) slot in
// wherever room and teacher availability allow.
function orderBlocks(
  blocks: Block[],
  classesById: Record<string, SchoolClass>,
  teachers: Teacher[],
  classOrder?: string[]
): Block[] {
  const innerScore = (block: Block): number => {
    const cls = classesById[block.classId];
    const ts = candidateTeachers(block, cls, teachers);
    let s = 0;
    if (block.requiredRoomType) s += 1000; // specials last
    s -= block.duration * 100; // longer first
    s += ts.length * 10; // tight teacher options first
    return s;
  };
  const classRank = classOrder
    ? Object.fromEntries(classOrder.map((c, i) => [c, i] as const))
    : null;
  return [...blocks].sort((a, b) => {
    if (a.classId !== b.classId) {
      if (classRank) return (classRank[a.classId] ?? 0) - (classRank[b.classId] ?? 0);
      return a.classId.localeCompare(b.classId);
    }
    return innerScore(a) - innerScore(b);
  });
}

/** Distribute total weekly hours across days, biggest-first, each day ≥ 1. */
function buildDayQuotas(totalHours: number, dayCount: number): number[] {
  if (dayCount === 0) return [];
  const base = Math.floor(totalHours / dayCount);
  const extra = totalHours % dayCount;
  // Days with the extra hour come first so totals like 19 over 5 days → [4,4,4,4,3].
  return Array.from({ length: dayCount }, (_, i) => base + (i < extra ? 1 : 0));
}

/** True if placing `[start, start+duration)` keeps the class's day contiguous.
 *  When requireMorningStart is set, an empty day's first block must begin at slot 0. */
function keepsDayContiguous(
  state: SolveState,
  classId: ClassId,
  day: number,
  start: number,
  duration: number,
  requireMorningStart: boolean
): boolean {
  const min = state.classDayMin[classId][day];
  const max = state.classDayMax[classId][day];
  if (min === -1) return !requireMorningStart || start === 0;
  const newEnd = start + duration - 1;
  const mergedMin = Math.min(min, start);
  const mergedMax = Math.max(max, newEnd);
  const existingSize = max - min + 1;
  const mergedSize = mergedMax - mergedMin + 1;
  // No overlap is already guaranteed by classBusy. Adjacency means
  // mergedSize === existingSize + duration (i.e., no gap introduced).
  return mergedSize === existingSize + duration;
}

function canPlace(
  block: Block,
  teacher: Teacher,
  day: number,
  startSlot: number,
  state: SolveState,
  requireMorningStart: boolean
): boolean {
  if (state.classDayHoursLeft[block.classId][day] < block.duration) return false;
  // Respect this class's own school-day window.
  const range = state.classSlotRange[block.classId];
  if (
    startSlot < range.startSlot ||
    startSlot + block.duration > range.startSlot + range.slotCount
  )
    return false;
  if (
    !keepsDayContiguous(
      state,
      block.classId,
      day,
      startSlot,
      block.duration,
      requireMorningStart
    )
  )
    return false;

  const cls = state.classesById[block.classId];
  const room = roomForBlock(block, cls, state.rooms);

  for (let i = 0; i < block.duration; i++) {
    const slot = startSlot + i;
    if (!state.teacherAvail[teacher.id][day][slot]) return false;
    if (state.teacherBusy[teacher.id][day][slot]) return false;
    if (state.classBusy[block.classId][day][slot]) return false;
    if (state.roomBusy.has(`${room.id}:${day}:${slot}`)) return false;
  }
  return true;
}

function roomForBlock(block: Block, cls: SchoolClass, rooms: Room[]): Room {
  if (block.requiredRoomType) {
    const room = rooms.find((r) => r.type === block.requiredRoomType);
    if (!room)
      throw new Error(
        `No room of type "${block.requiredRoomType}" exists for subject "${block.subject}".`
      );
    return room;
  }
  const room = rooms.find((r) => r.id === cls.defaultRoomId);
  if (!room) throw new Error(`Class "${cls.id}" has no default room.`);
  return room;
}

function place(
  block: Block,
  teacher: Teacher,
  day: number,
  startSlot: number,
  state: SolveState
): { prevMin: number; prevMax: number } {
  const room = roomForBlock(block, state.classesById[block.classId], state.rooms);
  const prevMin = state.classDayMin[block.classId][day];
  const prevMax = state.classDayMax[block.classId][day];

  for (let i = 0; i < block.duration; i++) {
    const slot = startSlot + i;
    state.teacherBusy[teacher.id][day][slot] = true;
    state.classBusy[block.classId][day][slot] = true;
    state.roomBusy.add(`${room.id}:${day}:${slot}`);
    state.assignments.push({
      blockId: block.id,
      classId: block.classId,
      subject: block.subject,
      teacherId: teacher.id,
      day,
      slot,
      roomId: room.id,
    });
  }

  state.classDayHoursLeft[block.classId][day] -= block.duration;

  const newEnd = startSlot + block.duration - 1;
  state.classDayMin[block.classId][day] =
    prevMin === -1 ? startSlot : Math.min(prevMin, startSlot);
  state.classDayMax[block.classId][day] =
    prevMax === -1 ? newEnd : Math.max(prevMax, newEnd);

  return { prevMin, prevMax };
}

function unplace(
  block: Block,
  teacher: Teacher,
  day: number,
  startSlot: number,
  state: SolveState,
  prev: { prevMin: number; prevMax: number }
): void {
  const cls = state.classesById[block.classId];
  const room = roomForBlock(block, cls, state.rooms);
  for (let i = 0; i < block.duration; i++) {
    const slot = startSlot + i;
    state.teacherBusy[teacher.id][day][slot] = false;
    state.classBusy[block.classId][day][slot] = false;
    state.roomBusy.delete(`${room.id}:${day}:${slot}`);
  }
  state.assignments.splice(state.assignments.length - block.duration, block.duration);
  state.classDayHoursLeft[block.classId][day] += block.duration;
  state.classDayMin[block.classId][day] = prev.prevMin;
  state.classDayMax[block.classId][day] = prev.prevMax;
}

function search(
  blocks: Block[],
  idx: number,
  state: SolveState,
  ctx: SolveContext
): boolean {
  if (ctx.timedOut.value) return false;
  if (ctx.deadlineMs && Date.now() > ctx.deadlineMs) {
    ctx.timedOut.value = true;
    return false;
  }
  if (idx === blocks.length) return true;

  const block = blocks[idx];
  const cls = ctx.classesById[block.classId];
  const teachers_ = candidateTeachers(block, cls, ctx.teachers);

  // Try days in order of remaining quota descending, then current usage descending
  // (continue an in-progress day before opening a new one). This drastically reduces
  // backtracking under the contiguity + per-day-quota constraints.
  const dayOrder = Array.from({ length: ctx.config.days.length }, (_, d) => d).sort(
    (a, b) => {
      const usedA = state.classDayMax[block.classId][a] === -1 ? 0 : 1;
      const usedB = state.classDayMax[block.classId][b] === -1 ? 0 : 1;
      if (usedA !== usedB) return usedB - usedA; // started days first
      return (
        state.classDayHoursLeft[block.classId][b] -
        state.classDayHoursLeft[block.classId][a]
      );
    }
  );

  // Slot outer so slot 0 is tried across every (day, teacher) combo before
  // moving on to slot 1, etc. This makes the solver strongly prefer
  // morning starts for every class day.
  for (let s = 0; s + block.duration <= ctx.config.slotLabels.length; s++) {
    if (ctx.timedOut.value) return false;
    if (ctx.deadlineMs && Date.now() > ctx.deadlineMs) {
      ctx.timedOut.value = true;
      return false;
    }
    for (const d of dayOrder) {
      for (const teacher of teachers_) {
        if (canPlace(block, teacher, d, s, state, ctx.requireMorningStart)) {
          const prev = place(block, teacher, d, s, state);
          if (search(blocks, idx + 1, state, ctx)) return true;
          unplace(block, teacher, d, s, state, prev);
        }
      }
    }
  }
  return false;
}

function buildEmptyMatrix(days: number, slots: number): boolean[][] {
  return Array.from({ length: days }, () =>
    Array.from({ length: slots }, () => false)
  );
}

function emptyGrid(days: number, slots: number): Grid {
  return Array.from({ length: days }, () =>
    Array.from({ length: slots }, () => null)
  );
}

function buildOutput(input: SchoolInput, assignments: Assignment[]): Timetables {
  const { config, classes, teachers, rooms } = input;
  const teachersById = Object.fromEntries(teachers.map((t) => [t.id, t]));
  const roomsById = Object.fromEntries(rooms.map((r) => [r.id, r]));
  const classesById = Object.fromEntries(classes.map((c) => [c.id, c]));

  const slots = config.slotLabels.length;
  const days = config.days.length;

  const byClass: Record<string, Grid> = Object.fromEntries(
    classes.map((c) => [c.id, emptyGrid(days, slots)])
  );
  const byTeacher: Record<string, Grid> = Object.fromEntries(
    teachers.map((t) => [t.id, emptyGrid(days, slots)])
  );

  for (const a of assignments) {
    const cell: TimetableCell = {
      subject: a.subject,
      classId: a.classId,
      className: classesById[a.classId].name,
      teacherId: a.teacherId,
      teacherName: teachersById[a.teacherId].name,
      roomId: a.roomId,
      roomName: roomsById[a.roomId].name,
    };
    byClass[a.classId][a.day][a.slot] = cell;
    byTeacher[a.teacherId][a.day][a.slot] = cell;
  }

  return { byClass, byTeacher };
}

/** For each class without an explicit defaultTeacherId, pick a homeroom
 *  teacher: the one (not already someone else's homeroom) who can teach
 *  the most weekly hours of the class's mandatory subjects. Returns the
 *  augmented class list plus the list of assignments made. */
function assignHomerooms(input: SchoolInput): {
  classes: SchoolClass[];
  assignments: AssignedHomeroom[];
} {
  const usedTeachers = new Set<string>(
    input.classes
      .map((c) => c.defaultTeacherId)
      .filter((id): id is string => id !== null && id !== undefined)
  );
  const assignments: AssignedHomeroom[] = [];
  const newClasses = input.classes.map((c) => {
    if (c.defaultTeacherId) return c;

    const eligible = input.teachers.filter(
      (t) => !usedTeachers.has(t.id) && t.canBeDefault !== false
    );

    let best: Teacher | null = null;
    let bestHours = -1;
    for (const t of eligible) {
      let hours = 0;
      for (const s of c.subjects) {
        if (s.mandatory === false) continue;
        if (!teacherEligibleForTrend(t, s.subject, c.grade, c.trendName)) continue;
        hours += s.hoursPerWeek;
      }
      if (hours > bestHours) {
        bestHours = hours;
        best = t;
      }
    }
    if (best) {
      usedTeachers.add(best.id);
      assignments.push({
        classId: c.id,
        className: c.name,
        teacherId: best.id,
        teacherName: best.name,
      });
      return { ...c, defaultTeacherId: best.id };
    }
    return c;
  });
  return { classes: newClasses, assignments };
}

/** Greedy first-fit placement for non-mandatory blocks. Returns true if placed. */
function greedyPlace(block: Block, state: SolveState, ctx: SolveContext): boolean {
  const cls = ctx.classesById[block.classId];
  const teachers_ = candidateTeachers(block, cls, ctx.teachers);
  for (let s = 0; s + block.duration <= ctx.config.slotLabels.length; s++) {
    for (let d = 0; d < ctx.config.days.length; d++) {
      for (const teacher of teachers_) {
        if (canPlace(block, teacher, d, s, state, false)) {
          place(block, teacher, d, s, state);
          return true;
        }
      }
    }
  }
  return false;
}

function solveOnce(
  rawInput: SchoolInput,
  classOrder?: string[],
  deadlineMs?: number,
  requireMorningStart: boolean = false
): SolveResult {
  const slotsPerDay = rawInput.config.slotLabels.length;
  const daysCount = rawInput.config.days.length;
  // Derive global start/end hour from slotLabels for legacy inputs.
  const globalStartHour =
    rawInput.config.startHour ??
    Number.parseInt(rawInput.config.slotLabels[0]?.split(":")[0] ?? "8", 10);
  const globalEndHour =
    rawInput.config.endHour ?? globalStartHour + slotsPerDay;

  /** Per-class slot bounds. `minSlots` is the school day the user committed
   *  to (used to warn when subjects can't fill it). `maxSlots` is the global
   *  upper bound the day may extend to if there are more subject hours than
   *  the minimum requires. */
  const classSlotRange = (
    c: SchoolClass
  ): { start: number; minSlots: number; maxSlots: number } => {
    const cStart = c.startHour ?? globalStartHour;
    const cEnd = c.endHour ?? globalEndHour;
    const start = cStart - globalStartHour;
    return {
      start,
      minSlots: Math.max(0, cEnd - cStart),
      maxSlots: Math.max(0, slotsPerDay - start),
    };
  };

  // Hours warnings: each class needs as many subject hours as its own minimum.
  const warnings: string[] = [];
  for (const c of rawInput.classes) {
    const { minSlots } = classSlotRange(c);
    const target = minSlots * daysCount;
    const total = c.subjects.reduce((s, x) => s + x.hoursPerWeek, 0);
    if (total < target) {
      const cStart = c.startHour ?? globalStartHour;
      const cEnd = c.endHour ?? globalEndHour;
      warnings.push(
        `${c.name} has ${total}h/week but its minimum school day ${cStart}:00–${cEnd}:00 needs ${target}h. Add hours to this trend's subjects, or shorten the minimum.`
      );
    }
  }

  // Auto-assign homeroom teachers to classes whose defaultTeacherId is null.
  const { classes: assignedClasses, assignments: assignedHomerooms } =
    assignHomerooms(rawInput);
  const input: SchoolInput = { ...rawInput, classes: assignedClasses };

  const { config, rooms, teachers, classes } = input;
  const classesById = Object.fromEntries(classes.map((c) => [c.id, c]));

  const slots = config.slotLabels.length;
  const days = config.days.length;

  const teacherAvail: Record<string, boolean[][]> = Object.fromEntries(
    teachers.map((t) => [t.id, buildAvailability(t, config)])
  );

  const allBlocks = buildBlocks(classes);
  const mandatoryBlocks = allBlocks.filter((b) => b.mandatory);
  const optionalBlocks = allBlocks.filter((b) => !b.mandatory);
  const orderedMandatory = orderBlocks(
    mandatoryBlocks,
    classesById,
    teachers,
    classOrder
  );
  const orderedOptional = orderBlocks(
    optionalBlocks,
    classesById,
    teachers,
    classOrder
  );

  const classDayHoursLeft: Record<string, number[]> = Object.fromEntries(
    classes.map((c) => {
      const total = c.subjects.reduce((sum, s) => sum + s.hoursPerWeek, 0);
      // Cap per-day quota at the class's MAX slot count (global), so the day
      // may extend beyond the minimum if there are more subject hours.
      const { maxSlots } = classSlotRange(c);
      const quotas = buildDayQuotas(total, days).map((q) =>
        Math.min(q, maxSlots)
      );
      return [c.id, quotas];
    })
  );

  const state: SolveState = {
    teacherBusy: Object.fromEntries(
      teachers.map((t) => [t.id, buildEmptyMatrix(days, slots)])
    ),
    classBusy: Object.fromEntries(
      classes.map((c) => [c.id, buildEmptyMatrix(days, slots)])
    ),
    roomBusy: new Set<string>(),
    assignments: [],
    classesById,
    rooms,
    teacherAvail,
    classDayHoursLeft,
    classDayMin: Object.fromEntries(
      classes.map((c) => [c.id, Array.from({ length: days }, () => -1)])
    ),
    classDayMax: Object.fromEntries(
      classes.map((c) => [c.id, Array.from({ length: days }, () => -1)])
    ),
    classSlotRange: Object.fromEntries(
      classes.map((c) => {
        const r = classSlotRange(c);
        return [c.id, { startSlot: r.start, slotCount: r.maxSlots }];
      })
    ),
  };

  const ctx: SolveContext = {
    config,
    teachers,
    classesById,
    teacherAvail,
    deadlineMs,
    timedOut: { value: false },
    requireMorningStart,
  };

  // Phase 1: backtracking search over mandatory blocks.
  const ok = search(orderedMandatory, 0, state, ctx);

  const droppedRaw: Block[] = [];
  if (!ok) {
    // Backtracking exhausted without placing every mandatory block. State has
    // been fully unwound at this point. Switch to a greedy fallback that
    // places as many mandatory blocks as it can — anything that doesn't fit
    // gets reported as a dropped block.
    for (const block of orderedMandatory) {
      if (!greedyPlace(block, state, ctx)) droppedRaw.push(block);
    }
    warnings.push(
      "Couldn't fit every mandatory subject. Try one of these in order: " +
        "(1) give existing teachers more subjects/grades, (2) cancel a day off " +
        "for the busiest teacher, (3) add more teachers, " +
        "(4) mark some subjects as optional."
    );
  }

  // Phase 2: greedily add optional blocks on top.
  for (const block of orderedOptional) {
    if (!greedyPlace(block, state, ctx)) droppedRaw.push(block);
  }

  // Aggregate dropped blocks by (class, subject) summing hours.
  const droppedAgg: Record<string, DroppedBlock> = {};
  for (const block of droppedRaw) {
    const key = `${block.classId}__${block.subject}`;
    if (!droppedAgg[key]) {
      droppedAgg[key] = {
        classId: block.classId,
        className: classesById[block.classId].name,
        subject: block.subject,
        hours: 0,
      };
    }
    droppedAgg[key].hours += block.duration;
  }
  const droppedBlocks = Object.values(droppedAgg);

  return {
    success: true,
    timetables: buildOutput(input, state.assignments),
    blockCount: allBlocks.length - droppedRaw.length,
    droppedBlocks: droppedBlocks.length > 0 ? droppedBlocks : undefined,
    assignedHomerooms: assignedHomerooms.length > 0 ? assignedHomerooms : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/** Returns teachers with no assignments in the produced schedule. */
function findUnusedTeachers(result: SolveResult, input: SchoolInput): TeacherRef[] {
  const out: TeacherRef[] = [];
  for (const t of input.teachers) {
    const grid = result.timetables.byTeacher[t.id];
    if (!grid) {
      out.push({ id: t.id, name: t.name });
      continue;
    }
    const hasAny = grid.some((row) => row.some((cell) => cell !== null));
    if (!hasAny) out.push({ id: t.id, name: t.name });
  }
  return out;
}

/** Probe alternative day-offs for teachers of dropped subjects. Returns
 *  suggestions where moving the day-off would have placed more blocks. */
function findDayOffSuggestions(
  input: SchoolInput,
  baseline: SolveResult,
  deadlineMs: number
): DayOffSuggestion[] {
  const droppedSubjects = new Set(
    (baseline.droppedBlocks ?? []).map((d) => d.subject)
  );
  if (droppedSubjects.size === 0) return [];

  const baselinePlaced = baseline.blockCount ?? 0;
  const relevantTeachers = input.teachers.filter((t) =>
    t.subjects.some((s) => droppedSubjects.has(s))
  );

  const suggestions: DayOffSuggestion[] = [];
  for (const teacher of relevantTeachers) {
    if (Date.now() > deadlineMs) break;
    // Pick a representative "current day off": prefer the legacy field,
    // otherwise the first hard whole-day entry in unavailable.
    const currentDayOff =
      teacher.dayOff ??
      teacher.unavailable.find(
        (w) => (w.hard ?? true) && !w.fromTime && !w.toTime
      )?.day;
    if (!currentDayOff) continue;
    let best: DayOffSuggestion | null = null;
    for (const day of input.config.days) {
      if (day === currentDayOff) continue;
      if (Date.now() > deadlineMs) break;
      const altInput: SchoolInput = {
        ...input,
        teachers: input.teachers.map((t) =>
          t.id === teacher.id ? { ...t, dayOff: day, unavailable: [] } : t
        ),
      };
      const altResult = solveOnce(altInput, undefined, Date.now() + 600, false);
      if (!altResult.success) continue;
      const altPlaced = altResult.blockCount ?? 0;
      const improves = altPlaced - baselinePlaced;
      if (improves > 0 && (!best || improves > best.improvesBlocksBy)) {
        best = {
          teacherId: teacher.id,
          teacherName: teacher.name,
          currentDay: currentDayOff,
          suggestedDay: day,
          improvesBlocksBy: improves,
        };
      }
    }
    if (best) suggestions.push(best);
  }
  return suggestions;
}

/** Counts (class, day) cells where slot 0 has a lesson. Higher is better. */
function morningStartScore(result: SolveResult, input: SchoolInput): number {
  let count = 0;
  for (const cls of input.classes) {
    const grid = result.timetables.byClass[cls.id];
    if (!grid) continue;
    for (let d = 0; d < input.config.days.length; d++) {
      if (grid[d][0]) count++;
    }
  }
  return count;
}

/** Produce a set of class orderings to try. Each class gets a turn going first. */
function classOrderingsToTry(classIds: string[]): string[][] {
  const out: string[][] = [];
  const seen = new Set<string>();
  const add = (order: string[]) => {
    const key = order.join(",");
    if (seen.has(key)) return;
    seen.add(key);
    out.push(order);
  };
  add([...classIds]); // alphabetical baseline
  // Rotate each class to the front
  for (let i = 0; i < classIds.length; i++) {
    const arr = [...classIds];
    const [first] = arr.splice(i, 1);
    add([first, ...arr]);
  }
  add([...classIds].reverse()); // reverse alphabetical
  return out;
}

/**
 * Public entry point. Two-pass strategy:
 *
 *   Pass 1 — try several class orderings with the HARD constraint that every
 *            class day must begin at slot 0. If any ordering succeeds, that's
 *            a perfect 100% morning-start result and we return immediately.
 *
 *   Pass 2 — drop the hard constraint, run the same orderings, and keep the
 *            result with the highest morning-start score. This is the
 *            best-effort fallback for inputs that have no all-morning
 *            solution.
 *
 * Each individual attempt has its own deadline so a slow search can't
 * monopolize the budget.
 */
export function solve(input: SchoolInput): SolveResult {
  const classIds = input.classes.map((c) => c.id);
  if (classIds.length === 0) {
    return solveOnce(input);
  }

  const orderings = classOrderingsToTry(classIds);
  const totalBudgetMs = 8000;
  const perAttemptMs = 1000;
  const startedAt = Date.now();

  const tryWith = (
    require: boolean,
    fractionOfBudget: number
  ): { best: SolveResult | null; bestScore: number; firstSuccess: SolveResult | null } => {
    const phaseDeadline = startedAt + totalBudgetMs * fractionOfBudget;
    let best: SolveResult | null = null;
    let bestScore = -1;
    let firstSuccess: SolveResult | null = null;
    for (const ordering of orderings) {
      if (Date.now() > phaseDeadline) break;
      const remaining = phaseDeadline - Date.now();
      const attemptBudget = Math.min(perAttemptMs, remaining);
      if (attemptBudget < 50) break;
      const result = solveOnce(input, ordering, Date.now() + attemptBudget, require);
      if (!result.success) continue;
      if (!firstSuccess) firstSuccess = result;
      // Higher score = more blocks placed + more morning starts.
      const placed = result.blockCount ?? 0;
      const score = placed * 1000 + morningStartScore(result, input);
      if (score > bestScore) {
        bestScore = score;
        best = result;
      }
    }
    return { best, bestScore, firstSuccess };
  };

  const enrich = (result: SolveResult): SolveResult => {
    if (!result.success) return result;
    const unusedTeachers = findUnusedTeachers(result, input);
    let dayOffSuggestions: DayOffSuggestion[] | undefined;
    if (result.droppedBlocks && result.droppedBlocks.length > 0) {
      // Give the suggestion probe up to 3s, never extending the deadline by much.
      const probeDeadline = Math.min(
        startedAt + totalBudgetMs + 3000,
        Date.now() + 3000
      );
      const found = findDayOffSuggestions(input, result, probeDeadline);
      if (found.length > 0) dayOffSuggestions = found;
    }
    return {
      ...result,
      unusedTeachers: unusedTeachers.length > 0 ? unusedTeachers : undefined,
      dayOffSuggestions,
    };
  };

  // Pass 1: every class day MUST start at slot 0.
  const pass1 = tryWith(true, 0.6);
  if (pass1.best) return enrich(pass1.best);

  // Pass 2: best-effort, soft preference for slot-0 placements.
  const pass2 = tryWith(false, 1.0);
  if (pass2.best) return enrich(pass2.best);
  if (pass2.firstSuccess) return enrich(pass2.firstSuccess);

  // Both passes failed; surface a bounded final attempt so we don't hang.
  return solveOnce(input, undefined, Date.now() + 1500, false);
}
