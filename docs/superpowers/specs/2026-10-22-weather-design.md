# The weather — design

**Date:** 2026-10-22
**Repository:** `GloriousChicken/ascii-machine-weather`
**Status:** approved in conversation, revised after the builder check

---

## Intent, and the why

The sea is a flow field of characters that you stir with the mouse. Today it
is a single, unchanging temperament: the same drift, forever, with no
weather. It is beautiful and it is *flat*. Nothing happens to it that the
viewer did not cause.

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

The light changes as the weather does — it goes flat when the fog comes in
and it snaps sharp when the air clears — but there is no separate
time-of-day system. The light is a consequence of the wash, and nothing
else.

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
- A shared link reproduces the sea and the weather schedule.
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
  it is. The rain and the hail are drawn on the overlay canvas, not into the
  sea.

## Anti-goals

These are the ways this could succeed technically and still be a failure.

- **The weather must never make the sea unreadable.** A storm is dramatic,
  but the sea has to stay legible as a sea. If the characters smear into
  noise, the effect has failed even if it is impressive.
- **The weather must never make the shared-link promise false.** The same
  seed must give the same sea and the same sequence of weather. The *phase*
  of the cycle is the one thing a link does not carry — see the
  determinism contract — and that is a stated limitation, not a bug.
- **The weather must never change the weather-free sea.** The golden grid
  is the guarantee.
- **The weather must never cost more than a few percent of the frame.** It
  is decoration. It does not get a budget of its own.
- **The weather must never feel like a demo.** If the cycle reads as a
  slideshow of effects rather than as weather, it has failed.
- **The six kinds must never be indistinguishable.** Two storms that look
  alike are one storm and a half of a design.

---

## Constraints

- The canonical grid is 160x60 and never changes. The density is resampled
  for display, so a seed means the same sea at any window size.
- The renderer is WebGL 2, one instanced draw call, one quad per cell. The
  weather does not add a draw call: the rain and the hail go on the 2D
  overlay canvas that already floats above the sea.
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

| Kind | Radius | Drift | Spin | Push | On the flow | On the characters |
|---|---|---|---|---|---|---|
| `squall` | 18 | 0.9 | 0.12 rad/step | tangential, plus 0.4 straight | the water swirls | energy mark, strong |
| `gust` | 28 | 1.6 | 0 | 2.0 straight | the water is shoved | energy mark, strong |
| `fog` | 36 | 0.35 | 0 | none; damped to 15% | the water goes still | wash toward mid-ramp |
| `clearing` | 32 | 0.25 | 0 | none | nothing | wash away from mid-ramp |
| `rain` | 22 | 0.6 | 0 | 0.8 downward | the water is pulled down | light energy mark, plus falling drops |
| `hail` | 24 | 0.5 | 0 | none | nothing | impact energy, plus falling drops |

Drift is in cells per step, spin is in radians per step, and push is in
cells per step of imposed velocity.

Every number in that table is a **starting point to be tuned by eye**. The
values are guesses; the real ones come from looking at the thing.

The pairs are opposites, which is the point: `fog` and `clearing` are the
same disc with the wash sign flipped, and `squall` and `gust` are the same
disc with the spin taken out. `rain` and `hail` are the sky's pair.

### The push must dominate

The base flow is normalised to unit length, so the sea's own water moves at
about one cell per step. A weather effect that merely *perturbs* that flow
is invisible: a squall whose swirl is a tenth of the base speed looks like
the sea, and a gust that adds a fraction to the local direction looks like
the sea too.

So the rule is that **the weather decides which way the water goes inside
its own region.** A squall's tangential speed is `spin * d`, which at the
Gaussian peak is about 1.3 cells per step, against a base of 1.0. A gust's
shove is 2.0 cells per step against the same base of 1.0. Fog damps the
flow to a sixth of its speed. Below those magnitudes the kinds stop being
distinguishable, and this is the first thing to check when tuning.

### The mark is the signature

The energy a storm writes is advected by the storm's own push and decays at
0.94 per step, so it does not sit still. A squall's mark winds into a
spiral; a gust's smears into a streak. The shape of the lit region is the
storm's signature, and it is what tells the two apart even where the two
pushes look similar. This is not an extra effect to build — it falls out of
marking energy in a moving flow, which is what the mouse already does.

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

### The curtains

Rain and hail are the two phenomena that are not a shape in the sea. They
are curtains of falling characters.

Drops are defined in canonical space, one per column across the region's
width, each with a phase, falling at a fixed rate. They are **projected**
into display space rather than resampled, because a character cannot be
resampled — only a scalar field can.

Rain's drops are long-lived and leave no mark. Hail's drops are short-lived
and leave an energy spike where they land, which is what makes hail read as
hitting a surface rather than as a finer rain.

The drops are drawn on the 2D overlay canvas, which already draws the status
line and the help, and which already knows how to draw text. This keeps the
glyph atlas and the WebGL renderer untouched, and it means the drops can use
characters that are not in any glyph ramp.

The drops are drawn in the **accent palette's hottest colour**, because the
rain belongs to the storm and should read as part of it. This is also what
finally makes the palette's third colour reachable, which today it is not.

### The coordinate rule

**Scalar fields are resampled. Discrete marks are projected.**

The wind and the energy are canonical and reach the display through
`resizeField`, exactly like the density. The wash is canonical and
resampled. The drops are characters and are projected.

A region's radius is isotropic **in canonical cells**, which is what the
mouse's own stir is, and what the sea's own eddies are. On screen that
means a region is not a circle: the canonical grid is 160x60 and the display
is usually wider than that in aspect, so a canonical disc arrives as a tall
ellipse, exactly as the flow field's own features do. That is correct, not
an artefact. The consequence to keep in mind when tuning is that a squall's
radius of 18 is about a ninth of the sea's width at every window size, and
that is the number that matters.

---

## The determinism contract

- `?seed=N` gives the same sea and the same sequence of weather, at any
  window size.
- **The link does not carry the phase.** The cycle's position is a function
  of elapsed simulation steps, so two people opening the same link at
  different moments see the same sea with the same weather *coming*, at
  different points in the cycle. Reproducing the phase would mean either a
  URL parameter, which the "the weather is not in the URL" rule forbids, or
  a wall-clock-driven cycle, which would break the property the whole
  project rests on: that the sea is a pure function of the seed and the
  step count. The trade is deliberate. A river is the same river at every
  moment; you do not get the same instant of it by asking for the river.
- The weather schedule is drawn from the seeded generator, and the weather
  steps **once per simulation step**, not once per frame, so it stays in
  lockstep with the sea.
- `?weather=off` disables the weather system entirely: no regions, no
  wash, no drops, and the `w` key does nothing. The sea with the weather
  off is byte-for-byte the sea of `ascii-machine-web`, and this is pinned
  by two golden grid tests, with the fixtures in
  `tests/e2e/fixtures/`. One fixture is the sea at rest; the other is the
  same sea after a click, because the sea at rest has no accent colour in
  it and so cannot catch a change to the accent levels on its own.
- `r` restarts the sea and the weather schedule together, because the
  weather's generator is reset with it.
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

export interface WeatherDrop {
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
  drops(columns: number, rows: number): WeatherDrop[];
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

The weather keeps its own seeded generator, and its own `reset()`, which
re-makes that generator and clears the regions. So pressing `r` restarts
the sea *and* the weather schedule, and the two are independent.

The simulation needs no change in this respect. Its generator is only ever
drawn from in the constructor, so `reset()` already restarts the sea
exactly, and the weather-free sea is unchanged.

### Where the weather steps

The weather steps **outside** the simulation, in the main loop, immediately
before each `simulation.step()`. The simulation stays ignorant of the
weather, which keeps the simulation's contract exactly what it is today.

The cost of that choice is that the existing performance test would not see
the weather at all, because the hooks it drives call `simulation.step()`
only. So the hooks change: `__frameOnce()` has to include the weather step,
or the "never more than a few percent of the frame" anti-goal has no guard.
A new hook measures the weather's own cost, and a new bound holds it.

---

## The changes, file by file

| File | What changes |
|---|---|
| `src/weather.ts` | new. The kinds, the region, the cycle, the schedule, `summon`. |
| `src/simulation.ts` | the wind field and the flow scale. Nothing else. |
| `src/main.ts` | the weather step inside the simulation-step loop, the wash resample and application, the `w` key, the `?weather=` parameter, the status line. |
| `src/ui.ts` | the drops on the overlay, the overlay's accent colour, and compositing the overlay into the saved PNG. |
| `src/input.ts` | remembering where the pointer is, so a summoned storm can land under it. |
| `src/palette.ts` | opening up the third accent level, which is currently unreachable. |
| `src/hooks.ts` | test hooks for the weather state, and the weather-aware `__frameOnce()`. |

### The third accent level

`accentIndex()` emits only 0, 1 and 2, and the shader's fourth colour slot
is never sampled, so the third colour of every palette is dead. `ember`
never shows its yellow.

The fix must not change what the mouse looks like. `Simulation.stir()`
writes a falloff into the energy field, and a falloff is never more than
1.0, so **the mouse can never reach a new level above 1.0.** A storm, on
the other hand, writes energy of up to 2.0 at its core. So the new level is
a band above 1.0:

| Energy | Level | Colour |
|---|---|---|
| below 0.3 | 0 | the sea's grey |
| 0.3 to 0.72 | 1 | the first accent |
| 0.72 to 1.3 | 2 | the second accent |
| 1.3 and above | 3 | the third accent |

The mouse is bit-for-bit unchanged, its existing tests are unchanged, and a
squall's hot core burns the third colour while its fringes stay in the
first. That is exactly the gradient a storm wants, and it is the gradient
the palette was already drawn for.

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
- The drops' glyph sets, their fall rates, and how many a region carries.
- The exact split of the file's responsibilities between `src/weather.ts`,
  `src/main.ts` and `src/ui.ts`.
- How the region's drift direction is chosen, and whether it should drift
  with the sea's own current rather than at a fixed angle.
- All of the numbers in the tables above, once anybody has watched it.

---

## What would make this a failure

- The cycle reads as a sequence of effects rather than as weather.
- Two kinds of storm look alike.
- A storm is so bright or so large that the sea stops being a sea.
- The drops are noisy enough to be a texture rather than weather.
- The weather-free sea has changed in any way, at any window size.
- The frame budget is spent on decoration.
