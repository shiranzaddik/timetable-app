import { useEffect, useRef, useState } from "react";
import InputView from "./components/InputView";
import LanguageSwitcher from "./components/LanguageSwitcher";
import Login from "./components/Login";
import TimetableView from "./components/TimetableView";
import { useT } from "./i18n";
import {
  Day,
  type Grid,
  type ScheduleRecommendation,
  type SchoolInput,
  type SolveResult,
  type TimetableCell,
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

interface Snapshot {
  id: string;
  label: string;
  savedAt: number;
  result: SolveResult;
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
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [compareIds, setCompareIds] = useState<{ a: string; b: string } | null>(
    null
  );

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

  const saveSnapshot = () => {
    if (!result || !result.success) return;
    const id = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const next: Snapshot = {
      id,
      label: t("snapshotDefaultLabel", { n: snapshots.length + 1 }),
      savedAt: Date.now(),
      result,
    };
    setSnapshots((arr) => [...arr, next]);
  };

  const loadSnapshot = (id: string) => {
    const snap = snapshots.find((s) => s.id === id);
    if (snap) setResult(snap.result);
  };

  const deleteSnapshot = (id: string) => {
    setSnapshots((arr) => arr.filter((s) => s.id !== id));
    if (compareIds && (compareIds.a === id || compareIds.b === id)) {
      setCompareIds(null);
    }
  };

  const renameSnapshot = (id: string, label: string) => {
    setSnapshots((arr) =>
      arr.map((s) => (s.id === id ? { ...s, label: label || s.label } : s))
    );
  };

  const startCompare = () => {
    if (snapshots.length < 2) return;
    setCompareIds({
      a: snapshots[snapshots.length - 2].id,
      b: snapshots[snapshots.length - 1].id,
    });
  };

  const printAllClasses = () => {
    document.body.classList.add("print-mode-all");
    // Defer one frame so the browser repaints with the new layout before the
    // print dialog snapshots the page.
    window.requestAnimationFrame(() => {
      window.print();
      // Strip the class once the dialog closes. Browsers fire `afterprint`
      // synchronously after window.print returns, but use a timeout as a
      // belt-and-braces fallback for older engines.
      const cleanup = () => document.body.classList.remove("print-mode-all");
      window.addEventListener("afterprint", cleanup, { once: true });
      window.setTimeout(cleanup, 1000);
    });
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
        <div className="section section-timetable">
          <div className="section-header">
            <div>
              <h3 className="section-title">{t("generated")}</h3>
              <div className="section-meta">
                {result.blockCount} · {result.elapsedMs} ms
              </div>
            </div>
            <div className="print-btn-group">
              <button
                className="secondary print-btn"
                onClick={saveSnapshot}
                title={t("saveSnapshotHint")}
              >
                {t("saveSnapshot")}
              </button>
              <button
                className="secondary print-btn"
                onClick={() => window.print()}
                title={t("printHint")}
              >
                {t("print")}
              </button>
              <button
                className="secondary print-btn"
                onClick={printAllClasses}
                title={t("printAllHint")}
              >
                {t("printAll")}
              </button>
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
          <TimetableView
            input={input}
            result={result}
            mode={view}
            onResultChange={setResult}
          />
        </div>
      )}

      {snapshots.length > 0 && (
        <div className="section">
          <div className="section-header">
            <div>
              <h3 className="section-title">{t("snapshotsHeading")}</h3>
              <div className="section-meta">{t("snapshotsHint")}</div>
            </div>
            {snapshots.length >= 2 && !compareIds && (
              <button className="secondary" onClick={startCompare}>
                {t("compare")}
              </button>
            )}
          </div>
          <div className="snapshot-list">
            {snapshots.map((s) => (
              <SnapshotCard
                key={s.id}
                snap={s}
                onLoad={() => loadSnapshot(s.id)}
                onDelete={() => deleteSnapshot(s.id)}
                onRename={(label) => renameSnapshot(s.id, label)}
              />
            ))}
          </div>
        </div>
      )}

      {compareIds && input && (
        <CompareSection
          input={input}
          snapshots={snapshots}
          compareIds={compareIds}
          onChange={setCompareIds}
          onClose={() => setCompareIds(null)}
        />
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

function SnapshotCard({
  snap,
  onLoad,
  onDelete,
  onRename,
}: {
  snap: Snapshot;
  onLoad: () => void;
  onDelete: () => void;
  onRename: (label: string) => void;
}) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(snap.label);
  const blockCount = snap.result.blockCount ?? 0;
  const dropped = (snap.result.droppedBlocks ?? []).length;
  const time = new Date(snap.savedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="snapshot-card">
      <div className="snapshot-head">
        {editing ? (
          <input
            className="snapshot-rename-input"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              onRename(draft.trim());
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRename(draft.trim());
                setEditing(false);
              }
              if (e.key === "Escape") {
                setDraft(snap.label);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="snapshot-label"
            onClick={() => {
              setDraft(snap.label);
              setEditing(true);
            }}
            title={t("snapshotRenameHint")}
          >
            {snap.label} ✎
          </button>
        )}
      </div>
      <div className="snapshot-meta">
        {time} · {blockCount} {t("snapshotBlocks")}
        {dropped > 0 && (
          <>
            {" · "}
            <span className="snapshot-dropped">
              {dropped} {t("snapshotDropped")}
            </span>
          </>
        )}
      </div>
      <div className="snapshot-actions">
        <button className="secondary" onClick={onLoad}>
          {t("snapshotLoad")}
        </button>
        <button className="secondary danger" onClick={onDelete}>
          {t("delete")}
        </button>
      </div>
    </div>
  );
}

function CompareSection({
  input,
  snapshots,
  compareIds,
  onChange,
  onClose,
}: {
  input: SchoolInput;
  snapshots: Snapshot[];
  compareIds: { a: string; b: string };
  onChange: (next: { a: string; b: string } | null) => void;
  onClose: () => void;
}) {
  const { t, tClassName, tDay, tSubject } = useT();
  const snapA = snapshots.find((s) => s.id === compareIds.a);
  const snapB = snapshots.find((s) => s.id === compareIds.b);
  const [selectedClassId, setSelectedClassId] = useState<string>(
    input.classes[0]?.id ?? ""
  );

  if (!snapA || !snapB) return null;

  const gridA = (snapA.result.timetables.byClass as Record<string, Grid>)[
    selectedClassId
  ];
  const gridB = (snapB.result.timetables.byClass as Record<string, Grid>)[
    selectedClassId
  ];

  return (
    <div className="section compare-section">
      <div className="section-header">
        <div>
          <h3 className="section-title">{t("compareHeading")}</h3>
          <div className="section-meta">{t("compareHint")}</div>
        </div>
        <button className="secondary" onClick={onClose}>
          {t("compareClose")}
        </button>
      </div>

      <div className="compare-pickers">
        <label className="sort-control">
          <span>{t("compareSnapshotA")}</span>
          <select
            value={compareIds.a}
            onChange={(e) => onChange({ ...compareIds, a: e.target.value })}
          >
            {snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="sort-control">
          <span>{t("compareSnapshotB")}</span>
          <select
            value={compareIds.b}
            onChange={(e) => onChange({ ...compareIds, b: e.target.value })}
          >
            {snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="tabs">
        {input.classes.map((c) => (
          <button
            key={c.id}
            className={`tab ${selectedClassId === c.id ? "active" : ""}`}
            onClick={() => setSelectedClassId(c.id)}
          >
            {tClassName(c.id)}
          </button>
        ))}
      </div>

      <div className="compare-grids">
        <CompareGrid
          title={snapA.label}
          input={input}
          gridSelf={gridA}
          gridOther={gridB}
          tDay={tDay}
          tSubject={tSubject}
        />
        <CompareGrid
          title={snapB.label}
          input={input}
          gridSelf={gridB}
          gridOther={gridA}
          tDay={tDay}
          tSubject={tSubject}
        />
      </div>
    </div>
  );
}

function CompareGrid({
  title,
  input,
  gridSelf,
  gridOther,
  tDay,
  tSubject,
}: {
  title: string;
  input: SchoolInput;
  gridSelf: Grid | undefined;
  gridOther: Grid | undefined;
  tDay: (d: Day) => string;
  tSubject: (s: string) => string;
}) {
  const { days, slotLabels } = input.config;
  if (!gridSelf) return <div className="compare-grid">No data</div>;
  const sameCell = (a: TimetableCell | null, b: TimetableCell | null) => {
    if (a === null && b === null) return true;
    if (!a || !b) return false;
    return (
      a.subject === b.subject &&
      a.teacherId === b.teacherId &&
      a.roomId === b.roomId &&
      a.classId === b.classId
    );
  };
  return (
    <div className="compare-grid">
      <h4 className="compare-grid-title">{title}</h4>
      <div className="timetable-wrap">
        <table className="timetable">
          <thead>
            <tr>
              <th></th>
              {days.map((d) => (
                <th key={d}>{tDay(d as Day)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slotLabels.map((label, slotIdx) => (
              <tr key={slotIdx}>
                <td className="slot-label">{label}</td>
                {days.map((_, dayIdx) => {
                  const cell = gridSelf[dayIdx][slotIdx];
                  const otherCell = gridOther?.[dayIdx]?.[slotIdx] ?? null;
                  const differs = !sameCell(cell, otherCell);
                  if (!cell) {
                    return (
                      <td
                        key={dayIdx}
                        className={`empty ${differs ? "diff" : ""}`}
                      >
                        —
                      </td>
                    );
                  }
                  return (
                    <td
                      key={dayIdx}
                      className={`subj-${cell.subject} ${differs ? "diff" : ""}`}
                    >
                      <div className="cell-subject">{tSubject(cell.subject)}</div>
                      <div className="cell-meta">{cell.teacherName}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
