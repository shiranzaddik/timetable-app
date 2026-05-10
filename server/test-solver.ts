// Quick smoke test: runs the solver against demo data and prints the result.
import { demoInput } from "./demoData.js";
import { solve } from "./solver.js";
import type { Grid, TimetableCell } from "./types.js";

const start = Date.now();
const result = solve(demoInput);
const ms = Date.now() - start;

console.log(`Solver finished in ${ms}ms — success=${result.success}`);
if (!result.success) {
  console.log("Error:", result.error);
  process.exit(1);
}

console.log(`Total scheduled blocks: ${result.blockCount}`);

const { days, slotLabels } = demoInput.config;
const pad = (s: string | undefined, n: number): string =>
  String(s ?? "").padEnd(n, " ").slice(0, n);

const printGrid = (
  title: string,
  grid: Grid,
  otherLabel: (c: TimetableCell) => string
): void => {
  console.log(`\n=== ${title} ===`);
  const colWidth = 22;
  const header = ["time", ...days]
    .map((d, i) => pad(d, i === 0 ? 6 : colWidth))
    .join(" | ");
  console.log(header);
  console.log("-".repeat(header.length));
  for (let s = 0; s < slotLabels.length; s++) {
    const row = [pad(slotLabels[s], 6)];
    for (let d = 0; d < days.length; d++) {
      const cell = grid[d][s];
      if (!cell) {
        row.push(pad("—", colWidth));
      } else {
        const text = `${cell.subject}/${otherLabel(cell)}@${cell.roomName}`;
        row.push(pad(text, colWidth));
      }
    }
    console.log(row.join(" | "));
  }
};

console.log("\n\n###### CLASS TIMETABLES ######");
for (const cls of demoInput.classes) {
  printGrid(cls.name, result.timetables.byClass[cls.id], (c) => c.teacherName);
}

console.log("\n\n###### TEACHER TIMETABLES ######");
for (const t of demoInput.teachers) {
  printGrid(t.name, result.timetables.byTeacher[t.id], (c) => c.className);
}
