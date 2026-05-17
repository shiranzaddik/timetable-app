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
  { id: "room-B1", name: "Room B1", type: RoomType.Regular },
  { id: "room-B2", name: "Room B2", type: RoomType.Regular },
  { id: "room-C1", name: "Room C1", type: RoomType.Regular },
  { id: "room-C2", name: "Room C2", type: RoomType.Regular },
  { id: "room-D1", name: "Room D1", type: RoomType.Regular },
  { id: "room-D2", name: "Room D2", type: RoomType.Regular },
  { id: "sport-hall", name: "Sport Hall", type: RoomType.Sport },
  { id: "computer-lab", name: "Computer Lab", type: RoomType.Computer },
  { id: "music-room", name: "Music Room", type: RoomType.Music },
];

const allGrades: Grade[] = [Grade.A, Grade.B, Grade.C, Grade.D];

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
  // Extra core-subject teachers so the larger class roster fits.
  {
    id: "t-maya",
    name: "Ms. Maya",
    subjects: [Subject.Math, Subject.Hebrew],
    grades: allGrades,
    dayOff: Day.Tuesday,
    unavailable: [],
  },
  {
    id: "t-itai",
    name: "Mr. Itai",
    subjects: [Subject.Hebrew, Subject.Science],
    grades: allGrades,
    dayOff: Day.Sunday,
    unavailable: [],
  },
  {
    id: "t-talia",
    name: "Ms. Talia",
    subjects: [Subject.Math, Subject.Science],
    grades: allGrades,
    dayOff: Day.Thursday,
    unavailable: [],
  },
  {
    id: "t-tal",
    name: "Ms. Tal",
    subjects: [Subject.English],
    grades: allGrades,
    dayOff: Day.Wednesday,
    unavailable: [],
  },
];

// Each trend sums to 22h. Classes set endHour=12 below — minimum school day
// 4h × 5 = 20h, max 5h × 5 = 25h. The 2h slack between subjects total (22h)
// and minimum lets the solver shuffle blocks around special-room contention
// (sport hall, music room, computer lab) without dropping anything.
// Grade 1 (A) regular — 25h, finishes at 13:00 every day (1st graders).
const grade1Subjects: ClassSubject[] = [
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

// Grade 2 (B) regular — 27h.
const grade2Subjects: ClassSubject[] = [
  { subject: Subject.Math, hoursPerWeek: 5 },
  { subject: Subject.Hebrew, hoursPerWeek: 5 },
  { subject: Subject.English, hoursPerWeek: 4 },
  { subject: Subject.Science, hoursPerWeek: 3 },
  { subject: Subject.Sport, hoursPerWeek: 1 },
  { subject: Subject.Music, hoursPerWeek: 1 },
  { subject: Subject.Computer, hoursPerWeek: 1 },
  { subject: "art", hoursPerWeek: 2 },
  { subject: "history", hoursPerWeek: 2 },
  { subject: "geography", hoursPerWeek: 1 },
  { subject: "bible", hoursPerWeek: 2 },
];

// Grade 3 (C) regular — 29h.
const grade3Subjects: ClassSubject[] = [
  { subject: Subject.Math, hoursPerWeek: 5 },
  { subject: Subject.Hebrew, hoursPerWeek: 5 },
  { subject: Subject.English, hoursPerWeek: 5 },
  { subject: Subject.Science, hoursPerWeek: 4 },
  { subject: Subject.Sport, hoursPerWeek: 1 },
  { subject: Subject.Music, hoursPerWeek: 1 },
  { subject: Subject.Computer, hoursPerWeek: 1 },
  { subject: "art", hoursPerWeek: 2 },
  { subject: "history", hoursPerWeek: 2 },
  { subject: "geography", hoursPerWeek: 1 },
  { subject: "bible", hoursPerWeek: 2 },
];

// Grade 3 (C) science trend — 31h with stronger science.
const grade3ScienceSubjects: ClassSubject[] = [
  { subject: Subject.Math, hoursPerWeek: 5 },
  { subject: Subject.Hebrew, hoursPerWeek: 5 },
  { subject: Subject.English, hoursPerWeek: 5 },
  { subject: Subject.Science, hoursPerWeek: 6 },
  { subject: Subject.Sport, hoursPerWeek: 1 },
  { subject: Subject.Music, hoursPerWeek: 1 },
  { subject: Subject.Computer, hoursPerWeek: 1 },
  { subject: "art", hoursPerWeek: 1 },
  { subject: "history", hoursPerWeek: 2 },
  { subject: "geography", hoursPerWeek: 2 },
  { subject: "bible", hoursPerWeek: 2 },
];

// Grade 4 (D) regular — 31h.
const grade4Subjects: ClassSubject[] = [
  { subject: Subject.Math, hoursPerWeek: 5 },
  { subject: Subject.Hebrew, hoursPerWeek: 5 },
  { subject: Subject.English, hoursPerWeek: 5 },
  { subject: Subject.Science, hoursPerWeek: 4 },
  { subject: Subject.Sport, hoursPerWeek: 1 },
  { subject: Subject.Music, hoursPerWeek: 1 },
  { subject: Subject.Computer, hoursPerWeek: 1 },
  { subject: "art", hoursPerWeek: 2 },
  { subject: "history", hoursPerWeek: 2 },
  { subject: "geography", hoursPerWeek: 2 },
  { subject: "bible", hoursPerWeek: 3 },
];

// Grade 4 (D) music trend — 33h with extra music.
const grade4MusicSubjects: ClassSubject[] = [
  { subject: Subject.Math, hoursPerWeek: 5 },
  { subject: Subject.Hebrew, hoursPerWeek: 5 },
  { subject: Subject.English, hoursPerWeek: 5 },
  { subject: Subject.Science, hoursPerWeek: 4 },
  { subject: Subject.Sport, hoursPerWeek: 1 },
  { subject: Subject.Music, hoursPerWeek: 4 },
  { subject: Subject.Computer, hoursPerWeek: 1 },
  { subject: "art", hoursPerWeek: 2 },
  { subject: "history", hoursPerWeek: 2 },
  { subject: "geography", hoursPerWeek: 1 },
  { subject: "bible", hoursPerWeek: 3 },
];

export const classes: SchoolClass[] = [
  // Grade 1
  {
    id: "A1",
    grade: Grade.A,
    section: 1,
    name: "A1",
    defaultTeacherId: "t-cohen",
    defaultRoomId: "room-A1",
    endHour: 13,
    subjects: grade1Subjects,
  },
  {
    id: "A2",
    grade: Grade.A,
    section: 2,
    name: "A2",
    defaultTeacherId: "t-maya",
    defaultRoomId: "room-A2",
    endHour: 13,
    subjects: grade1Subjects,
  },
  // Grade 2
  {
    id: "B1",
    grade: Grade.B,
    section: 1,
    name: "B1",
    defaultTeacherId: "t-david",
    defaultRoomId: "room-B1",
    endHour: 13,
    subjects: grade2Subjects,
  },
  {
    id: "B2",
    grade: Grade.B,
    section: 2,
    name: "B2",
    defaultTeacherId: "t-itai",
    defaultRoomId: "room-B2",
    endHour: 13,
    subjects: grade2Subjects,
  },
  // Grade 3
  {
    id: "C1",
    grade: Grade.C,
    section: 1,
    name: "C1",
    defaultTeacherId: "t-sarah",
    defaultRoomId: "room-C1",
    endHour: 13,
    subjects: grade3Subjects,
  },
  {
    id: "C2",
    grade: Grade.C,
    section: 2,
    trendName: "science",
    name: "C2",
    defaultTeacherId: "t-levi",
    defaultRoomId: "room-C2",
    endHour: 13,
    subjects: grade3ScienceSubjects,
  },
  // Grade 4
  {
    id: "D1",
    grade: Grade.D,
    section: 1,
    name: "D1",
    defaultTeacherId: "t-talia",
    defaultRoomId: "room-D1",
    endHour: 13,
    subjects: grade4Subjects,
  },
  {
    id: "D2",
    grade: Grade.D,
    section: 2,
    trendName: "music",
    name: "D2",
    defaultTeacherId: "t-mira",
    defaultRoomId: "room-D2",
    endHour: 13,
    subjects: grade4MusicSubjects,
  },
];

export const trends: Trend[] = [
  { grade: Grade.A, subjects: grade1Subjects },
  { grade: Grade.B, subjects: grade2Subjects },
  { grade: Grade.C, subjects: grade3Subjects },
  { grade: Grade.C, trendName: "science", subjects: grade3ScienceSubjects },
  { grade: Grade.D, subjects: grade4Subjects },
  { grade: Grade.D, trendName: "music", subjects: grade4MusicSubjects },
];

export const demoInput: SchoolInput = {
  config,
  rooms,
  teachers,
  classes,
  trends,
};
