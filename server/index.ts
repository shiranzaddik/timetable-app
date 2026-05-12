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
} from "./auth.js";
import { demoInput } from "./demoData.js";
import { solve } from "./solver.js";
import type { SchoolInput } from "./types.js";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

// --- Auth endpoints ---

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

// --- Data endpoints (gated by requireAuth when auth is enabled) ---

app.get("/api/demo", requireAuth, (_req: Request, res: Response) => {
  res.json(demoInput);
});

app.post("/api/solve", requireAuth, (req: Request, res: Response) => {
  const body = req.body as Partial<SchoolInput> | undefined;
  const input: SchoolInput =
    body && Object.keys(body).length > 0 ? (body as SchoolInput) : demoInput;
  try {
    const start = Date.now();
    const result = solve(input);
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
app.listen(PORT, () => {
  console.log(
    `Timetable server listening on http://localhost:${PORT} (auth ${
      authEnabled ? "enabled" : "disabled"
    })`
  );
});
