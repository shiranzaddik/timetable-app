// One-off script: drives a headless browser against the local dev server and
// saves three full-page screenshots into docs/screenshots/.
//
// Setup (one time):
//   npm install --no-save playwright
//   npx playwright install chromium
//
// Then, with `npm run dev` running:
//   node scripts/take-screenshots.mjs
//
// Override the URL by setting APP_URL (defaults to http://localhost:5173/).

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const APP_URL = process.env.APP_URL ?? "http://localhost:5173/";
const OUT_DIR = resolve("docs/screenshots");
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.goto(APP_URL, { waitUntil: "networkidle" });
// Wait for the demo data to populate.
await page.waitForSelector("text=Teachers", { timeout: 10_000 });
await page.waitForTimeout(500);

const shootFull = async (name) => {
  const path = resolve(OUT_DIR, name);
  await page.screenshot({ path, fullPage: true });
  console.log("→", path);
};

const shootElement = async (name, selector) => {
  const path = resolve(OUT_DIR, name);
  const handle = await page.waitForSelector(selector, { state: "visible" });
  await handle.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await handle.screenshot({ path });
  console.log("→", path);
};

// 01: full-page editor view (teachers, trends, classes).
await shootFull("01-input.png");

// Click "Generate Timetable" and wait for the timetable section to render.
await page.getByRole("button", { name: /Generate Timetable/i }).click();
await page.waitForSelector("text=Generated Timetable", { timeout: 30_000 });
await page.waitForTimeout(500);

// 02 + 03: just the generated-timetable section, not the editor above it.
await shootElement("02-timetable.png", ".section-timetable");

// Switch to "By teacher" view.
await page.getByRole("button", { name: /By teacher/i }).click();
await page.waitForTimeout(500);
await shootElement("03-timetable-by-teacher.png", ".section-timetable");

await browser.close();
console.log("Done.");
