// Mirror of server/types.ts. Keep enum string values identical so JSON travels cleanly.

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

/** Class id is a stable string like "A1", "A2", "B3". */
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
  slotLabels: string[];
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
}

export interface UnavailabilityWindow {
  day: Day;
  fromTime?: string;
  toTime?: string;
}

export interface Teacher {
  id: string;
  name: string;
  /** Subjects this teacher can teach — Subject enum values OR custom names. */
  subjects: string[];
  grades: Grade[];
  dayOff: Day;
  unavailable: UnavailabilityWindow[];
}

export interface ClassSubject {
  /** Subject id — Subject enum value or custom string. */
  subject: string;
  hoursPerWeek: number;
}

export interface SchoolClass {
  id: ClassId;
  grade: Grade;
  section: number;
  name: string;
  defaultTeacherId: string;
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
