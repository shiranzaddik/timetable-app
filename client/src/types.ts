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
  /** School day starting hour (24h), e.g., 8 for 08:00. */
  startHour: number;
  /** School day ending hour (exclusive). */
  endHour: number;
  /** Derived from startHour/endHour. */
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
  /** When false, the solver may skip this subject if it can't fit. Default true. */
  mandatory?: boolean;
}

export interface SchoolClass {
  id: ClassId;
  grade: Grade;
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
  droppedBlocks?: DroppedBlock[];
  unusedTeachers?: TeacherRef[];
  dayOffSuggestions?: DayOffSuggestion[];
  assignedHomerooms?: AssignedHomeroom[];
}
