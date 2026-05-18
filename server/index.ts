import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  authEnabled,
  clearSessionCookie,
  readSession,
  requireAuth,
  setSessionCookie,
  signSession,
  verifyGoogleIdToken,
  type SessionUser,
} from "./auth.js";
import {
  dbEnabled,
  deleteSchool,
  getSchool,
  initSchema,
  saveSchool,
  upsertUser,
} from "./db.js";
import { demoInput } from "./demoData.js";
import { solve } from "./solver.js";
import type { SchoolInput } from "./types.js";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

// --- Auth ---

app.get("/api/auth/me", (req: Request, res: Response) => {
  const user = authEnabled ? readSession(req) : null;
  res.json({ authEnabled, user });
});

app.post("/api/auth/google", async (req: Request, res: Response) => {
  if (!authEnabled) {
    res.status(503).json({ error: "Auth is not configured on this server." });
    return;
  }
  const idToken = (req.body as { idToken?: string } | undefined)?.idToken;
  if (!idToken) {
    res.status(400).json({ error: "Missing idToken." });
    return;
  }
  try {
    const user = await verifyGoogleIdToken(idToken);
    await upsertUser(user.email, user.name);
    setSessionCookie(res, signSession(user));
    res.json({ user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed.";
    res.status(401).json({ error: message });
  }
});

app.post("/api/auth/logout", (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// --- Saved school configuration (per signed-in user) ---

function requireUser(req: Request): SessionUser | null {
  return readSession(req);
}

app.get("/api/school", requireAuth, async (req: Request, res: Response) => {
  if (!dbEnabled) {
    res.json({ persisted: false, config: null });
    return;
  }
  const user = requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const config = await getSchool(user.email);
  res.json({ persisted: true, config });
});

app.put("/api/school", requireAuth, async (req: Request, res: Response) => {
  if (!dbEnabled) {
    res.status(503).json({ error: "Persistence is not configured on this server." });
    return;
  }
  const user = requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const config = req.body as SchoolInput | undefined;
  if (!config || !config.classes || !config.teachers) {
    res.status(400).json({ error: "Invalid school config." });
    return;
  }
  await saveSchool(user.email, config);
  res.json({ ok: true });
});

app.delete("/api/school", requireAuth, async (req: Request, res: Response) => {
  if (!dbEnabled) {
    res.status(503).json({ error: "Persistence is not configured on this server." });
    return;
  }
  const user = requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  await deleteSchool(user.email);
  res.json({ ok: true });
});

// --- Solver / demo ---

app.get("/api/demo", requireAuth, (_req: Request, res: Response) => {
  res.json(demoInput);
});

app.post("/api/solve", requireAuth, (req: Request, res: Response) => {
  const body = req.body as Partial<SchoolInput> | undefined;
  const input: SchoolInput =
    body && Object.keys(body).length > 0 ? (body as SchoolInput) : demoInput;
  // Optional seed query param lets the client request a different variant of
  // a schedule on each Generate click. Missing/zero/negative = deterministic.
  const rawSeed = Number(req.query.seed);
  const seed = Number.isFinite(rawSeed) && rawSeed > 0 ? rawSeed : undefined;
  try {
    const start = Date.now();
    const result = solve(input, seed);
    res.json({ ...result, elapsedMs: Date.now() - start });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
});

// In production (deployed), serve the built React client from the same process.
const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDist = join(__dirname, "..", "client", "dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(join(clientDist, "index.html"));
  });
}

const PORT = Number(process.env.PORT ?? 4000);

// Initialize schema before accepting requests so the first call doesn't race.
initSchema()
  .catch((err) => {
    console.error("Failed to initialize database schema:", err);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(
        `Timetable server listening on http://localhost:${PORT} (auth ${
          authEnabled ? "on" : "off"
        }, db ${dbEnabled ? "on" : "off"})`
      );
    });
  });
