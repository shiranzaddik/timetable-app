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

/** A window in which a teacher cannot teach.
 *  Omit both fromTime and toTime → entire day is unavailable. */
export interface UnavailabilityWindow {
  day: Day;
  /** "HH:MM" inclusive lower bound. Omitted → from start of day. */
  fromTime?: string;
  /** "HH:MM" exclusive upper bound. Omitted → to end of day. */
  toTime?: string;
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
   *  subject. Default UX: when adding a subject in the form, this list is
   *  initialised to every grade — the user can then narrow it. */
  gradesPerSubject?: Record<string, Grade[]>;
  /** Soft preference — the solver tries to honor this day off but may still
   *  schedule lessons here if no other slot fits. */
  dayOff: Day;
  /** Additional unavailable windows on top of dayOff. */
  unavailable: UnavailabilityWindow[];
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
  name: string;
  /** When null, the solver may pick any qualified teacher for every subject. */
  defaultTeacherId: string | null;
  defaultRoomId: string;
  subjects: ClassSubject[];
}

export interface SchoolInput {
  config: Config;
  rooms: Room[];
  teachers: Teacher[];
  classes: SchoolClass[];
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
  /** Free-text warnings / recommendations (e.g., "Class A1 has 12h but needs
   *  25h to fill the school day"). Always returned alongside a timetable —
   *  the schedule is never withheld from the user. */
  warnings?: string[];
}
