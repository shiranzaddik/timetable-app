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

// Pre-seed the language preference so the screenshots are captured in the
// language we want (defaults to Hebrew now that the app's primary audience
// is Hebrew-speaking). Override with `LANG=en` to capture English instead.
const LANG = process.env.LANG_HE === "0" ? "en" : "he";
await context.addInitScript((lang) => {
  try {
    window.localStorage.setItem("lang", lang);
  } catch {
    // ignore (private mode, etc.)
  }
}, LANG);

await page.goto(APP_URL, { waitUntil: "networkidle" });
// Wait for the demo data to populate (Subjects section is rendered first).
await page.waitForSelector(LANG === "he" ? "text=מקצועות" : "text=Subjects", {
  timeout: 10_000,
});
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

const GENERATE_BTN = LANG === "he" ? /צור מערכת שעות/i : /Generate Timetable/i;
const GENERATED_HDR = LANG === "he" ? "מערכת השעות שנוצרה" : "Generated Timetable";
const BY_TEACHER_BTN = LANG === "he" ? /לפי מורה/i : /By teacher/i;

await page.getByRole("button", { name: GENERATE_BTN }).click();
await page.waitForSelector(`text=${GENERATED_HDR}`, { timeout: 30_000 });
await page.waitForTimeout(500);

// 02 + 03: just the generated-timetable section, not the editor above it.
await shootElement("02-timetable.png", ".section-timetable");

// Switch to the by-teacher view.
await page.getByRole("button", { name: BY_TEACHER_BTN }).click();
await page.waitForTimeout(500);
await shootElement("03-timetable-by-teacher.png", ".section-timetable");

await browser.close();
console.log("Done.");
