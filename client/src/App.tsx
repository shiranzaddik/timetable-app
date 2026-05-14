import { useEffect, useRef, useState } from "react";
import InputView from "./components/InputView";
import LanguageSwitcher from "./components/LanguageSwitcher";
import Login from "./components/Login";
import TimetableView from "./components/TimetableView";
import { useT } from "./i18n";
import { Day, type SchoolInput, type SolveResult } from "./types";

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
        setInput(saved.config ?? demoData);
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
    });
    setResult(null);
    setDirty(true);
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

      {result?.success && result.warnings && result.warnings.length > 0 && (
        <div className="section">
          <div className="section-header">
            <div>
              <h3 className="section-title" style={{ color: "var(--warn)" }}>
                Recommendations
              </h3>
            </div>
          </div>
          <ul style={{ margin: 0, paddingInlineStart: 22 }}>
            {result.warnings.map((w, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{w}</li>
            ))}
          </ul>
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
  const { t } = useT();
  const startHour = input.config.startHour ?? 8;
  const endHour = input.config.endHour ?? startHour + input.config.slotLabels.length;

  const update = (nextStart: number, nextEnd: number) => {
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

  return (
    <div className="stat">
      <div className="stat-label">{t("statSchoolDay")}</div>
      <div className="school-day-inputs">
        <input
          type="number"
          min={0}
          max={23}
          value={startHour}
          onChange={(e) => update(Number(e.target.value), endHour)}
          aria-label="start hour"
        />
        <span>→</span>
        <input
          type="number"
          min={1}
          max={24}
          value={endHour}
          onChange={(e) => update(startHour, Number(e.target.value))}
          aria-label="end hour"
        />
      </div>
    </div>
  );
}
