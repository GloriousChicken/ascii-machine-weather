/**
 * Capture the golden grid.
 *
 * The golden grid is the sea as it looked before the weather existed. It is
 * the anchor between this project and the one it grew out of: with the
 * weather turned off, the sea here must be exactly the sea there, cell for
 * cell.
 *
 * Run it against a built and served site:
 *
 *   npm run build
 *   npm run preview -- --port 4173 &
 *   node tools/capture_golden.mjs
 *
 * The grid is sized by the window, so the viewport is pinned here and
 * recorded in the fixture. The test that reads the fixture pins it too.
 */

import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../tests/e2e/fixtures/seed-42-steps-120.json");

/** The seed and the step count the fixture is captured at. */
const SEED = 42;
const STEPS = 120;

/** The viewport the fixture is captured at, and that the test pins. */
const VIEWPORT = { width: 900, height: 560 };

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:4173";

const browser = await chromium.launch({
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: VIEWPORT });

await page.goto(`${BASE_URL}/?seed=${SEED}&steps=${STEPS}`);
await page.waitForFunction(() => window.__ready === true, { timeout: 20_000 });
await page.waitForFunction(
  (steps) => window.__stepsTaken >= steps,
  STEPS,
  { timeout: 20_000 },
);

const grid = await page.evaluate(() => window.__grid());
await browser.close();

const fixture = {
  description:
    "The sea as it was before the weather existed. Regenerate with tools/capture_golden.mjs.",
  seed: SEED,
  steps: STEPS,
  viewport: VIEWPORT,
  columns: grid.columns,
  rows: grid.rows,
  seaRows: grid.seaRows,
  glyphs: grid.glyphs,
  colors: grid.colors,
};

await writeFile(OUT, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");

console.log(
  `captured ${grid.glyphs.length} cells ` +
    `(${grid.columns}x${grid.seaRows}) to ${OUT}`,
);
