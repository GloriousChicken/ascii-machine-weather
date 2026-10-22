/**
 * Capture the golden grid.
 *
 * The golden grid is the sea as it looked before the weather existed. It is
 * the anchor between this project and the one it grew out of: with the
 * weather turned off, the sea here must be exactly the sea there, cell for
 * cell.
 *
 * Two fixtures are captured:
 *
 *   seed-42-steps-120.json          the sea at rest
 *   seed-42-steps-120-clicked.json  the same sea, after a click at the centre
 *
 * The clicked one matters because the sea at rest has no accent colour in
 * it at all, so on its own it cannot catch a change to how the accent
 * levels are mapped.
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
const FIXTURES = resolve(HERE, "../tests/e2e/fixtures");

/** The seed and the step count the fixtures are captured at. */
const SEED = 42;
const STEPS = 120;

/** The viewport the fixtures are captured at, and that the test pins. */
const VIEWPORT = { width: 900, height: 560 };

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:4173";

const browser = await chromium.launch({
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});

async function openSea(query) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.goto(`${BASE_URL}/?${query}`);
  await page.waitForFunction(() => window.__ready === true, { timeout: 20_000 });
  await page.waitForFunction(
    (steps) => window.__stepsTaken >= steps,
    STEPS,
    { timeout: 20_000 },
  );
  return page;
}

/** The grid, plus the cell size, so the click can be aimed. */
async function readGrid(page) {
  return page.evaluate(() => ({
    ...window.__grid(),
    cellSize: window.__cellSize(),
  }));
}

function fixtureFor(grid, extra) {
  return {
    description:
      "The sea as it was before the weather existed. Regenerate with tools/capture_golden.mjs.",
    seed: SEED,
    steps: STEPS,
    viewport: VIEWPORT,
    columns: grid.columns,
    rows: grid.rows,
    seaRows: grid.seaRows,
    ...extra,
    glyphs: grid.glyphs,
    colors: grid.colors,
  };
}

// The sea at rest.
const rest = await openSea(`seed=${SEED}&steps=${STEPS}`);
const restGrid = await readGrid(rest);
await writeFile(
  resolve(FIXTURES, "seed-42-steps-120.json"),
  `${JSON.stringify(fixtureFor(restGrid, {}), null, 2)}\n`,
  "utf8",
);
console.log(
  `captured the sea at rest: ${restGrid.glyphs.length} cells ` +
    `(${restGrid.columns}x${restGrid.seaRows})`,
);

// The same sea, with a click in the middle of it.
//
// The step limit stops the simulation, so the sea is in exactly the same
// state every run, and the click lands in the same cell every run. The
// click's mark is what puts an accent colour in the grid, which is what
// makes this fixture able to catch a change to the accent levels.
const clicked = await openSea(`seed=${SEED}&steps=${STEPS}`);
const clickGrid = await readGrid(clicked);

const targetX = Math.floor(clickGrid.columns / 2);
const targetY = Math.floor(clickGrid.seaRows / 2);
const cell = await clicked.evaluate(() => {
  const canvas = document.getElementById("sea");
  const rect = canvas.getBoundingClientRect();
  return { left: rect.left, top: rect.top };
});

await clicked.mouse.move(
  cell.left + (targetX + 0.5) * clickGrid.cellSize.cellWidth,
  cell.top + (targetY + 0.5) * clickGrid.cellSize.cellHeight,
);
await clicked.mouse.down();
await clicked.mouse.up();
await clicked.waitForTimeout(200);

const afterGrid = await readGrid(clicked);
await writeFile(
  resolve(FIXTURES, "seed-42-steps-120-clicked.json"),
  `${JSON.stringify(
    fixtureFor(afterGrid, { clickedAt: { x: targetX, y: targetY } }),
    null,
    2,
  )}\n`,
  "utf8",
);
console.log(
  `captured the sea after a click at ${targetX},${targetY}: ` +
    `${afterGrid.colors.filter((c) => c > 0).length} accented cells`,
);

await browser.close();
