import express, { type Request, type Response } from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { demoInput } from "./demoData.js";
import { solve } from "./solver.js";
import type { SchoolInput } from "./types.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/demo", (_req: Request, res: Response) => {
  res.json(demoInput);
});

app.post("/api/solve", (req: Request, res: Response) => {
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
  // SPA fallback for non-/api routes
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(join(clientDist, "index.html"));
  });
}

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`Timetable server listening on http://localhost:${PORT}`);
});
