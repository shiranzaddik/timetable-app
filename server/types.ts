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
  /** Grade letters this teacher can teach (e.g., [A, B] means any A* or B* class). */
  grades: Grade[];
  /** Required default day off — the teacher does not work this day. */
  dayOff: Day;
  /** Additional unavailable windows on top of dayOff. */
  unavailable: UnavailabilityWindow[];
}

export interface ClassSubject {
  /** Subject identifier — typically one of the Subject enum values, but
   *  custom subject names are also supported. */
  subject: string;
  hoursPerWeek: number;
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

export interface SolveResult {
  success: boolean;
  error?: string;
  timetables: Timetables;
  blockCount?: number;
  elapsedMs?: number;
}
