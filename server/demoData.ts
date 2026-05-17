// Demo data for the timetable simulator.
// School week: Sun-Thu, 8 hourly slots/day (08:00-16:00).
// 5 classes (A1, A2, B1, B2, B3). Two math teachers — Mrs. Cohen is the
// default teacher of A1 to demonstrate the "default teacher must teach their
// class for subjects they can teach" rule.

import {
  Day,
  Grade,
  RoomType,
  Subject,
  type ClassSubject,
  type Config,
  type Room,
  type SchoolClass,
  type SchoolInput,
  type Teacher,
  type Trend,
} from "./types.js";

function makeSlotLabels(startHour: number, endHour: number): string[] {
  const labels: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    labels.push(`${String(h).padStart(2, "0")}:00`);
  }
  return labels;
}

const DEFAULT_START_HOUR = 8;
// Global school day: 8 slots (08:00–16:00). Each class sets its own minimum
// (endHour=13 = 5h required) so the solver may extend any class up to 16:00
// when its subjects need more hours than the minimum.
const DEFAULT_END_HOUR = 16;

export const config: Config = {
  days: [Day.Sunday, Day.Monday, Day.Tuesday, Day.Wednesday, Day.Thursday],
  startHour: DEFAULT_START_HOUR,
  endHour: DEFAULT_END_HOUR,
  // Different weekdays end at different times — Thursday short, Tuesday long.
  endHourByDay: {
    [Day.Sunday]: 15,
    [Day.Monday]: 14,
    [Day.Tuesday]: 16,
    [Day.Wednesday]: 15,
    [Day.Thursday]: 13,
  },
  slotLabels: makeSlotLabels(DEFAULT_START_HOUR, DEFAULT_END_HOUR),
};

export const rooms: Room[] = [
  { id: "room-A1", name: "Room A1", type: RoomType.Regular },
  { id: "room-A2", name: "Room A2", type: RoomType.Regular },
  { id: "room-A3", name: "Room A3", type: RoomType.Regular },
  { id: "room-A4", name: "Room A4", type: RoomType.Regular },
  { id: "room-B1", name: "Room B1", type: RoomType.Regular },
  { id: "room-B2", name: "Room B2", type: RoomType.Regular },
  { id: "room-B3", name: "Room B3", type: RoomType.Regular },
  { id: "room-B4", name: "Room B4", type: RoomType.Regular },
  { id: "sport-hall", name: "Sport Hall", type: RoomType.Sport },
  { id: "computer-lab", name: "Computer Lab", type: RoomType.Computer },
  { id: "music-room", name: "Music Room", type: RoomType.Music },
];

const allGrades: Grade[] = [Grade.A, Grade.B];

// Days off are spread so each day has at most one teacher of any single
// subject area off — that keeps the solver able to find an all-morning
// schedule (each class day starts at 08:00).
export const teachers: Teacher[] = [
  {
    id: "t-cohen",
    name: "Mrs. Cohen",
    subjects: [Subject.Math, Subject.Hebrew],
    grades: allGrades,
    unavailable: [],
  },
  {
    id: "t-levi",
    name: "Mr. Levi",
    subjects: [Subject.Math, Subject.Science],
    grades: allGrades,
    dayOff: Day.Monday,
    unavailable: [],
  },
  {
    id: "t-shapiro",
    name: "Ms. Shapiro",
    subjects: [Subject.English],
    grades: allGrades,
    dayOff: Day.Tuesday,
    unavailable: [],
  },
  {
    id: "t-avi",
    name: "Mr. Avi",
    subjects: [Subject.English],
    grades: [Grade.A], // only teaches grade A — demo of a grade-restricted teacher
    dayOff: Day.Sunday,
    unavailable: [],
  },
  {
    id: "t-david",
    name: "Mr. David",
    subjects: [Subject.Hebrew, Subject.Science],
    grades: allGrades,
    dayOff: Day.Wednesday,
    unavailable: [],
  },
  {
    id: "t-yossi",
    name: "Coach Yossi",
    subjects: [Subject.Sport],
    grades: allGrades,
    unavailable: [],
  },
  {
    id: "t-mira",
    name: "Ms. Mira",
    subjects: [Subject.Music],
    grades: allGrades,
    dayOff: Day.Wednesday,
    unavailable: [],
  },
  {
    id: "t-tech",
    name: "Mr. Tech",
    subjects: [Subject.Computer],
    grades: allGrades,
    dayOff: Day.Thursday,
    unavailable: [],
  },
  {
    id: "t-sarah",
    name: "Ms. Sarah",
    subjects: [Subject.Math, Subject.Hebrew, Subject.Science],
    grades: allGrades,
    dayOff: Day.Thursday,
    unavailable: [],
  },
  {
    id: "t-beth",
    name: "Ms. Beth",
    subjects: [Subject.English],
    grades: allGrades,
    dayOff: Day.Thursday,
    unavailable: [],
  },
  {
    id: "t-omer",
    name: "Mr. Omer",
    subjects: [Subject.Computer],
    grades: allGrades,
    dayOff: Day.Monday,
    unavailable: [],
  },
  {
    id: "t-dafna",
    name: "Ms. Dafna",
    subjects: ["art"],
    grades: allGrades,
    dayOff: Day.Tuesday,
    unavailable: [],
  },
  {
    id: "t-ronen",
    name: "Mr. Ronen",
    subjects: ["history", "geography"],
    grades: allGrades,
    dayOff: Day.Monday,
    unavailable: [],
  },
  {
    id: "t-tova",
    name: "Ms. Tova",
    subjects: ["bible"],
    grades: allGrades,
    dayOff: Day.Sunday,
    unavailable: [],
  },
  // Backup teachers so no subject relies on a single teacher (the demo
  // schedule fits without dropped blocks even when default-teacher
  // constraints lock parts of the grid).
  {
    id: "t-dani",
    name: "Coach Dani",
    subjects: [Subject.Sport],
    grades: allGrades,
    dayOff: Day.Wednesday,
    unavailable: [],
  },
  {
    id: "t-rina",
    name: "Ms. Rina",
    subjects: ["art"],
    grades: allGrades,
    dayOff: Day.Wednesday,
    unavailable: [],
  },
  {
    id: "t-eli",
    name: "Mr. Eli",
    subjects: ["history", "geography"],
    grades: allGrades,
    dayOff: Day.Wednesday,
    unavailable: [],
  },
];

// Each trend sums to 22h. Classes set endHour=12 below — minimum school day
// 4h × 5 = 20h, max 5h × 5 = 25h. The 2h slack between subjects total (22h)
// and minimum lets the solver shuffle blocks around special-room contention
// (sport hall, music room, computer lab) without dropping anything.
// Grade A regular — 25h, fits the 5h minimum exactly (finishes 13:00).
const standardSubjects: ClassSubject[] = [
  { subject: Subject.Math, hoursPerWeek: 5 },
  { subject: Subject.Hebrew, hoursPerWeek: 5 },
  { subject: Subject.English, hoursPerWeek: 4 },
  { subject: Subject.Science, hoursPerWeek: 3 },
  { subject: Subject.Sport, hoursPerWeek: 1 },
  { subject: Subject.Music, hoursPerWeek: 1 },
  { subject: Subject.Computer, hoursPerWeek: 1 },
  { subject: "art", hoursPerWeek: 2 },
  { subject: "history", hoursPerWeek: 1 },
  { subject: "geography", hoursPerWeek: 1 },
  { subject: "bible", hoursPerWeek: 1 },
];

// Grade B regular — 30h, extends to ~14:00 on most days.
const longerSubjects: ClassSubject[] = [
  { subject: Subject.Math, hoursPerWeek: 5 },
  { subject: Subject.Hebrew, hoursPerWeek: 5 },
  { subject: Subject.English, hoursPerWeek: 4 },
  { subject: Subject.Science, hoursPerWeek: 4 },
  { subject: Subject.Sport, hoursPerWeek: 1 },
  { subject: Subject.Music, hoursPerWeek: 1 },
  { subject: Subject.Computer, hoursPerWeek: 1 },
  { subject: "art", hoursPerWeek: 2 },
  { subject: "history", hoursPerWeek: 2 },
  { subject: "geography", hoursPerWeek: 2 },
  { subject: "bible", hoursPerWeek: 3 },
];

// Grade B extended trend — 33h, fits inside the weekly per-day cap sum
// (Sun 7 + Mon 6 + Tue 8 + Wed 7 + Thu 5 = 33 slots).
const extendedSubjects: ClassSubject[] = [
  { subject: Subject.Math, hoursPerWeek: 6 },
  { subject: Subject.Hebrew, hoursPerWeek: 5 },
  { subject: Subject.English, hoursPerWeek: 5 },
  { subject: Subject.Science, hoursPerWeek: 4 },
  { subject: Subject.Sport, hoursPerWeek: 1 },
  { subject: Subject.Music, hoursPerWeek: 1 },
  { subject: Subject.Computer, hoursPerWeek: 1 },
  { subject: "art", hoursPerWeek: 2 },
  { subject: "history", hoursPerWeek: 2 },
  { subject: "geography", hoursPerWeek: 2 },
  { subject: "bible", hoursPerWeek: 4 },
];

export const classes: SchoolClass[] = [
  {
    id: "A1",
    grade: Grade.A,
    section: 1,
    name: "A1",
    defaultTeacherId: "t-cohen",
    defaultRoomId: "room-A1",
    endHour: 13,
    subjects: standardSubjects,
  },
  {
    id: "A2",
    grade: Grade.A,
    section: 2,
    name: "A2",
    defaultTeacherId: "t-david",
    defaultRoomId: "room-A2",
    endHour: 13,
    subjects: standardSubjects,
  },
  {
    id: "B1",
    grade: Grade.B,
    section: 1,
    name: "B1",
    defaultTeacherId: "t-sarah",
    defaultRoomId: "room-B1",
    endHour: 13,
    subjects: longerSubjects,
  },
  {
    id: "B2",
    grade: Grade.B,
    section: 2,
    trendName: "extended",
    name: "B2",
    defaultTeacherId: "t-shapiro",
    defaultRoomId: "room-B2",
    endHour: 13,
    subjects: extendedSubjects,
  },
];

export const trends: Trend[] = [
  { grade: Grade.A, subjects: standardSubjects },
  { grade: Grade.B, subjects: longerSubjects },
  { grade: Grade.B, trendName: "extended", subjects: extendedSubjects },
];

export const demoInput: SchoolInput = {
  config,
  rooms,
  teachers,
  classes,
  trends,
};
