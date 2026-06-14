// Lightweight i18n: a string dictionary plus React context.
// Adds Hebrew (RTL) alongside English; switches document direction on change.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Day, Grade, Subject, type Room, type SubjectDef, type Teacher } from "./types";

export type Lang = "en" | "he";

const LANG_KEY = "lang";

const STRINGS = {
  en: {
    hoursShort: "h",
    appTitle: "The smart way to build a school timetable",
    appSubtitle:
      "Define teachers, classes and constraints — get an optimized timetable automatically in seconds.",

    // toolbar / header
    generate: "Generate Timetable",
    solving: "Solving…",
    clearAll: "Clear all (delete demo)",
    confirmClearAll:
      "Delete every teacher, class and room? This wipes your saved data and starts you with an empty school.",
    loadDemo: "Reset to demo",
    confirmLoadDemo:
      "Replace your current data with the latest demo school? Anything unsaved will be lost.",
    signOut: "Sign out",
    loading: "Loading…",
    saving: "Saving…",
    saved: "Saved ✓",
    saveFailed: "Save failed",
    scheduledIn: "",

    // stats
    statTeachers: "Teachers",
    statClasses: "Classes",
    statHours: "Hours / week",
    statDays: "Days",
    statSlots: "Hourly slots / day",
    statSchoolDay: "School day",
    statSchoolDayMax: "School day (max)",
    perDayShow: "Per-day…",
    perDayHide: "Done",

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
    addSubjectSection: "+ Add subject",
    newSubjectHeading: "New subject",
    editSubjectHeading: "Edit subject",
    fieldSubjectName: "Name",
    saveSubject: "Save subject",
    subjectsSection: "Subjects",
    countSubjectsOne: "subject",
    countSubjectsMany: "subjects",
    emptySubjects:
      "No subjects yet. Add one to enable picking subjects in trends and teachers.",
    errSubjectNameExists:
      "A subject named \"{name}\" already exists. Pick a different name.",
    errCannotRemoveSubjectInUse:
      "This subject is used by trends or teachers. Remove those references first.",
    confirmDeleteSubject: "Delete subject \"{name}\"?",
    addTrend: "+ Add trend",
    newTrend: "New trend",
    saveTrend: "Save trend",
    fieldTrendGrade: "Grade",
    fieldTrendNameOptional: "Trend name (optional)",
    trendExistsAlready: "This trend already exists.",
    emptyTrends:
      "No trends yet. Add one to define the subjects each grade studies.",
    confirmRemoveTrendWithClasses:
      "This trend has classes assigned to it. Remove anyway? The classes will move to the regular trend of the grade.",
    errCannotRemoveDefaultTrend:
      "Can't delete the default trend while classes still use it. Move those classes to a different trend or delete them first.",
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

    sortBy: "Sort by",
    sortByName: "Name",
    sortBySubject: "Subject",
    sortByGrade: "Grade",
    teacherSearchPlaceholder: "Search name, subject, grade…",
    teacherSearchEmpty: "No teachers match your search.",
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
    off: "Off {day}",
    preferOff: "Prefers off {day}",
    allDay: "all day",

    // class card
    teacherLabel: "Teacher",
    roomLabel: "Room",

    edit: "Edit",
    delete: "Delete",

    // confirms
    confirmRemoveTeacher:
      "This teacher is the default teacher for one or more classes. Remove anyway?",
    confirmDeleteTeacherSimple: "Delete teacher {name}?",
    confirmDeleteClassSimple: "Delete class {name}?",
    deleteTeacherTitle: "Delete {name}?",
    deleteTeacherBodyOne:
      "{name} is the homeroom of class {classes}. Deleting will clear that homeroom assignment; a new one will be picked automatically when the schedule is generated.",
    deleteTeacherBodyMany:
      "{name} is the homeroom of classes {classes}. Deleting will clear those homeroom assignments; new ones will be picked automatically when the schedule is generated.",
    deleteTeacherFootnote: "",
    deleteTeacherConfirm: "Delete teacher",
    homeroomLabel: "Homeroom of",
    homeroomOfShort: "Homeroom of {className}",

    // teacher form
    newTeacher: "New teacher",
    editTeacher: "Edit teacher",
    fieldName: "Name",
    fieldNamePlaceholder: "e.g. Rachel Cohen",
    fieldSubjects: "Subjects",
    fieldGrades: "Grades they can teach",
    fieldGradesPerSubject: "Subjects",
    perSubjectGradesHint: "",
    fieldDayOff: "Day off *",
    dayOffSoftNote:
      "* We try to honor the day off but may schedule lessons here if no other slot fits.",
    fieldVacation: "Days off",
    vacationHint: "",
    addVacation: "+ Add time-off",
    fieldHomerooms: "Homeroom of (class)",
    fieldHomeroomsHint: "",
    fieldHomeroomsNoClasses: "Add classes first to set a homeroom here.",
    canBeDefaultLabel: "Can be auto-assigned as homeroom",
    canBeDefaultHint: "",
    cantWork: "Can't",
    preferNot: "Prefer not",
    colDay: "Day",
    colFrom: "From",
    colTo: "To",
    colType: "Type",
    classHoursLabel: "Minimum study hours per day",
    classHoursHint: "",
    classHoursFrom: "From",
    classHoursTo: "Until",
    errEndHourBeforeStart: "End hour must be after start hour.",
    fieldUnavailable: "Other unavailable windows",
    optional: "(optional)",
    addWindow: "+ Window",
    leaveTimesEmpty: "Leave times empty to mean the entire day.",
    saveTeacher: "Save teacher",
    saveChanges: "Save changes",
    cancel: "Cancel",
    errNameRequired: "Name is required",
    errTeacherNameExists:
      "A teacher named \"{name}\" already exists. Use a slightly different name (e.g., add a subject in parentheses).",
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
    noDefaultTeacher: "(no default - auto-pick)",
    fieldRoomName: "Class location (room)",
    roomPlaceholder: "Room name",
    defaultTeacherNote: "",
    fieldSubjectsHours: "Subjects (hours / week)",
    addSubject: "+ Add subject",
    subjectPlaceholder: "Subject name",
    mandatoryLabel: "Mandatory",
    mandatoryGradeNote: "Applies to every class in this grade.",
    blockSizeLabel: "Block",
    blockSizeHint:
      "How many consecutive hours the solver schedules in one go. 2h = paired (e.g., a 5h subject becomes 2+2+1). 1h = each hour stands alone.",
    blockSizeTooltip: "Block: {size}h",
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
    trendHoursLabel: "School day for this trend (hours)",
    trendHoursHint:
      "Default is the global school day (set at the top). Use a smaller window if this trend ends earlier than the rest.",
    gradeBadgePrefix: "Trend",
    classesInTrend: "{n} classes in this trend",
    fieldTrendSpecialization: "Trend",
    trendPlaceholder: "e.g. science, sport, computers",
    trendSpecializationHint: "",
    trendAddNew: "+ New trend…",
    noTrendOption: "No trend",
    errTrendNameRequired: "Enter a name for the new trend",

    // recommendations
    recommendationsHeading: "Recommendations",
    recClassUnderfilledHeader:
      "{className}: subjects don't fill the {start}:00–{end}:00 school day ({total}h / {target}h needed)",
    recClassUnderfilledDetail:
      "Currently averaging {have}/day vs the {need}/day needed. {missing}h missing per week.",
    recAddHoursToTrend:
      "Add {missing} more hours to Trend {trend}'s subjects.",
    recShortenSchoolDay:
      "Shorten {className}'s school day (raise start or lower end).",
    recLowerMandatoryRange:
      "Decrease the mandatory hours range for {className}.",
    recEditTrend: "Edit Trend {trend}",
    recEditClass: "Edit Class {className}",
    recOpenTeachers: "Open Teachers",
    recOpenTrends: "Open Trends",
    recOpenClasses: "Open Classes",
    recMandatoryOverflowHeader:
      "Some mandatory subjects couldn't be scheduled. Try these in order:",
    recMandatoryOption1: "Give existing teachers more subjects/grades.",
    recMandatoryOption2: "Cancel a day off for the busiest teacher.",
    recMandatoryOption2Named:
      "Cancel a day off for the busiest teacher ({teacher}).",
    recEditTeacher: "Edit {teacher}",
    recMandatoryOption3: "Add more teachers.",
    recMandatoryOption4: "Mark some subjects as optional.",
    recMandatoryOption5:
      "Decrease the mandatory hours range for the class (raise start or lower end on the affected class).",
    recMandatoryOption6:
      "Remove or relax some teachers' time-off windows so they can teach in more slots.",
    roomAutoLinked:
      "Auto-linked to {roomName}. Rename or change its type in the Rooms section.",
    errSelectTeacher: "Select a default teacher",
    errClassExists: 'Class "{id}" already exists',
    errSetHours: "Set hours/week for at least one subject",
    errSubjectDuplicate: "Subject \"{name}\" appears more than once.",
    errTeacherAlreadyHomeroom:
      "This teacher is already the homeroom of class {className}. Remove them from there first.",

    // class name display ("Class A1")
    classWord: "Class",

    // timetable
    generated: "Generated Timetable",
    byClass: "By class",
    byTeacher: "By teacher",
    print: "Print current",
    printAll: "Print all classes",
    printHint: "Print the currently selected class's grid.",
    printAllHint: "Print one page per class, in order.",
    editingClickFirst: "Click any cell to start a swap.",
    editingClickSecond:
      "Now click the cell you want to swap with (or click the same cell again to cancel).",
    cellConflict: "Conflict",
    // snapshots / compare
    saveSnapshot: "Save snapshot",
    saveSnapshotHint:
      "Save the current generated schedule so you can compare it with later runs.",
    snapshotsHeading: "Snapshots",
    snapshotsHint:
      "Saved versions of your generated schedule. Load any to make it the current result, or compare two side-by-side.",
    snapshotDefaultLabel: "Snapshot {n}",
    snapshotRenameHint: "Click to rename",
    snapshotLoad: "Load",
    snapshotBlocks: "blocks",
    snapshotDropped: "dropped",
    compare: "Compare…",
    compareHeading: "Compare snapshots",
    compareHint:
      "Pick two snapshots and a class. Cells that differ between the two are outlined.",
    compareSnapshotA: "Snapshot A",
    compareSnapshotB: "Snapshot B",
    compareClose: "Close",

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
    hoursShort: "שעות",
    appTitle: "הדרך החכמה לבניית מערכת שעות לבית הספר",
    appSubtitle:
      "הגדירו מורים, כיתות ואילוצים – וקבלו אוטומטית מערכת שעות אופטימלית תוך שניות",

    generate: "צור מערכת שעות",
    solving: "מחשב…",
    clearAll: "מחק הכל (מחיקת הדמו)",
    confirmClearAll:
      "למחוק את כל המורים, הכיתות והחדרים? פעולה זו מוחקת את הנתונים השמורים ומשאירה בית-ספר ריק.",
    loadDemo: "טען מחדש את הדמו",
    confirmLoadDemo:
      "להחליף את הנתונים הנוכחיים בנתוני הדמו העדכניים? נתונים שלא נשמרו ייאבדו.",
    signOut: "התנתק",
    loading: "טוען…",
    saving: "שומר…",
    saved: "נשמר ✓",
    saveFailed: "שמירה נכשלה",
    scheduledIn: "",

    statTeachers: "מורים",
    statClasses: "כיתות",
    statHours: "שעות / שבוע",
    statDays: "ימים",
    statSlots: "משבצות בשעה ביום",
    statSchoolDay: "יום לימודים",
    statSchoolDayMax: "יום לימודים (מקסימום)",
    perDayShow: "לכל יום…",
    perDayHide: "סיום",

    teachersSection: "מורים",
    classesSection: "כיתות",
    gradesSection: "מגמות",
    roomsSection: "חדרים",
    countTeachersOne: "מורה",
    countTeachersMany: "מורים",
    countClassesOne: "כיתה",
    countClassesMany: "כיתות",
    countGradesOne: "מגמה",
    countGradesMany: "מגמות",
    countRoomsOne: "חדר",
    countRoomsMany: "חדרים",
    addSubjectSection: "+ הוסף מקצוע",
    newSubjectHeading: "מקצוע חדש",
    editSubjectHeading: "עריכת מקצוע",
    fieldSubjectName: "שם",
    saveSubject: "שמור מקצוע",
    subjectsSection: "מקצועות",
    countSubjectsOne: "מקצוע",
    countSubjectsMany: "מקצועות",
    emptySubjects: "אין עדיין מקצועות. הוסיפו מקצוע כדי שתוכלו לבחור בו במגמות ובמורים.",
    errSubjectNameExists:
      "כבר קיים מקצוע בשם \"{name}\". בחרו שם אחר.",
    errCannotRemoveSubjectInUse:
      "המקצוע בשימוש על-ידי מגמות או מורים. הסירו את ההפניות אליו תחילה.",
    confirmDeleteSubject: "למחוק את המקצוע \"{name}\"?",
    addTrend: "+ הוסף מגמה",
    newTrend: "מגמה חדשה",
    saveTrend: "שמור מגמה",
    fieldTrendGrade: "שכבה",
    fieldTrendNameOptional: "שם המגמה (אופציונלי)",
    trendExistsAlready: "המגמה כבר קיימת.",
    emptyTrends: "אין עדיין מגמות. הוסיפו מגמה כדי להגדיר את המקצועות בכל שכבה.",
    confirmRemoveTrendWithClasses:
      "למגמה זו משויכות כיתות. להסיר בכל זאת? הכיתות יועברו למגמה הרגילה של השכבה.",
    errCannotRemoveDefaultTrend:
      "לא ניתן למחוק את המגמה הרגילה כל עוד יש כיתות המשויכות אליה. העבירו את הכיתות למגמה אחרת או מחקו אותן תחילה.",
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

    sortBy: "מיון לפי",
    sortByName: "שם",
    sortBySubject: "מקצוע",
    sortByGrade: "שכבה",
    teacherSearchPlaceholder: "חיפוש לפי שם, מקצוע או שכבה…",
    teacherSearchEmpty: "אין מורים שתואמים לחיפוש.",
    addTeacher: "+ הוסף מורה",
    addClass: "+ הוסף כיתה",
    addTeacherFirst: "יש להוסיף לפחות מורה אחד תחילה",
    emptyTeachers: "עדיין אין מורים. לחצו על + הוסף מורה כדי להתחיל.",
    emptyClassesNoTeachers: "יש להוסיף לפחות מורה אחד לפני יצירת כיתות.",
    emptyClasses: "עדיין אין כיתות. לחצו על + הוסף כיתה ליצירת הראשונה.",

    grades: "שכבות",
    off: "חופש {day}",
    preferOff: "מעדיף חופש ב{day}",
    allDay: "כל היום",

    teacherLabel: "מחנך",
    roomLabel: "חדר",

    edit: "ערוך",
    delete: "מחק",

    confirmRemoveTeacher:
      "מורה זה מוגדר כברירת מחדל באחת או יותר מהכיתות. למחוק בכל זאת?",
    confirmDeleteTeacherSimple: "למחוק את המורה {name}?",
    confirmDeleteClassSimple: "למחוק את הכיתה {name}?",
    deleteTeacherTitle: "למחוק את {name}?",
    deleteTeacherBodyOne:
      "{name} מחנך כיתה {classes}. מחיקה שלה תסיר את הקצאת המחנך של הכיתה שיבחר אוטומטית ביצירת מערכת השעות.",
    deleteTeacherBodyMany:
      "{name} מחנך הכיתות {classes}. מחיקה שלו תסיר את הקצאות המחנך של הכיתות שיבחרו אוטומטית ביצירת מערכת השעות.",
    deleteTeacherFootnote: "",
    deleteTeacherConfirm: "מחק מורה",
    homeroomLabel: "מחנך/ת של",
    homeroomOfShort: "מחנך/ת של {className}",

    newTeacher: "מורה חדש",
    editTeacher: "עריכת מורה",
    fieldName: "שם",
    fieldNamePlaceholder: "לדוגמה, רחל כהן",
    fieldSubjects: "מקצועות",
    fieldGrades: "שכבות שאפשר ללמד",
    fieldGradesPerSubject: "מקצועות",
    perSubjectGradesHint: "",
    fieldDayOff: "יום חופש *",
    dayOffSoftNote:
      "* ננסה לכבד את יום החופש, אבל ייתכן שיוקצו שיעורים גם בו אם לא יימצאו זמנים אחרים.",
    fieldVacation: "חופשים",
    vacationHint: "",
    addVacation: "+ הוסף חופש",
    fieldHomerooms: "מחנך/ת של כיתה",
    fieldHomeroomsHint: "",
    fieldHomeroomsNoClasses: "הוסיפו כיתות תחילה כדי להגדיר מחנכים.",
    canBeDefaultLabel: "יכול להבחר אוטומטית כמחנך",
    canBeDefaultHint: "",
    cantWork: "לא יכול",
    preferNot: "מעדיף שלא",
    colDay: "יום",
    colFrom: "מ-",
    colTo: "עד",
    colType: "סוג",
    classHoursLabel: "מינימום שעות לימוד ביום זה",
    classHoursHint: "",
    classHoursFrom: "מ-",
    classHoursTo: "עד",
    errEndHourBeforeStart: "שעת הסיום חייבת להיות אחרי שעת ההתחלה.",
    fieldUnavailable: "חלונות זמן נוספים שאינם זמינים",
    optional: "(אופציונלי)",
    addWindow: "+ חלון",
    leaveTimesEmpty: "השאירו את שדות הזמן ריקים כדי לסמן את כל היום.",
    saveTeacher: "שמור מורה",
    saveChanges: "שמור שינויים",
    cancel: "בטל",
    errNameRequired: "יש להזין שם",
    errTeacherNameExists:
      "מורה בשם \"{name}\" כבר קיים. השתמשו בשם מעט שונה (לדוגמה, ניתן להוסיף מקצוע בסוגריים).",
    errPickSubject: "יש לבחור לפחות מקצוע אחד",
    errPickGrade: "יש לבחור לפחות שכבה אחת",
    gradePrefix: "שכבה",

    newClass: "כיתה חדשה",
    editClass: "עריכת כיתה {id}",
    fieldGrade: "שכבה",
    fieldSection: "מספר",
    fieldDefaultTeacher: "מחנך",
    selectDots: "בחרו…",
    noDefaultTeacher: "(ללא ברירת מחדל - יבחר אוטומטית)",
    fieldRoomName: "מיקום הכיתה (חדר)",
    roomPlaceholder: "שם החדר",
    defaultTeacherNote: "",
    fieldSubjectsHours: "מקצועות (שעות / שבוע)",
    addSubject: "+ הוסף מקצוע",
    subjectPlaceholder: "שם המקצוע",
    mandatoryLabel: "חובה",
    mandatoryGradeNote: "החל על כל הכיתות בשכבה זו.",
    blockSizeLabel: "בלוק",
    blockSizeHint:
      "כמה שעות רצופות הפותר משבץ בכל פעם. 2h = מזווג (לדוגמה, מקצוע 5 שעות מתפצל ל-2+2+1). 1h = כל שעה עומדת בנפרד.",
    blockSizeTooltip: "בלוק: {size}h",
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
    editGradeSubjects: "עריכת מקצועות למגמה {grade}",
    saveGradeSubjects: "שמור מקצועות",
    trendHoursLabel: "שעות לימוד למגמה זו",
    trendHoursHint:
      "ברירת המחדל היא יום הלימודים הכללי (למעלה). שנו אם המגמה הזו מסתיימת מוקדם יותר משאר המגמות.",
    gradeBadgePrefix: "מגמה",
    classesInTrend: "{n} כיתות במגמה",
    fieldTrendSpecialization: "מגמה",
    trendPlaceholder: "לדוגמה: מדעים, ספורט, מחשבים",
    trendSpecializationHint: "",
    trendAddNew: "+ מגמה חדשה…",
    noTrendOption: "ללא מגמה",
    errTrendNameRequired: "יש להזין שם למגמה החדשה",

    recommendationsHeading: "המלצות",
    recClassUnderfilledHeader:
      "{className}: המקצועות לא ממלאים את יום הלימודים {start}:00–{end}:00 ({total} שעות מתוך {target} נדרשות)",
    recClassUnderfilledDetail:
      "ממוצע נוכחי {have} ביום מול {need} ביום נדרש. חסרות {missing} שעות בשבוע.",
    recAddHoursToTrend:
      "הוסיפו {missing} שעות נוספות למקצועות של מגמה {trend}.",
    recShortenSchoolDay: "קצרו את יום הלימודים של {className} (הזיזו את ההתחלה או הסיום).",
    recLowerMandatoryRange:
      "הקטינו את טווח שעות החובה של {className}.",
    recEditTrend: "עריכת מגמה {trend}",
    recEditClass: "עריכת כיתה {className}",
    recOpenTeachers: "פתח מורים",
    recOpenTrends: "פתח מגמות",
    recOpenClasses: "פתח כיתות",
    recMandatoryOverflowHeader:
      "לא ניתן היה לשבץ את כל מקצועות החובה. נסו לפי הסדר:",
    recMandatoryOption1: "תנו למורים הקיימים עוד מקצועות/שכבות.",
    recMandatoryOption2: "בטלו יום חופש למורה העמוס ביותר.",
    recMandatoryOption2Named:
      "בטלו יום חופש למורה העמוס ביותר ({teacher}).",
    recEditTeacher: "ערוך את {teacher}",
    recMandatoryOption3: "הוסיפו מורים נוספים.",
    recMandatoryOption4: "סמנו חלק מהמקצועות כלא-חובה.",
    recMandatoryOption5:
      "הקטינו את טווח שעות החובה של הכיתה (הזיזו את ההתחלה או הסיום של הכיתה הרלוונטית).",
    recMandatoryOption6:
      "הסירו או הקלו על חלונות זמן-חופש של מורים, כדי שיוכלו ללמד ביותר משבצות.",
    roomAutoLinked:
      "מקושר אוטומטית ל-{roomName}. אפשר לשנות שם או סוג בקטע 'חדרים'.",
    errSelectTeacher: "יש לבחור מחנך",
    errClassExists: 'כיתה "{id}" כבר קיימת',
    errSetHours: "יש להגדיר שעות לפחות למקצוע אחד",
    errSubjectDuplicate: "המקצוע \"{name}\" מופיע יותר מפעם אחת.",
    errTeacherAlreadyHomeroom:
      "המורה כבר מוגדר/ת כמחנך/ת של כיתה {className}. הסירו אותו משם תחילה.",

    classWord: "כיתה",

    generated: "מערכת השעות שנוצרה",
    byClass: "לפי כיתה",
    byTeacher: "לפי מורה",
    print: "הדפס את הכיתה הנוכחית",
    printAll: "הדפס את כל הכיתות",
    printHint: "מדפיס את הכיתה הנבחרת בלבד.",
    printAllHint: "מדפיס דף נפרד לכל כיתה, לפי הסדר.",
    editingClickFirst: "לחצו על תא כדי להתחיל החלפה.",
    editingClickSecond:
      "כעת לחצו על התא שאליו תרצו להחליף (או לחצו שוב על אותו תא לביטול).",
    cellConflict: "התנגשות",
    saveSnapshot: "שמור גרסה",
    saveSnapshotHint:
      "שומר את לוח השעות הנוכחי כדי שתוכלו להשוות אותו לריצות עתידיות.",
    snapshotsHeading: "גרסאות שמורות",
    snapshotsHint:
      "גרסאות שנשמרו של לוח השעות. אפשר לטעון כל אחת כתוצאה הנוכחית, או להשוות שתיים זו לצד זו.",
    snapshotDefaultLabel: "גרסה {n}",
    snapshotRenameHint: "לחצו לשינוי השם",
    snapshotLoad: "טען",
    snapshotBlocks: "שיעורים",
    snapshotDropped: "לא שובצו",
    compare: "השוואה…",
    compareHeading: "השוואת גרסאות",
    compareHint:
      "בחרו שתי גרסאות וכיתה. תאים שונים בין השתיים מסומנים.",
    compareSnapshotA: "גרסה א'",
    compareSnapshotB: "גרסה ב'",
    compareClose: "סגור",

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

const GRADE_LETTERS: Record<Lang, Record<Grade, string>> = {
  en: {
    [Grade.A]: "A",
    [Grade.B]: "B",
    [Grade.C]: "C",
    [Grade.D]: "D",
    [Grade.E]: "E",
    [Grade.F]: "F",
  },
  he: {
    [Grade.A]: "א",
    [Grade.B]: "ב",
    [Grade.C]: "ג",
    [Grade.D]: "ד",
    [Grade.E]: "ה",
    [Grade.F]: "ו",
  },
};

const HEBREW_GRADE_BY_LETTER: Record<string, string> = {
  A: "א",
  B: "ב",
  C: "ג",
  D: "ד",
  E: "ה",
  F: "ו",
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
    geography: "גאוגרפיה",
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
  /** Translates a subject key into a display label. The user-managed
   *  catalogue set via `setUserSubjects` wins; falls back to the bundled
   *  i18n names for well-known enum values; finally returns the raw key. */
  tSubject: (s: string) => string;
  /** App calls this whenever `input.subjects` changes so tSubject can
   *  prefer user-set display names over the bundled translations. */
  setUserSubjects: (subjects: SubjectDef[]) => void;
  /** Translates a Grade letter (A→א in Hebrew). */
  tGrade: (g: Grade) => string;
  /** Returns the teacher's display name for the current language
   *  (`teacher.nameHe` in Hebrew when set, otherwise `teacher.name`). */
  tTeacher: (t: Pick<Teacher, "name" | "nameHe">) => string;
  /** Returns the room's display name for the current language. Falls
   *  back to a literal translation of the leading "Room " prefix when
   *  no nameHe is set, so demo data keeps reading well in Hebrew. */
  tRoom: (room: Pick<Room, "name" | "nameHe">) => string;
  /** Translates a class id like "A1" → "א1" in Hebrew. Leaves unknown prefixes alone. */
  tClassId: (id: string) => string;
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
  const [userSubjects, setUserSubjects] = useState<SubjectDef[]>([]);

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

  const translateClassId = (id: string): string => {
    if (lang !== "he") return id;
    const first = id.charAt(0).toUpperCase();
    const heLetter = HEBREW_GRADE_BY_LETTER[first];
    return heLetter ? `${heLetter}${id.slice(1)}` : id;
  };

  const value: I18nApi = {
    lang,
    setLang,
    t: (key, vars) => interpolate(STRINGS[lang][key] ?? STRINGS.en[key] ?? key, vars),
    tDay: (d) => DAY_NAMES[lang][d] ?? d,
    tSubject: (s) => {
      const def = userSubjects.find((u) => u.key === s);
      if (def) {
        if (lang === "he" && def.nameHe) return def.nameHe;
        if (def.name) return def.name;
      }
      return SUBJECT_NAMES[lang][s] ?? s;
    },
    setUserSubjects,
    tGrade: (g) => GRADE_LETTERS[lang][g] ?? g,
    tTeacher: (teacher) =>
      lang === "he" && teacher.nameHe ? teacher.nameHe : teacher.name,
    tRoom: (room) => {
      if (lang === "he" && room.nameHe) return room.nameHe;
      if (lang === "he") {
        // Fallback: translate the "Room <id>" pattern to "חדר <id>" so the
        // English demo strings stay readable in Hebrew until nameHe is set.
        const m = /^Room\s+(.+)$/i.exec(room.name);
        if (m) return `חדר ${translateClassId(m[1])}`;
      }
      return room.name;
    },
    tClassId: translateClassId,
    tClassName: (id) => `${STRINGS[lang].classWord} ${translateClassId(id)}`,
  };

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useT(): I18nApi {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useT must be used within I18nProvider");
  return ctx;
}
