import { useEffect, useState } from "react";
import InputView from "./components/InputView";
import TimetableView from "./components/TimetableView";
import { Day, RoomType, type Room, type SchoolInput, type SolveResult } from "./types";

type View = "byClass" | "byTeacher";

const SHARED_ROOMS: Room[] = [
  { id: "sport-hall", name: "Sport Hall", type: RoomType.Sport },
  { id: "computer-lab", name: "Computer Lab", type: RoomType.Computer },
  { id: "music-room", name: "Music Room", type: RoomType.Music },
];

const EMPTY_INPUT: SchoolInput = {
  config: {
    days: [Day.Sunday, Day.Monday, Day.Tuesday, Day.Wednesday, Day.Thursday],
    slotLabels: ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"],
  },
  rooms: SHARED_ROOMS,
  teachers: [],
  classes: [],
};

export default function App() {
  const [demo, setDemo] = useState<SchoolInput | null>(null);
  const [input, setInput] = useState<SchoolInput | null>(null);
  const [result, setResult] = useState<SolveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("byClass");

  useEffect(() => {
    fetch("/api/demo")
      .then((r) => r.json() as Promise<SchoolInput>)
      .then((d) => {
        setDemo(d);
        setInput(d);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e))
      );
  }, []);

  // Run the solver automatically when the URL contains ?autorun (useful for
  // shareable demo links and screenshots).
  useEffect(() => {
    if (!input) return;
    if (!new URLSearchParams(window.location.search).has("autorun")) return;
    if (result) return;
    void runSolver();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const runSolver = async (): Promise<void> => {
    if (!input) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as SolveResult;
      setResult(data);
      if (!data.success) setError(data.error ?? "Solver failed");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadDemo = () => {
    if (demo) {
      setInput(demo);
      setResult(null);
    }
  };
  const clearAll = () => {
    setInput(EMPTY_INPUT);
    setResult(null);
  };

  if (!input) return <div className="app">Loading…</div>;

  const totalHours = input.classes.reduce(
    (sum, c) => sum + c.subjects.reduce((s, x) => s + x.hoursPerWeek, 0),
    0
  );

  return (
    <div className="app">
      <header className="page-header">
        <h1>School Timetable Builder</h1>
        <p className="subtitle">
          Define teachers and classes, then generate a weekly timetable that satisfies all constraints.
        </p>
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
        <button className="secondary" onClick={loadDemo} disabled={!demo}>
          Load demo data
        </button>
        <button className="secondary" onClick={clearAll}>
          Clear all
        </button>
        {result?.success && (
          <span className="banner success">
            Scheduled {result.blockCount} blocks in {result.elapsedMs} ms
          </span>
        )}
      </div>

      {error && <div className="banner error" style={{ marginBottom: 16 }}>{error}</div>}

      <InputView input={input} onChange={setInput} />

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
