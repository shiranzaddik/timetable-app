// Shared domain types used by the solver, server, and (mirrored in) the client.
// Strings used by enums must match between server and client because they cross
// the wire as JSON.

export enum Day {
  Sunday = "Sunday",
  Monday = "Monday",
  Tuesday = "Tuesday",
  Wednesday = "Wednesday",
  Thursday = "Thursday",
}

export enum RoomType {
  Regular = "regular",
  Sport = "sport",
  Computer = "computer",
  Music = "music",
}

export enum Grade {
  A = "A",
  B = "B",
  C = "C",
  D = "D",
}

/** A class id is a stable string like "A1", "A2", "B3". */
export type ClassId = string;

export enum Subject {
  Math = "math",
  Hebrew = "hebrew",
  English = "english",
  Science = "science",
  Sport = "sport",
  Music = "music",
  Computer = "computer",
}

export interface Config {
  days: Day[];
  /** School day starting hour (24h), e.g., 8 for 08:00. */
  startHour: number;
  /** School day ending hour (exclusive), e.g., 13 means the last slot is 12:00→13:00. */
  endHour: number;
  /** Hourly slot start times derived from startHour/endHour, e.g. ["08:00", "09:00", ...]. */
  slotLabels: string[];
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
}

/** A window in which a teacher prefers (or refuses) to teach.
 *  Omit both fromTime and toTime → entire day. */
export interface UnavailabilityWindow {
  day: Day;
  /** "HH:MM" inclusive lower bound. Omitted → from start of day. */
  fromTime?: string;
  /** "HH:MM" exclusive upper bound. Omitted → to end of day. */
  toTime?: string;
  /** true = hard ("can't" — solver respects strictly), false = soft
   *  ("prefer not" — solver may override if needed). Default true for
   *  back-compat with older inputs that didn't have this flag. */
  hard?: boolean;
}

export interface Teacher {
  id: string;
  name: string;
  /** Subjects this teacher can teach. Well-known values come from the Subject
   *  enum; custom strings are also allowed for school-specific subjects. */
  subjects: string[];
  /** Fallback list of grades this teacher can teach when a subject has no
   *  per-subject grade list. Kept for back-compat with older inputs. */
  grades: Grade[];
  /** Per-subject grade restrictions. When set, overrides `grades` for that
   *  subject. */
  gradesPerSubject?: Record<string, Grade[]>;
  /** Per-subject TREND restrictions. A trend key is "A" or "A:science" —
   *  see SchoolClass.trendName. When set, this overrides both
   *  gradesPerSubject and grades for that subject. Lets a teacher say
   *  "I teach math to A regular but not to A science". */
  trendsPerSubject?: Record<string, string[]>;
  /** Legacy "day off" field. New inputs put this entry inside `unavailable`
   *  instead; the solver still recognises it for back-compat. */
  dayOff?: Day;
  /** Unified list of times when the teacher can't (hard=true) or would
   *  rather not (hard=false) teach. Replaces the separate dayOff + windows. */
  unavailable: UnavailabilityWindow[];
  /** When false, the homeroom-auto-assigner won't pick this teacher as a
   *  class's default teacher. Default true. */
  canBeDefault?: boolean;
}

export interface ClassSubject {
  /** Subject identifier — typically one of the Subject enum values, but
   *  custom subject names are also supported. */
  subject: string;
  hoursPerWeek: number;
  /** When false, the solver is allowed to skip this subject if it can't fit
   *  (the dropped block appears in SolveResult.droppedBlocks). Default true. */
  mandatory?: boolean;
}

export interface SchoolClass {
  id: ClassId;
  /** Grade letter, e.g., Grade.A for class "A1" or "A2". */
  grade: Grade;
  /** Section number within the grade, e.g., 1 for "A1". */
  section: number;
  /** Optional trend specialization within the grade ("science", "sport",
   *  "computers", ...). Empty/undefined = the "regular" trend. Classes
   *  that share the same (grade, trendName) tuple share one subjects list. */
  trendName?: string;
  /** Per-class (per-trend) school day start hour. Overrides the global
   *  config.startHour for this class. When undefined, the global value
   *  applies. */
  startHour?: number;
  /** Per-class (per-trend) school day end hour (exclusive). */
  endHour?: number;
  name: string;
  /** When null, the solver may pick any qualified teacher for every subject. */
  defaultTeacherId: string | null;
  defaultRoomId: string;
  subjects: ClassSubject[];
}

/** A trend within a grade. Stored independently of classes so a trend
 *  survives when no class is currently assigned to it. The subjects here
 *  are the source of truth — each class's `subjects` field is kept in
 *  sync as a denormalized copy so the solver doesn't need a join. */
export interface Trend {
  grade: Grade;
  /** Empty/undefined = the regular trend of the grade. */
  trendName?: string;
  subjects: ClassSubject[];
}

export interface SchoolInput {
  config: Config;
  rooms: Room[];
  teachers: Teacher[];
  classes: SchoolClass[];
  trends: Trend[];
}

export interface TimetableCell {
  subject: string;
  classId: ClassId;
  className: string;
  teacherId: string;
  teacherName: string;
  roomId: string;
  roomName: string;
}

/** [day][slot] grid of cells (or null if empty). */
export type Grid = (TimetableCell | null)[][];

export interface Timetables {
  byClass: Record<string, Grid>;
  byTeacher: Record<string, Grid>;
}

export interface DroppedBlock {
  classId: string;
  className: string;
  subject: string;
  hours: number;
}

export interface TeacherRef {
  id: string;
  name: string;
}

export interface DayOffSuggestion {
  teacherId: string;
  teacherName: string;
  currentDay: Day;
  suggestedDay: Day;
  /** How many additional blocks the swap would fit. */
  improvesBlocksBy: number;
}

export interface AssignedHomeroom {
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
}

/** A structured recommendation surfaced after a successful solve. */
export type ScheduleRecommendation =
  | {
      kind: "classDayUnderfilled";
      classId: string;
      className: string;
      /** "A" or "A:science" — same shape as the InputView trend key, so the
       *  client can scroll to the matching trend card. */
      trendKey: string;
      /** Human-readable trend, e.g., "A" or "A · science". */
      trendLabel: string;
      /** Total hours/week summed across the trend's subjects. */
      totalHours: number;
      /** Hours needed to fill the class's minimum school day. */
      targetHours: number;
      /** Class minimum school day. */
      startHour: number;
      endHour: number;
      /** Days in the configured week. */
      daysPerWeek: number;
    }
  | {
      /** Solver couldn't fit every mandatory subject — generic guidance.
       *  If we managed to identify a "busiest" teacher (most assignments in
       *  the partial schedule), their id/name is included so the client can
       *  link option 2 ("cancel a day off for the busiest teacher") straight
       *  to that teacher's edit form. */
      kind: "mandatoryOverflow";
      busiestTeacherId?: string;
      busiestTeacherName?: string;
    };

export interface SolveResult {
  success: boolean;
  error?: string;
  timetables: Timetables;
  blockCount?: number;
  elapsedMs?: number;
  /** Non-mandatory subjects the solver couldn't fit. Non-empty when the
   *  schedule is partial — the UI should show a "needs more teachers" hint. */
  droppedBlocks?: DroppedBlock[];
  /** Teachers who ended up with zero assignments — the user can consider
   *  removing them. */
  unusedTeachers?: TeacherRef[];
  /** When subjects were dropped, the solver tries alternative day-offs
   *  for the teachers of those subjects and reports any that would have
   *  reduced the dropped count. */
  dayOffSuggestions?: DayOffSuggestion[];
  /** Classes whose defaultTeacherId was null in the input — the solver
   *  picked a homeroom teacher for each based on subject coverage. */
  assignedHomerooms?: AssignedHomeroom[];
  /** Structured recommendations (the client renders these with edit-links
   *  back to the class/trend that triggered the issue). Always returned
   *  alongside a timetable — the schedule is never withheld from the user. */
  recommendations?: ScheduleRecommendation[];
}
