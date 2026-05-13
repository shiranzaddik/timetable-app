import { useEffect, useRef, useState } from "react";
import InputView from "./components/InputView";
import Login from "./components/Login";
import TimetableView from "./components/TimetableView";
import type { SchoolInput, SolveResult } from "./types";

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

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setAuth({ authEnabled: true, user: null });
    setInput(null);
    setResult(null);
  };

  if (!auth) return <div className="app">Loading…</div>;

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

  if (!input) return <div className="app">Loading…</div>;

  const totalHours = input.classes.reduce(
    (sum, c) => sum + c.subjects.reduce((s, x) => s + x.hoursPerWeek, 0),
    0
  );

  return (
    <div className="app">
      <header className="page-header">
        <div className="header-row">
          <div>
            <h1>School Timetable Builder</h1>
            <p className="subtitle">
              Define teachers and classes, then generate a weekly timetable that satisfies all constraints.
            </p>
          </div>
          {auth.user && (
            <div className="user-menu">
              {persisted && (
                <span className={`save-indicator save-${saving}`}>
                  {saving === "saving"
                    ? "Saving…"
                    : saving === "saved"
                    ? "Saved ✓"
                    : saving === "error"
                    ? "Save failed"
                    : ""}
                </span>
              )}
              <span className="user-name">{auth.user.name}</span>
              <button className="secondary" onClick={logout}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="stats">
        <Stat label="Teachers" value={input.teachers.length} />
        <Stat label="Classes" value={input.classes.length} />
        <Stat label="Hours / week" value={totalHours} />
        <Stat label="Days" value={input.config.days.length} />
        <Stat label="Hourly slots / day" value={input.config.slotLabels.length} />
      </div>

      <div className="toolbar">
        <button onClick={runSolver} disabled={loading || input.classes.length === 0}>
          {loading ? "Solving…" : "Generate Timetable"}
        </button>
        {result?.success && (
          <span className="banner success">
            Scheduled {result.blockCount} blocks in {result.elapsedMs} ms
          </span>
        )}
      </div>

      {error && <div className="banner error" style={{ marginBottom: 16 }}>{error}</div>}

      <InputView input={input} onChange={handleInputChange} />

      {result?.success && (
        <div className="section">
          <div className="section-header">
            <div>
              <h3 className="section-title">Generated Timetable</h3>
              <div className="section-meta">
                {result.blockCount} blocks · {result.elapsedMs} ms
              </div>
            </div>
          </div>
          <div className="tabs">
            <button
              className={`tab ${view === "byClass" ? "active" : ""}`}
              onClick={() => setView("byClass")}
            >
              By class
            </button>
            <button
              className={`tab ${view === "byTeacher" ? "active" : ""}`}
              onClick={() => setView("byTeacher")}
            >
              By teacher
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
