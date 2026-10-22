# The weather — design

**Date:** 2026-10-22
**Repository:** `GloriousChicken/ascii-machine-weather`
**Status:** approved in conversation, pending the builder check

---

## Intent, and the why

The sea is a flow field of characters that you stir with the mouse. Today it
is a single, unchanging temperament: the same drift, forever, with no
weather and no time of day. It is beautiful and it is *flat*. Nothing
happens to it that the viewer did not cause.

This adds weather that happens on its own. Not a setting to choose from — a
system. The sea develops a climate, the climate produces squalls and fog
banks and rain, they arrive and pass, and the sea is never quite the same
twice. The viewer is a passenger in it, and can also call the weather up
themselves.

The reason this is elegant rather than gimmicky is that **a storm is the
mouse gesture playing by itself, at a thousand times the scale.** The viewer
already knows what a stirred plume looks like, because they have just been
making one. A storm needs no new visual vocabulary: it is the same shape,
unattended, drifting across the sea.

The project this grew out of, `ascii-machine-web`, is a faithful port of a
terminal app and makes a parity claim it can keep. The weather erodes that
claim by design, so it lives in its own repository, beside the original
rather than on top of it.

---

## Goals

- The sea develops weather on its own, on a repeating cycle, and the cycle
  is worth watching all the way round.
- Six kinds of weather, each visually unmistakable from the others.
- A storm is lit in the accent colour, so it reads at a glance against the
  grey sea.
- The viewer can summon weather themselves, and it lands under the cursor.
- A shared link reproduces the entire picture: the sea, the weather, the
  cycle position, the time of day.
- The weather-free sea is byte-for-byte the sea of `ascii-machine-web`.
- The weather costs a small fraction of the frame budget.

## Non-goals

- **The mouse's velocity kick stays dead.** `Simulation.stir()` adds to
  `vx`/`vy`, but `step()` replaces `vx`/`vy` wholesale with the curl of the
  potential, so the kick survives zero steps. Only the density it injects
  and the energy it marks persist. This is true of the terminal app too, and
  parity is the spine of this project. The weather gets its own wind field
  instead; the mouse does not.
- **Weather is not a user-facing dial.** There is no "set the weather to
  squall" control. The weather is a system. The one thing the viewer can do
  is call it up.
- **The weather is not in the URL.** It is part of the seed, so `?seed=`
  already replays the whole schedule. The only weather-related URL
  parameter is `?weather=off`, which disables the system entirely.
- **The `p` palette still governs the storm's colour.** The storm uses the
  existing accent palette: a squall in `ice` is blue, in `blood` is red.
- **No new glyphs in the sea.** The sea stays ASCII, and the ramp stays as
  it is. The rain is drawn on the overlay canvas, not into the sea.

## Anti-goals

These are the ways this could succeed technically and still be a failure.

- **The weather must never make the sea unreadable.** A storm is dramatic,
  but the sea has to stay legible as a sea. If the characters smear into
  noise, the effect has failed even if it is impressive.
- **The weather must never make the shared-link promise false.** If a link
  shows one sea and the recipient sees another, the feature is a bug.
- **The weather must never change the weather-free sea.** The golden grid
  is the guarantee.
- **The weather must never cost more than a few percent of the frame.** It
  is decoration. It does not get a budget of its own.
- **The weather must never feel like a demo.** If the cycle reads as a
  slideshow of effects rather than as weather, it has failed.

---

## Constraints

- The canonical grid is 160x60 and never changes. The density is resampled
  for display, so a seed means the same sea at any window size.
- The renderer is WebGL 2, one instanced draw call, one quad per cell. The
  weather does not add a draw call: the rain goes on the 2D overlay canvas
  that already floats above the sea.
- The frame budget is 16.7ms. The current frame costs 1.88ms.
- The simulation advances on a fixed clock at 60 steps per second.
- Commits are authored as
  `GloriousChicken <218804855+GloriousChicken@users.noreply.github.com>`.
  No personal names, no email addresses, no local filesystem paths in the
  tree or in the history. Both this repository and `ascii-machine-web` have
  a local git identity set to that; the global git config still holds a
  real name and address, so every repository that matters has to override
  it locally.
- MIT licensed, with JetBrains Mono under the SIL Open Font License, whose
  text ships in `public/OFL.txt`.

---

## The model

### The region

Every phenomenon is a **region**: a disc on the canonical grid.

| Field | Meaning |
|---|---|
| `kind` | which phenomenon it is |
| `x`, `y` | the centre, in canonical cells, wrapping toroidally |
| `radius` | the radius, in canonical cells |
| `driftX`, `driftY` | how fast the centre travels, in cells per step |
| `spin` | angular velocity, in radians per step |
| `age`, `life` | the region's age and total lifetime, in steps |
| `seed` | so a region can make its own reproducible choices |

A region's strength follows a life curve. It builds fast, holds, and fades
slowly:

```
intensity(t) = smoothstep(0, 0.15, t) * (1 - smoothstep(0.65, 1, t))
```

where `t = age / life`. The fast build is what makes a squall read as a
squall arriving rather than as a shape already in the sea; the slow fade is
what makes it read as weather rather than as an effect.

### The kinds

Six kinds, in three pairs. Each is the same disc with different parameters
and different side effects.

| Kind | Radius (cells) | Drift (cells/step) | Spin | On the flow | On the characters |
|---|---|---|---|---|---|
| `squall` | 16 | 0.9 | 0.035 rad/step | tangential + directional push | energy mark, strong |
| `gust` | 26 | 1.6 | 0 | directional push only | energy mark, strong |
| `fog` | 34 | 0.35 | 0 | damps the flow | wash toward mid-ramp |
| `clearing` | 30 | 0.25 | 0 | nothing | wash away from mid-ramp |
| `rain` | 20 | 0.6 | 0 | downward push | energy mark, light, plus falling drops |
| `hail` | 22 | 0.5 | 0 | nothing | energy spikes at impact points |

Every number in that table is a **starting point to be tuned by eye**. The
values are guesses; the real ones come from looking at the thing.

The pairs are opposites, which is the point: `fog` and `clearing` are the
same disc with the wash sign flipped, and `squall` and `gust` are the same
disc with the spin taken out. `rain` and `hail` are the sky's pair.

### The cycle

A 70-second lap, 4200 steps at 60 steps per second.

| Act | Steps | What happens |
|---|---|---|
| `calm` | 900 | nothing. The sea drifts. |
| `building` | 720 | a wide soft fog bank drifts across. The sea flattens and pales. The light goes flat. |
| `storm` | 1500 | a squall, or a gust, crosses, lit in the accent colour. Rain or hail may ride along with it. |
| `clearing` | 1080 | the fog lifts. The contrast snaps up. The sea goes crystalline, and the storm's remnants wash away. |

The cycle starts at `calm` and loops forever. The first squall lands at
step 1620, about 27 seconds in.

`rain` and `hail` are not acts of their own. They are **companions** of the
storm act, spawned overlapping it, because rain belongs to a storm and not
to the weather in general.

Which storm the cycle produces — squall or gust — and whether rain or hail
rides along, are drawn from the seeded generator, so a given seed always
produces the same sequence of weather.

### The push

For a cell at distance `d` from a region's centre:

```
falloff = exp(-(d * d) / (radius * radius))
push    = falloff * intensity
```

The **tangential** component is the rigid-vortex form, `spin * d`, directed
perpendicular to the radius. The **directional** component is a constant
push along the drift direction, which is what makes a gust a gust. Both are
scaled by `push` and added to the wind field.

`fog` instead **damps** the flow: the local flow speed is scaled down
towards zero inside the region, so the sea inside the fog goes syrupy and
still. This is the one effect that is not an addition, and it is why the
simulation needs a scale field and not just a wind field.

### The wash

`fog` and `clearing` work on the *characters* rather than on the flow, and
they do it through a single scalar field, the **wash**.

The wash is a canonical-sized field. Its sign carries the meaning:

- **positive** — wash the cell's density towards the middle of the glyph
  ramp. The cell goes pale, and the sea loses contrast.
- **negative** — push the cell's density away from the middle of the ramp.
  The cell sharpens, and the sea gains contrast.

The wash is applied to the normalised density *before* the density is
mapped to a character, not to the character itself. So `fog` turns heavy
`@`s into mid-ramp characters and empty spaces into mid-ramp characters
alike, which is what fog does.

### The rain

Rain is the one phenomenon that is not a shape in the sea. It is a curtain
of falling characters.

Rain drops are defined in canonical space, one per column across the
region's width, each with a phase, and they fall at a fixed rate. They are
**projected** into display space rather than resampled, because a character
cannot be resampled — only a scalar field can.

The drops are drawn on the 2D overlay canvas, which already draws the status
line and the help, and which already knows how to draw text. This keeps the
glyph atlas and the WebGL renderer untouched, and it means the rain can use
characters that are not in any glyph ramp.

### The coordinate rule

**Scalar fields are resampled. Discrete marks are projected.**

The wind and the energy are canonical and reach the display through
`resizeField`, exactly like the density. The wash is canonical and
resampled. The rain drops are characters and are projected.

---

## The determinism contract

- `?seed=N` gives the same sea, the same weather, the same cycle position,
  the same everything, at any window size.
- The weather schedule is drawn from the seeded generator, and the weather
  steps **once per simulation step**, not once per frame, so it stays in
  lockstep with the sea.
- `?weather=off` disables the weather system entirely. The sea with the
  weather off is byte-for-byte the sea of `ascii-machine-web`. This is
  pinned by a golden grid test, and the fixture is
  `tests/e2e/fixtures/seed-42-steps-120.json`.
- The weather stops when the sea is paused, because it steps with the sea.
- `?steps=N` stops both together, which is what makes the weather testable
  at a chosen moment in the cycle.

---

## The interfaces

```ts
// src/weather.ts
export type WeatherKind = "squall" | "gust" | "fog" | "clearing" | "rain" | "hail";
export type CycleAct = "calm" | "building" | "storm" | "clearing";

export interface WeatherRegion {
  readonly kind: WeatherKind;
  readonly x: number;        // canonical cells, toroidal
  readonly y: number;
  readonly radius: number;   // canonical cells
  readonly driftX: number;   // cells per step
  readonly driftY: number;
  readonly spin: number;     // radians per step
  readonly age: number;      // steps
  readonly life: number;     // steps
  readonly seed: number;
}

export interface RainDrop {
  readonly x: number;        // display cells
  readonly y: number;        // display cells
  readonly glyph: string;
}

export class WeatherSystem {
  constructor(seed: number, options?: { enabled?: boolean });
  readonly enabled: boolean;
  readonly regions: readonly WeatherRegion[];
  readonly act: CycleAct;
  /** The wash field, canonical, CANONICAL_HEIGHT * CANONICAL_WIDTH. */
  readonly wash: Float32Array;
  step(): void;
  applyToSimulation(sim: Simulation): void;
  rainDrops(columns: number, rows: number): RainDrop[];
  summon(kind: WeatherKind): void;
}
```

```ts
// src/simulation.ts — added to Simulation
readonly windVx: Float32Array;
readonly windVy: Float32Array;
/** 1 is free flow, 0 is frozen. */
readonly flowScale: Float32Array;
```

`Simulation.step()` applies them, right after `updateFlow()` and before the
advection:

```
for (let i = 0; i < vx.length; i++) {
  vx[i] = vx[i] * flowScale[i] + windVx[i];
  vy[i] = vy[i] * flowScale[i] + windVy[i];
}
```

The simulation also stores its seed, and `reset()` re-makes the generator
from that seed before rebuilding the noise tiles, so that a reset replays
the identical sea *and* the identical weather schedule. The tiles are built
in the same order as today, from a freshly seeded generator, so the
weather-free sea is unchanged.

---

## The changes, file by file

| File | What changes |
|---|---|
| `src/weather.ts` | new. The kinds, the region, the cycle, the schedule, `summon`. |
| `src/simulation.ts` | the wind field, the flow scale, and the seed/reset. |
| `src/main.ts` | the weather step inside the simulation-step loop, the wash resample and application, the `w` key, the `?weather=` parameter, the status line. |
| `src/ui.ts` | the rain drops on the overlay, and compositing the overlay into the saved PNG. |
| `src/input.ts` | remembering where the pointer is, so a summoned storm can land under it. |
| `src/palette.ts` | opening up the third accent level, which is currently unreachable. |
| `src/hooks.ts` | test hooks for the weather state. |

### The third accent level

`accentIndex()` emits only 0, 1 and 2, and the shader's fourth colour slot
is never sampled, so the third colour of every palette is dead. `ember`
never shows its yellow. Opening the third level up means a squall's hot core
burns the third colour while its fringes stay in the first, which is
exactly the gradient a storm wants.

### The saved PNG

`s` currently saves the sea canvas alone, which would miss the rain on the
overlay. The save composites the two canvases, so the exported picture
matches what is on screen.

---

## The interaction

| Key | Action |
|---|---|
| `w` | summon the next kind of weather, under the cursor |

`w` cycles the six kinds in a fixed order: squall, gust, fog, clearing,
rain, hail, and around again. Summoned weather is a region like any other,
so it lives its own life curve and fades on its own. It is not part of the
seed and not part of the URL, so it is not shared.

If the pointer has never moved, the storm lands in the middle of the sea.

---

## What is left to the builder

- The exact easing of the life curve, and the exact falloff exponent.
- The exact wash blend, and how strongly `fog` and `clearing` should pull
  the density towards and away from the middle of the ramp.
- The rain's glyph set, its fall rate, and how many drops a region carries.
- The exact split of the file's responsibilities between `src/weather.ts`,
  `src/main.ts` and `src/ui.ts`.
- How the region's drift direction is chosen, and whether it should drift
  with the sea's own current rather than at a fixed angle.
- All of the numbers in the tables above, once anybody has watched it.

---

## What would make this a failure

- The cycle reads as a sequence of effects rather than as weather.
- A storm is so bright or so large that the sea stops being a sea.
- The rain is noisy enough to be a texture rather than weather.
- The weather-free sea has changed in any way, at any window size.
- A shared link shows a different picture to two people.
- The frame budget is spent on decoration.
