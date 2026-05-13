// Lightweight i18n: a string dictionary plus React context.
// Adds Hebrew (RTL) alongside English; switches document direction on change.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Day, Subject } from "./types";

export type Lang = "en" | "he";

const LANG_KEY = "lang";

const STRINGS = {
  en: {
    appTitle: "School Timetable Builder",
    appSubtitle:
      "Define teachers and classes, then generate a weekly timetable that satisfies all constraints.",

    // toolbar / header
    generate: "Generate Timetable",
    solving: "Solving…",
    signOut: "Sign out",
    loading: "Loading…",
    saving: "Saving…",
    saved: "Saved ✓",
    saveFailed: "Save failed",
    scheduledIn: "Scheduled {n} blocks in {ms} ms",

    // stats
    statTeachers: "Teachers",
    statClasses: "Classes",
    statHours: "Hours / week",
    statDays: "Days",
    statSlots: "Hourly slots / day",
    statSchoolDay: "School day",

    // sections
    teachersSection: "Teachers",
    classesSection: "Classes",
    countTeachersOne: "teacher",
    countTeachersMany: "teachers",
    countClassesOne: "class",
    countClassesMany: "classes",

    addTeacher: "+ Add teacher",
    addClass: "+ Add class",
    addTeacherFirst: "Add at least one teacher first",
    emptyTeachers: "No teachers yet. Click + Add teacher to start.",
    emptyClassesNoTeachers:
      "Add at least one teacher first, then add classes.",
    emptyClasses:
      "No classes yet. Click + Add class to create the first one.",

    // teacher card
    grades: "Grades",
    off: "Off",
    allDay: "all day",

    // class card
    teacherLabel: "Teacher",
    roomLabel: "Room",

    edit: "Edit",
    delete: "Delete",

    // confirms
    confirmRemoveTeacher:
      "This teacher is the default teacher for one or more classes. Remove anyway?",

    // teacher form
    newTeacher: "New teacher",
    editTeacher: "Edit teacher",
    fieldName: "Name",
    fieldNamePlaceholder: "e.g. Ms. Smith",
    fieldSubjects: "Subjects",
    fieldGrades: "Grades they can teach",
    fieldDayOff: "Day off",
    fieldUnavailable: "Other unavailable windows",
    optional: "(optional)",
    addWindow: "+ Window",
    leaveTimesEmpty: "Leave times empty to mean the entire day.",
    saveTeacher: "Save teacher",
    saveChanges: "Save changes",
    cancel: "Cancel",
    errNameRequired: "Name is required",
    errPickSubject: "Pick at least one subject",
    errPickGrade: "Pick at least one grade",
    gradePrefix: "Grade",

    // class form
    newClass: "New class",
    editClass: "Edit class {id}",
    fieldGrade: "Grade",
    fieldSection: "Section",
    fieldDefaultTeacher: "Default teacher",
    selectDots: "Select…",
    noDefaultTeacher: "(no default — solver picks)",
    fieldRoomName: "Class location (room)",
    roomPlaceholder: "Room name",
    defaultTeacherNote:
      "For subjects this teacher can teach, they will be forced for this class. Leave empty to let the solver choose.",
    fieldSubjectsHours: "Subjects (hours / week)",
    addSubject: "+ Add subject",
    subjectPlaceholder: "Subject name",
    saveClassWithId: "Save class ({id})",
    saveChangesToId: "Save changes to {id}",
    errSelectTeacher: "Select a default teacher",
    errClassExists: 'Class "{id}" already exists',
    errSetHours: "Set hours/week for at least one subject",

    // class name display ("Class A1")
    classWord: "Class",

    // timetable
    generated: "Generated Timetable",
    byClass: "By class",
    byTeacher: "By teacher",

    // login
    loginTagline:
      "Build conflict-free weekly schedules for every class and teacher in seconds.",
    feature1: "Automatic constraint solving in milliseconds",
    feature2: "Teacher availability, day-off, and grade rules",
    feature3: "Special rooms for sport, computer, and music",
    feature4: "Per-user saved configurations",
    loginFinePrint: "Only invited Google accounts can access this app.",
    loginFooterPrefix: "Built with React + Node ·",
    loginFooterLink: "Source on GitHub",
  },
  he: {
    appTitle: "בונה מערכת שעות בית-ספרית",
    appSubtitle:
      "הגדירו מורים וכיתות, וייצרו מערכת שעות שבועית העונה על כל האילוצים.",

    generate: "צור מערכת שעות",
    solving: "מחשב…",
    signOut: "התנתק",
    loading: "טוען…",
    saving: "שומר…",
    saved: "נשמר ✓",
    saveFailed: "שמירה נכשלה",
    scheduledIn: "נוצרו {n} שיעורים תוך {ms} מ\"ש",

    statTeachers: "מורים",
    statClasses: "כיתות",
    statHours: "שעות / שבוע",
    statDays: "ימים",
    statSlots: "משבצות בשעה ביום",
    statSchoolDay: "יום לימודים",

    teachersSection: "מורים",
    classesSection: "כיתות",
    countTeachersOne: "מורה",
    countTeachersMany: "מורים",
    countClassesOne: "כיתה",
    countClassesMany: "כיתות",

    addTeacher: "+ הוסף מורה",
    addClass: "+ הוסף כיתה",
    addTeacherFirst: "יש להוסיף לפחות מורה אחד תחילה",
    emptyTeachers: "עדיין אין מורים. לחצו על + הוסף מורה כדי להתחיל.",
    emptyClassesNoTeachers: "יש להוסיף לפחות מורה אחד לפני יצירת כיתות.",
    emptyClasses: "עדיין אין כיתות. לחצו על + הוסף כיתה ליצירת הראשונה.",

    grades: "שכבות",
    off: "חופש ב-",
    allDay: "כל היום",

    teacherLabel: "מורה",
    roomLabel: "חדר",

    edit: "ערוך",
    delete: "מחק",

    confirmRemoveTeacher:
      "מורה זה מוגדר כברירת מחדל באחת או יותר מהכיתות. למחוק בכל זאת?",

    newTeacher: "מורה חדש",
    editTeacher: "עריכת מורה",
    fieldName: "שם",
    fieldNamePlaceholder: "לדוגמה, גב' כהן",
    fieldSubjects: "מקצועות",
    fieldGrades: "שכבות שאפשר ללמד",
    fieldDayOff: "יום חופש",
    fieldUnavailable: "חלונות זמן נוספים שאינם זמינים",
    optional: "(אופציונלי)",
    addWindow: "+ חלון",
    leaveTimesEmpty: "השאירו את שדות הזמן ריקים כדי לסמן את כל היום.",
    saveTeacher: "שמור מורה",
    saveChanges: "שמור שינויים",
    cancel: "בטל",
    errNameRequired: "יש להזין שם",
    errPickSubject: "יש לבחור לפחות מקצוע אחד",
    errPickGrade: "יש לבחור לפחות שכבה אחת",
    gradePrefix: "שכבה",

    newClass: "כיתה חדשה",
    editClass: "עריכת כיתה {id}",
    fieldGrade: "שכבה",
    fieldSection: "מספר",
    fieldDefaultTeacher: "מורה ברירת מחדל",
    selectDots: "בחרו…",
    noDefaultTeacher: "(ללא ברירת מחדל — הפותר יבחר)",
    fieldRoomName: "מיקום הכיתה (חדר)",
    roomPlaceholder: "שם החדר",
    defaultTeacherNote:
      "במקצועות שמורה זה מלמד, הוא יחויב ללמד את הכיתה הזו. השאירו ריק כדי שהפותר יבחר.",
    fieldSubjectsHours: "מקצועות (שעות / שבוע)",
    addSubject: "+ הוסף מקצוע",
    subjectPlaceholder: "שם המקצוע",
    saveClassWithId: "שמור כיתה ({id})",
    saveChangesToId: "שמור שינויים לכיתה {id}",
    errSelectTeacher: "יש לבחור מורה ברירת מחדל",
    errClassExists: 'כיתה "{id}" כבר קיימת',
    errSetHours: "יש להגדיר שעות לפחות למקצוע אחד",

    classWord: "כיתה",

    generated: "מערכת השעות שנוצרה",
    byClass: "לפי כיתה",
    byTeacher: "לפי מורה",

    loginTagline:
      "צרו מערכת שעות שבועית ללא התנגשויות, עבור כל כיתה וכל מורה, תוך שניות.",
    feature1: "פתרון אילוצים אוטומטי במילי-שניות",
    feature2: "כללי זמינות, יום חופש ושכבות לכל מורה",
    feature3: "חדרים ייעודיים לספורט, מחשבים ומוזיקה",
    feature4: "תצורות שמורות בנפרד לכל משתמש",
    loginFinePrint: "רק חשבונות Google מורשים יכולים להיכנס לאתר זה.",
    loginFooterPrefix: "נבנה עם React ו-Node ·",
    loginFooterLink: "קוד המקור ב-GitHub",
  },
} as const;

type StringKey = keyof (typeof STRINGS)["en"];

const DAY_NAMES: Record<Lang, Record<Day, string>> = {
  en: {
    [Day.Sunday]: "Sunday",
    [Day.Monday]: "Monday",
    [Day.Tuesday]: "Tuesday",
    [Day.Wednesday]: "Wednesday",
    [Day.Thursday]: "Thursday",
  },
  he: {
    [Day.Sunday]: "ראשון",
    [Day.Monday]: "שני",
    [Day.Tuesday]: "שלישי",
    [Day.Wednesday]: "רביעי",
    [Day.Thursday]: "חמישי",
  },
};

const SUBJECT_NAMES: Record<Lang, Record<string, string>> = {
  en: {
    [Subject.Math]: "math",
    [Subject.Hebrew]: "hebrew",
    [Subject.English]: "english",
    [Subject.Science]: "science",
    [Subject.Sport]: "sport",
    [Subject.Music]: "music",
    [Subject.Computer]: "computer",
  },
  he: {
    [Subject.Math]: "מתמטיקה",
    [Subject.Hebrew]: "עברית",
    [Subject.English]: "אנגלית",
    [Subject.Science]: "מדעים",
    [Subject.Sport]: "ספורט",
    [Subject.Music]: "מוזיקה",
    [Subject.Computer]: "מחשבים",
  },
};

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    String(vars[k] ?? `{${k}}`)
  );
}

export interface I18nApi {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  tDay: (d: Day) => string;
  /** Translates well-known Subject enum values; returns the string as-is for custom subjects. */
  tSubject: (s: string) => string;
  tClassName: (id: string) => string;
}

const I18nCtx = createContext<I18nApi | null>(null);

function readInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(LANG_KEY);
  if (saved === "he" || saved === "en") return saved;
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readInitialLang());

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(LANG_KEY, l);
    } catch {
      // ignore (private mode, etc.)
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  }, [lang]);

  const value: I18nApi = {
    lang,
    setLang,
    t: (key, vars) => interpolate(STRINGS[lang][key] ?? STRINGS.en[key] ?? key, vars),
    tDay: (d) => DAY_NAMES[lang][d] ?? d,
    tSubject: (s) => SUBJECT_NAMES[lang][s] ?? s,
    tClassName: (id) => `${STRINGS[lang].classWord} ${id}`,
  };

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useT(): I18nApi {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useT must be used within I18nProvider");
  return ctx;
}
