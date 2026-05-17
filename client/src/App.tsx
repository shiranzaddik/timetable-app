import { useEffect, useRef, useState } from "react";
import InputView from "./components/InputView";
import LanguageSwitcher from "./components/LanguageSwitcher";
import Login from "./components/Login";
import TimetableView from "./components/TimetableView";
import { useT } from "./i18n";
import {
  Day,
  type ScheduleRecommendation,
  type SchoolInput,
  type SolveResult,
  type Trend,
} from "./types";

/** Older saved configs didn't have a `trends` field — derive it from the
 *  classes so the trends list works as before. New edits will persist
 *  trends explicitly going forward. */
function normalizeInput(input: SchoolInput): SchoolInput {
  if (input.trends && input.trends.length > 0) return input;
  const seen = new Set<string>();
  const trends: Trend[] = [];
  for (const c of input.classes) {
    const key = `${c.grade}:${c.trendName ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    trends.push({ grade: c.grade, trendName: c.trendName, subjects: c.subjects });
  }
  return { ...input, trends };
}

type View = "byClass" | "byTeacher";

interface User {
  email: string;
  name: string;
}

interface AuthState {
  authEnabled: boolean;
  user: User | null;
}

interface SchoolState {
  persisted: boolean;
  config: SchoolInput | null;
}

const GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...init });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export default function App() {
  const { t, tDay } = useT();
  const [auth, setAuth] = useState<AuthState | undefined>(undefined);
  const [input, setInput] = useState<SchoolInput | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [result, setResult] = useState<SolveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("byClass");
  const [dirty, setDirty] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  // 1) Auth check on mount
  useEffect(() => {
    api<AuthState>("/api/auth/me")
      .then(setAuth)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
        setAuth({ authEnabled: false, user: null });
      });
  }, []);

  // 2) Once authenticated, load demo + the user's saved config (if any)
  useEffect(() => {
    if (!auth) return;
    if (auth.authEnabled && !auth.user) return;

    Promise.all([api<SchoolInput>("/api/demo"), api<SchoolState>("/api/school")])
      .then(([demoData, saved]) => {
        setPersisted(saved.persisted);
        setInput(normalizeInput(saved.config ?? demoData));
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e))
      );
  }, [auth]);

  const runSolver = async (): Promise<void> => {
    if (!input) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<SolveResult>("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      setResult(data);
      if (!data.success) setError(data.error ?? "Solver failed");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  // Auto-save: 1s after the user makes an edit, PUT the current input to /api/school.
  useEffect(() => {
    if (!dirty || !input || !persisted) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      setSaving("saving");
      try {
        await api("/api/school", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        setSaving("saved");
        setDirty(false);
        window.setTimeout(() => setSaving("idle"), 1500);
      } catch (e: unknown) {
        setSaving("error");
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 1000);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [input, dirty, persisted]);

  // Called by InputView when the user edits something — flags the change for auto-save.
  const handleInputChange = (next: SchoolInput): void => {
    setInput(next);
    setDirty(true);
  };

  const clearAll = () => {
    if (!input) return;
    if (!window.confirm(t("confirmClearAll"))) return;
    setInput({
      ...input,
      teachers: [],
      classes: [],
      rooms: [],
      trends: [],
    });
    setResult(null);
    setDirty(true);
  };

  const loadDemo = async () => {
    if (!window.confirm(t("confirmLoadDemo"))) return;
    try {
      const demo = await api<SchoolInput>("/api/demo");
      setInput(normalizeInput(demo));
      setResult(null);
      setDirty(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setAuth({ authEnabled: true, user: null });
    setInput(null);
    setResult(null);
  };

  if (!auth) return <div className="app">{t("loading")}</div>;

  if (auth.authEnabled && !auth.user) {
    if (!GOOGLE_CLIENT_ID) {
      return (
        <div className="app">
          <div className="banner error">
            Auth is enabled on the server but <code>VITE_GOOGLE_CLIENT_ID</code> is not
            set in the client build.
          </div>
        </div>
      );
    }
    return (
      <Login
        clientId={GOOGLE_CLIENT_ID}
        onSuccess={() =>
          api<AuthState>("/api/auth/me").then(setAuth).catch(() => {})
        }
      />
    );
  }

  if (!input) return <div className="app">{t("loading")}</div>;

  const totalHours = input.classes.reduce(
    (sum, c) => sum + c.subjects.reduce((s, x) => s + x.hoursPerWeek, 0),
    0
  );

  return (
    <div className="app">
      <header className="page-header">
        <div className="header-row">
          <div>
            <h1>{t("appTitle")}</h1>
            <p className="subtitle">{t("appSubtitle")}</p>
          </div>
          <div className="user-menu">
            <LanguageSwitcher />
            {auth.user && (
              <>
                {persisted && (
                  <span className={`save-indicator save-${saving}`}>
                    {saving === "saving"
                      ? t("saving")
                      : saving === "saved"
                      ? t("saved")
                      : saving === "error"
                      ? t("saveFailed")
                      : ""}
                  </span>
                )}
                <span className="user-name">{auth.user.name}</span>
                <button className="secondary" onClick={logout}>
                  {t("signOut")}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="stats">
        <Stat label={t("statTeachers")} value={input.teachers.length} />
        <Stat label={t("statClasses")} value={input.classes.length} />
        <Stat label={t("statHours")} value={totalHours} />
        <Stat label={t("statDays")} value={input.config.days.length} />
        <SchoolDayStat input={input} onChange={handleInputChange} />
      </div>

      <div className="toolbar">
        <button onClick={runSolver} disabled={loading || input.classes.length === 0}>
          {loading ? t("solving") : t("generate")}
        </button>
        <button className="secondary" onClick={loadDemo}>
          {t("loadDemo")}
        </button>
        <button
          className="secondary"
          onClick={clearAll}
          disabled={input.teachers.length + input.classes.length + input.rooms.length === 0}
        >
          {t("clearAll")}
        </button>
        {result?.success && (
          <span className="banner success">
            {t("scheduledIn", {
              n: result.blockCount ?? 0,
              ms: result.elapsedMs ?? 0,
            })}
          </span>
        )}
      </div>

      {error && <div className="banner error" style={{ marginBottom: 16 }}>{error}</div>}

      <InputView input={input} onChange={handleInputChange} />

      {result?.success && result.recommendations && result.recommendations.length > 0 && (
        <div className="section">
          <div className="section-header">
            <div>
              <h3 className="section-title" style={{ color: "var(--warn)" }}>
                {t("recommendationsHeading")}
              </h3>
            </div>
          </div>
          <div className="card-grid">
            {result.recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
          </div>
        </div>
      )}

      {result?.success && result.droppedBlocks && result.droppedBlocks.length > 0 && (
        <div className="section">
          <div className="section-header">
            <div>
              <h3 className="section-title" style={{ color: "var(--warn)" }}>
                {t("droppedHeading")}
              </h3>
              <div className="section-meta">{t("droppedHint")}</div>
            </div>
          </div>
          <ul style={{ margin: 0, paddingInlineStart: 22 }}>
            {result.droppedBlocks.map((d) => (
              <li key={`${d.classId}-${d.subject}`} style={{ marginBottom: 4 }}>
                {t("droppedLine", {
                  className: d.className,
                  subject: d.subject,
                  hours: d.hours,
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result?.success && result.dayOffSuggestions && result.dayOffSuggestions.length > 0 && (
        <div className="section">
          <div className="section-header">
            <div>
              <h3 className="section-title" style={{ color: "var(--primary)" }}>
                {t("dayOffSuggestionsHeading")}
              </h3>
              <div className="section-meta">{t("dayOffSuggestionsHint")}</div>
            </div>
          </div>
          <ul style={{ margin: 0, paddingInlineStart: 22 }}>
            {result.dayOffSuggestions.map((s) => (
              <li key={s.teacherId} style={{ marginBottom: 4 }}>
                {t("dayOffSuggestionLine", {
                  teacherName: s.teacherName,
                  currentDay: tDay(s.currentDay as Day),
                  suggestedDay: tDay(s.suggestedDay as Day),
                  count: s.improvesBlocksBy,
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result?.success && result.assignedHomerooms && result.assignedHomerooms.length > 0 && (
        <div className="section">
          <div className="section-header">
            <div>
              <h3 className="section-title">{t("assignedHomeroomsHeading")}</h3>
              <div className="section-meta">{t("assignedHomeroomsHint")}</div>
            </div>
          </div>
          <ul style={{ margin: 0, paddingInlineStart: 22 }}>
            {result.assignedHomerooms.map((a) => (
              <li key={a.classId} style={{ marginBottom: 4 }}>
                {t("assignedHomeroomLine", {
                  className: a.className,
                  teacherName: a.teacherName,
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result?.success && result.unusedTeachers && result.unusedTeachers.length > 0 && (
        <div className="section">
          <div className="section-header">
            <div>
              <h3 className="section-title">{t("unusedTeachersHeading")}</h3>
              <div className="section-meta">{t("unusedTeachersHint")}</div>
            </div>
          </div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {result.unusedTeachers.map((u) => (
              <span key={u.id} className="tag muted">
                {u.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {result?.success && (
        <div className="section">
          <div className="section-header">
            <div>
              <h3 className="section-title">{t("generated")}</h3>
              <div className="section-meta">
                {result.blockCount} · {result.elapsedMs} ms
              </div>
            </div>
          </div>
          <div className="tabs">
            <button
              className={`tab ${view === "byClass" ? "active" : ""}`}
              onClick={() => setView("byClass")}
            >
              {t("byClass")}
            </button>
            <button
              className={`tab ${view === "byTeacher" ? "active" : ""}`}
              onClick={() => setView("byTeacher")}
            >
              {t("byTeacher")}
            </button>
          </div>
          <TimetableView input={input} result={result} mode={view} />
        </div>
      )}
    </div>
  );
}

function jumpToCard(anchorId: string) {
  const el = document.getElementById(anchorId);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  // Briefly highlight the target card so the user sees what was opened.
  el.classList.add("card-flash");
  window.setTimeout(() => el.classList.remove("card-flash"), 1500);
  // Also click the edit button inside, if any, so the form opens.
  const editBtn = el.querySelector<HTMLButtonElement>(".edit-trigger");
  editBtn?.click();
}

function RecommendationCard({ rec }: { rec: ScheduleRecommendation }) {
  const { t } = useT();
  if (rec.kind === "mandatoryOverflow") {
    return (
      <div className="card recommendation-card">
        <div className="rec-header">{t("recMandatoryOverflowHeader")}</div>
        <ol className="rec-options">
          <li>
            <span className="rec-row">
              <span>{t("recMandatoryOption1")}</span>
              <button
                className="rec-link"
                onClick={() => jumpToCard("section-teachers")}
              >
                {t("recOpenTeachers")}
              </button>
            </span>
          </li>
          <li>
            <span className="rec-row">
              <span>
                {rec.busiestTeacherName
                  ? t("recMandatoryOption2Named", {
                      teacher: rec.busiestTeacherName,
                    })
                  : t("recMandatoryOption2")}
              </span>
              <button
                className="rec-link"
                onClick={() =>
                  jumpToCard(
                    rec.busiestTeacherId
                      ? `teacher-${rec.busiestTeacherId}`
                      : "section-teachers"
                  )
                }
              >
                {rec.busiestTeacherName
                  ? t("recEditTeacher", { teacher: rec.busiestTeacherName })
                  : t("recOpenTeachers")}
              </button>
            </span>
          </li>
          <li>
            <span className="rec-row">
              <span>{t("recMandatoryOption3")}</span>
              <button
                className="rec-link"
                onClick={() => jumpToCard("section-teachers")}
              >
                {t("recOpenTeachers")}
              </button>
            </span>
          </li>
          <li>
            <span className="rec-row">
              <span>{t("recMandatoryOption4")}</span>
              <button
                className="rec-link"
                onClick={() => jumpToCard("section-trends")}
              >
                {t("recOpenTrends")}
              </button>
            </span>
          </li>
          <li>
            <span className="rec-row">
              <span>{t("recMandatoryOption5")}</span>
              <button
                className="rec-link"
                onClick={() => jumpToCard("section-classes")}
              >
                {t("recOpenClasses")}
              </button>
            </span>
          </li>
          <li>
            <span className="rec-row">
              <span>{t("recMandatoryOption6")}</span>
              <button
                className="rec-link"
                onClick={() => jumpToCard("section-teachers")}
              >
                {t("recOpenTeachers")}
              </button>
            </span>
          </li>
        </ol>
      </div>
    );
  }
  const trendAnchor = `trend-${rec.trendKey}`;
  const classAnchor = `class-${rec.classId}`;
  const missing = rec.targetHours - rec.totalHours;
  const dailyMinutes = (rec.targetHours / rec.daysPerWeek) * 60;
  const totalDailyMinutes = (rec.totalHours / rec.daysPerWeek) * 60;
  const fmtMinutes = (m: number) =>
    `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
  return (
    <div className="card recommendation-card">
      <div className="rec-header">
        {t("recClassUnderfilledHeader", {
          className: rec.className,
          total: rec.totalHours,
          target: rec.targetHours,
          start: String(rec.startHour).padStart(2, "0"),
          end: String(rec.endHour).padStart(2, "0"),
        })}
      </div>
      <div className="rec-detail">
        {t("recClassUnderfilledDetail", {
          have: fmtMinutes(totalDailyMinutes),
          need: fmtMinutes(dailyMinutes),
          missing,
        })}
      </div>
      <ol className="rec-options">
        <li>
          <span className="rec-row">
            <span>
              {t("recAddHoursToTrend", { trend: rec.trendLabel, missing })}
            </span>
            <button
              className="rec-link"
              onClick={() => jumpToCard(trendAnchor)}
            >
              {t("recEditTrend", { trend: rec.trendLabel })}
            </button>
          </span>
        </li>
        <li>
          <span className="rec-row">
            <span>{t("recShortenSchoolDay", { className: rec.className })}</span>
            <button
              className="rec-link"
              onClick={() => jumpToCard(classAnchor)}
            >
              {t("recEditClass", { className: rec.className })}
            </button>
          </span>
        </li>
        <li>
          <span className="rec-row">
            <span>
              {t("recLowerMandatoryRange", { className: rec.className })}
            </span>
            <button
              className="rec-link"
              onClick={() => jumpToCard(classAnchor)}
            >
              {t("recEditClass", { className: rec.className })}
            </button>
          </span>
        </li>
      </ol>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function makeSlotLabels(startHour: number, endHour: number): string[] {
  const labels: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    labels.push(`${String(h).padStart(2, "0")}:00`);
  }
  return labels;
}

function SchoolDayStat({
  input,
  onChange,
}: {
  input: SchoolInput;
  onChange: (next: SchoolInput) => void;
}) {
  const { t, tDay } = useT();
  const [expanded, setExpanded] = useState(false);
  const startHour = input.config.startHour ?? 8;
  const endHour = input.config.endHour ?? startHour + input.config.slotLabels.length;
  const endByDay = input.config.endHourByDay ?? {};

  const updateStartEnd = (nextStart: number, nextEnd: number) => {
    if (nextEnd <= nextStart) return;
    if (nextStart < 0 || nextEnd > 24) return;
    onChange({
      ...input,
      config: {
        ...input.config,
        startHour: nextStart,
        endHour: nextEnd,
        slotLabels: makeSlotLabels(nextStart, nextEnd),
      },
    });
  };

  const updateDayEnd = (day: Day, nextEnd: number) => {
    if (nextEnd <= startHour || nextEnd > endHour) return;
    const next = { ...endByDay, [day]: nextEnd };
    onChange({
      ...input,
      config: { ...input.config, endHourByDay: next },
    });
  };

  return (
    <div className="stat school-day-stat">
      <div className="stat-label">{t("statSchoolDayMax")}</div>
      <div className="school-day-inputs">
        <input
          type="number"
          min={0}
          max={23}
          value={startHour}
          onChange={(e) => updateStartEnd(Number(e.target.value), endHour)}
          aria-label="start hour"
        />
        <span>→</span>
        <input
          type="number"
          min={1}
          max={24}
          value={endHour}
          onChange={(e) => updateStartEnd(startHour, Number(e.target.value))}
          aria-label="end hour"
        />
        <button
          type="button"
          className="secondary school-day-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t("perDayHide") : t("perDayShow")}
        </button>
      </div>
      {expanded && (
        <div className="per-day-grid">
          {input.config.days.map((d) => {
            const v = endByDay[d] ?? endHour;
            return (
              <label key={d} className="per-day-field">
                <span className="per-day-label">{tDay(d)}</span>
                <input
                  type="number"
                  min={startHour + 1}
                  max={endHour}
                  value={v}
                  onChange={(e) => updateDayEnd(d, Number(e.target.value))}
                />
                <span className="per-day-suffix">:00</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
