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
  /** Latest end hour across all days — the global cap. */
  endHour: number;
  /** Per-day end-hour override. Empty/missing days use endHour. */
  endHourByDay?: Partial<Record<Day, number>>;
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
  /** true = hard ("can't"), false = soft ("prefer not"). Default true. */
  hard?: boolean;
}

export interface Teacher {
  id: string;
  name: string;
  subjects: string[];
  grades: Grade[];
  gradesPerSubject?: Record<string, Grade[]>;
  /** Per-subject trend restrictions. A trend key is "A" or "A:science".
   *  Overrides gradesPerSubject when set. */
  trendsPerSubject?: Record<string, string[]>;
  /** Legacy field — new code uses `unavailable` exclusively. */
  dayOff?: Day;
  unavailable: UnavailabilityWindow[];
  /** Whether this teacher is eligible to be a class's default (homeroom)
   *  teacher. Default true. */
  canBeDefault?: boolean;
}

export interface ClassSubject {
  /** Subject id — Subject enum value or custom string. */
  subject: string;
  hoursPerWeek: number;
  /** When false, the solver may skip this subject if it can't fit. Default true. */
  mandatory?: boolean;
  /** 1 = independent 1-hour slots; 2 = paired into consecutive 2-hour blocks.
   *  Undefined falls back to the legacy default (1h for sport/music, 2h
   *  for everything else). */
  blockSize?: 1 | 2;
}

export interface SchoolClass {
  id: ClassId;
  grade: Grade;
  section: number;
  /** Optional trend specialization (e.g., "science"). Empty = "regular". */
  trendName?: string;
  /** Per-trend school day start/end hour overrides. */
  startHour?: number;
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

export type ScheduleRecommendation =
  | {
      kind: "classDayUnderfilled";
      classId: string;
      className: string;
      trendKey: string;
      trendLabel: string;
      totalHours: number;
      targetHours: number;
      startHour: number;
      endHour: number;
      daysPerWeek: number;
    }
  | {
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
  droppedBlocks?: DroppedBlock[];
  unusedTeachers?: TeacherRef[];
  dayOffSuggestions?: DayOffSuggestion[];
  assignedHomerooms?: AssignedHomeroom[];
  recommendations?: ScheduleRecommendation[];
}
