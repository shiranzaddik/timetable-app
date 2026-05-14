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
    gradesSection: "Trends",
    roomsSection: "Rooms",
    countTeachersOne: "teacher",
    countTeachersMany: "teachers",
    countClassesOne: "class",
    countClassesMany: "classes",
    countGradesOne: "trend",
    countGradesMany: "trends",
    countRoomsOne: "room",
    countRoomsMany: "rooms",
    addRoom: "+ Add room",
    emptyRooms:
      "No rooms yet. Add at least one regular room — you'll be able to pick it as a class's location.",
    newRoom: "New room",
    editRoom: "Edit room",
    fieldRoomType: "Type",
    roomTypeRegular: "Regular classroom",
    roomTypeSport: "Sport hall",
    roomTypeComputer: "Computer lab",
    roomTypeMusic: "Music room",
    saveRoom: "Save room",
    pickRoom: "Pick a room",
    addRoomsFirst: "Add at least one room first",
    confirmRemoveRoom: "This room is in use by one or more classes. Remove anyway?",

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
    fieldGradesPerSubject: "Grades per subject",
    perSubjectGradesHint:
      "By default, the teacher teaches each chosen subject to every grade. Uncheck a grade to restrict that subject.",
    fieldDayOff: "Day off *",
    dayOffSoftNote:
      "* We try to honor the day off but may schedule lessons here if no other slot fits.",
    fieldVacation: "Time off & preferences",
    vacationHint:
      "Add the days/times this teacher can't work, or would prefer not to. Leave times empty for an entire day. Pick \"Prefer not\" if you're OK with the solver overriding it.",
    addVacation: "+ Add time-off",
    canBeDefaultLabel: "Can be a class's homeroom teacher",
    canBeDefaultHint:
      "When off, the solver won't auto-assign this teacher as a homeroom even if no explicit one is set for the class.",
    cantWork: "Can't",
    preferNot: "Prefer not",
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
    mandatoryLabel: "Mandatory",
    mandatoryGradeNote: "Applies to every class in this grade.",
    droppedHeading: "Subjects the solver couldn't schedule",
    droppedHint:
      "Mark them mandatory only if you add more teachers — otherwise they will keep being skipped.",
    droppedLine: "{className}: {subject} — {hours}h missing",
    unusedTeachersHeading: "Teachers not needed",
    unusedTeachersHint:
      "These teachers ended up with no assigned lessons. You can remove them or assign them to more subjects.",
    dayOffSuggestionsHeading: "Day-off suggestions",
    dayOffSuggestionsHint:
      "Moving these teachers to a different day off would have placed more lessons.",
    dayOffSuggestionLine:
      "{teacherName}: change day off from {currentDay} to {suggestedDay} (+{count} blocks)",
    assignedHomeroomsHeading: "Auto-assigned homeroom teachers",
    assignedHomeroomsHint:
      "These classes had no default (homeroom) teacher — the solver picked the best fit.",
    assignedHomeroomLine: "{className}: {teacherName}",
    saveClassWithId: "Save class ({id})",
    saveChangesToId: "Save changes to {id}",
    editGradeSubjects: "Edit subjects for trend {grade}",
    saveGradeSubjects: "Save subjects",
    gradeBadgePrefix: "Trend",
    classesInGrade: "{n} classes",
    fieldTrendSpecialization: "Trend specialization (optional)",
    trendPlaceholder: "e.g. science, sport, computers",
    trendSpecializationHint:
      "Leave empty for the regular trend. Classes that share the same grade + specialization share one subjects list.",
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
      "הגדירו מורים וכיתות, וצרו מערכת שעות שבועית העונה על כל האילוצים.",

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
    gradesSection: "מסלולים",
    roomsSection: "חדרים",
    countTeachersOne: "מורה",
    countTeachersMany: "מורים",
    countClassesOne: "כיתה",
    countClassesMany: "כיתות",
    countGradesOne: "מסלול",
    countGradesMany: "מסלולים",
    countRoomsOne: "חדר",
    countRoomsMany: "חדרים",
    addRoom: "+ הוסף חדר",
    emptyRooms:
      "אין עדיין חדרים. הוסיפו לפחות חדר רגיל אחד — ניתן יהיה לבחור בו כמיקום כיתה.",
    newRoom: "חדר חדש",
    editRoom: "עריכת חדר",
    fieldRoomType: "סוג",
    roomTypeRegular: "כיתה רגילה",
    roomTypeSport: "אולם ספורט",
    roomTypeComputer: "מעבדת מחשבים",
    roomTypeMusic: "חדר מוזיקה",
    saveRoom: "שמור חדר",
    pickRoom: "בחרו חדר",
    addRoomsFirst: "יש להוסיף חדרים תחילה",
    confirmRemoveRoom: "החדר משוייך לכיתה אחת או יותר. למחוק בכל זאת?",

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
    fieldGradesPerSubject: "שכבות לכל מקצוע",
    perSubjectGradesHint:
      "כברירת מחדל, המורה מלמד כל מקצוע שנבחר בכל השכבות. ניתן להסיר שכבה כדי לצמצם.",
    fieldDayOff: "יום חופש *",
    dayOffSoftNote:
      "* ננסה לכבד את יום החופש, אבל ייתכן שיוקצו שיעורים גם בו אם לא יימצאו זמנים אחרים.",
    fieldVacation: "ימים/שעות חופש והעדפות",
    vacationHint:
      "הוסיפו ימים ושעות בהם המורה לא יכול ללמד, או מעדיף שלא. השאירו שעות ריקות ליום שלם. בחרו \"מעדיף שלא\" כאשר אפשר לחרוג מכך אם צריך.",
    addVacation: "+ הוסף חופש",
    canBeDefaultLabel: "יכול להיות מחנך של כיתה",
    canBeDefaultHint:
      "כאשר כבוי, הפותר לא יבחר אוטומטית מורה זה כמחנך גם אם לא נקבע מחנך מפורש לכיתה.",
    cantWork: "לא יכול",
    preferNot: "מעדיף שלא",
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
    fieldDefaultTeacher: "מחנך",
    selectDots: "בחרו…",
    noDefaultTeacher: "(ללא ברירת מחדל — הפותר יבחר)",
    fieldRoomName: "מיקום הכיתה (חדר)",
    roomPlaceholder: "שם החדר",
    defaultTeacherNote:
      "במקצועות שמורה זה מלמד, הוא יחויב ללמד את הכיתה הזו. השאירו ריק כדי שהפותר יבחר.",
    fieldSubjectsHours: "מקצועות (שעות / שבוע)",
    addSubject: "+ הוסף מקצוע",
    subjectPlaceholder: "שם המקצוע",
    mandatoryLabel: "חובה",
    mandatoryGradeNote: "החל על כל הכיתות בשכבה זו.",
    droppedHeading: "מקצועות שלא ניתן היה לשבץ",
    droppedHint:
      "סמנו כחובה רק אם תוסיפו מורים נוספים — אחרת המקצועות הללו ימשיכו להידלג.",
    droppedLine: "{className}: {subject} — חסרות {hours} שעות",
    unusedTeachersHeading: "מורים שאינם נחוצים",
    unusedTeachersHint:
      "המורים הבאים לא קיבלו שיעורים במערכת הזו. אפשר להסיר אותם או להוסיף להם מקצועות.",
    dayOffSuggestionsHeading: "הצעות לשינוי יום חופש",
    dayOffSuggestionsHint:
      "שינוי יום החופש למורים הבאים היה מאפשר לשבץ עוד שיעורים.",
    dayOffSuggestionLine:
      "{teacherName}: לשנות יום חופש מ-{currentDay} ל-{suggestedDay} (+{count} שיעורים)",
    assignedHomeroomsHeading: "מחנכים שהוקצו אוטומטית",
    assignedHomeroomsHint:
      "לכיתות הבאות לא הוגדר מחנך — הפותר בחר מחנך מתאים על פי המקצועות שהוא מלמד.",
    assignedHomeroomLine: "{className}: {teacherName}",
    saveClassWithId: "שמור כיתה ({id})",
    saveChangesToId: "שמור שינויים לכיתה {id}",
    editGradeSubjects: "עריכת מקצועות למסלול {grade}",
    saveGradeSubjects: "שמור מקצועות",
    gradeBadgePrefix: "מסלול",
    classesInGrade: "{n} כיתות",
    fieldTrendSpecialization: "התמחות במסלול (אופציונלי)",
    trendPlaceholder: "לדוגמה: מדעים, ספורט, מחשבים",
    trendSpecializationHint:
      "השאירו ריק למסלול הרגיל. כיתות עם אותה שכבה + התמחות חולקות אותו ערך מקצועות.",
    errSelectTeacher: "יש לבחור מחנך",
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
    art: "art",
    history: "history",
    geography: "geography",
    bible: "bible",
  },
  he: {
    [Subject.Math]: "מתמטיקה",
    [Subject.Hebrew]: "עברית",
    [Subject.English]: "אנגלית",
    [Subject.Science]: "מדעים",
    [Subject.Sport]: "ספורט",
    [Subject.Music]: "מוזיקה",
    [Subject.Computer]: "מחשבים",
    art: "אמנות",
    history: "היסטוריה",
    geography: "גיאוגרפיה",
    bible: 'תנ"ך',
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
