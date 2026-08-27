# CREW — SPAWN SKY (decision 4: "sure if you can make it beautiful")

**Round 2B. Proposal only. Nothing here has landed.**
Conditional by the owner's own words: photographs first, the owner sees them,
nothing lands without that.

Everything below was derived on 2026-08-27 from constants read off disk at
HEAD (`b975897`), by projecting the real coastline polygons through the real
camera. The scripts are throwaway; the inputs are not, and every one is named
at the line it was read from. **These are geometric predictions, not rendered
measurements.** The probe in §6 is what turns them into measurements, and §8
says what happens if it disagrees with me.

---

## 1. WHAT THE SPAWN MOMENT ACTUALLY IS — AND IT IS NOT THE FRAME I EXPECTED

`docs/GOVERNOR.md` records: *"At real spawn size the sky is 0.0% of the frame.
At the spawn, and standing directly on the coast."* That is true and I
reproduce it. But it describes the SETTLED frame, and the settled frame is not
the first thing a child sees.

The first thing a child sees is the **establishing shot**, and it is a
different camera. `prototype3d.ts:9202-9204`:

    const k2 = Math.max(0, introT / COPY.introLen);
    camDist = 38 + 262 * k2 * k2;   // ease-in dive from orbit

So the match opens at **camDist 300** and dives to 38 across `COPY.introLen`
— 2.2s (maple, pirate), 3.4s (gameday), 3.6s (lantern), 3.5s (powder). During
the first quarter the subject is held on the world's hero landmark
(`:9213-9224`), then hands over to the void.

The pitch does not change during any of this. `camOffset` is rebuilt every
frame from `steep = clamp((R - 2.5) / 5.5)` (`:9230`), which is **0** at spawn
radius, so the rig is `(0.62, 0.92, 0.62).normalize()` and the optical axis is
**46.4° below horizontal, azimuth 225°, for the whole opening move.** The
camera sits at `lookPoint + camOffset * camDist` and looks at the look point
(`:9263-9276`), so distance is the only free variable and the frame's
elevation band is fixed at **−30.4° (top) to −62.4° (bottom)** throughout.

That gives one clean piece of arithmetic. With the top-of-frame ray at 30.4°
below horizontal from a camera `0.7239·D` high and `0.6900·D` back, the ray
meets the ground **0.5437·D beyond the look point**. At settled spawn
(D = 41.4) that is 22 units past the hero — the recorded 0.0%. At the opening
beat (D = 300) it is **163 units**, and 163 units is past the coastline in
four of the five worlds.

### The spawn sky exists. It is 0.6–1.2 seconds long, and it is not empty in every world.

Sky share of the frame at the opening beat (camDist 300, subject on the
landmark), computed by ray-marching a 200×433 grid of pixels against each
world's own coastline — `ISLAND_CTRL` (`island.ts:81`) through
`silhouetteWorld()`, `BAY_LAND` (`bay.ts:14`), `GD_LAND` (`gameday.ts:56`),
`LN_LAND` (`lantern.ts:55`), `PW_LAND` (`powder.ts:60`), each through the
`smoothPoly()` at `bay.ts:126`:

| world | sky at the opening beat | the sky's elevation band | sky gone by |
|---|---|---|---|
| maple | **0.0%** | none at all | — |
| gameday | 10.2% | −30.1 … −34.2 (a 4.1° strip) | 0.59s |
| lantern | 20.8% | −30.1 … −38.6 | 1.17s |
| powder | 26.8% | −30.1 … −40.7 | 1.22s |
| pirate | 29.3% | −30.1 … −62.3 (the hook's gap) | 0.72s |

The lower edge of each band is that world's own coastline seen from 300 units
up. It is **fixed by geography and cannot be moved by any art change.** The
upper edge is the frame, at −30.4°, and that cannot be moved either without
moving the camera.

The title card does not cover it: `#titlecard`'s scrim is
`radial-gradient(ellipse 78% 34% at 50% 50%, …)` (`index.html:570`), fully
transparent above about 23% of the viewport height, and the sky sits in the
top 14–34% of the frame.

---

## 2. AND THERE IS NOTHING IN IT

Every celestial body in this game is placed for the **late** camera. The
comment at `island.ts:825-829` says so in its own words: *"At the sizes where
space is actually on screen the camera is at its steepest … so these sit
between -57 and -75."* At VOID TITAN the pitch is 65.6° and the band is
−49.6…−81.6, so −57 is dead centre. At the spawn the band is −30.4…−62.4 and
−57 is 83% of the way down the frame — where the island is.

Two findings drop out of that, and the second one is a defect:

**(a) The only body on screen at any world's opening beat is Pirate's ringed
teal giant**, and only because Pirate Bay is a hook with a gap in it, so its
sky runs all the way down the frame. It measures 98% of its disc unoccluded,
centred 83% down. Pirate's spawn sky already works. Everywhere else the
opening beat shows nebula, 5–19 stars, and no body.

**(b) The SECOND body in every world — the "cold moon", the "pale companion" —
is off the frame entirely for the first two thirds of every match, and behind
the island for most of the rest.** At −76/−77° it needs pitch ≥ 60° to enter
the frame at all, which the `steep` ramp does not reach until **radius 6.2**.
Sampling every on-land cell of a 24×24 grid over each world:

| world | giant visible at r=1 / 4 / 8 / 14 | moon visible at r=1 / 4 / 8 / 14 |
|---|---|---|
| maple | 2% / 3% / 12% / 16% of positions | 0% / 0% / 11% / 15% |
| pirate | 3% / 4% / 13% / 20% | 0% / 0% / 15% / 20% |
| gameday | 2% / 4% / 14% / 20% | 0% / 0% / 14% / 20% |
| lantern | 3% / 4% / 21% / 31% | 0% / 0% / 18% / 26% |
| powder | 4% / 7% / 14% / 20% | 0% / 0% / 15% / 23% |

Five bodies were authored with painted terminators, bands and rings for a
window the camera opens only after a child has grown past radius 6.

And the stars are thin where it matters. Monte-Carlo'ing the real
distribution — `ph = rand(0.15, Math.PI * 0.95)`, N = 5000 (`island.ts:682`,
`:709`) — through the real frustum and the real occlusion, the visible sky at
the opening beat holds **4.6 stars in Game Day, 9.8 in Lantern, 12.9 in
Powder, 19.4 in Pirate.** The field was sized for a 32°-tall band
(`island.ts:678-681`); the spawn shows a 4–11° strip of it.

**So the spawn sky today is: a strip of painted nebula at the top of the
frame, a handful of specks, and — outside Pirate — nothing else.** That is
what "make it beautiful" has to answer.

### One correction to the record, found on the way

`island.ts:812-814` says the giants are "7-8 degrees". The **sprite** is 7–10°;
the **painted disc** is `size × 0.8`, because `paint()` draws at
`R = S * 0.40` on a 512 canvas (`island.ts:865`). The discs are maple 6.99°,
pirate 7.98°, gameday 7.52°, lantern 7.01°, powder 7.98° — the comment is
right about the thing you see and it is not right about `size`. Verified
against a real frame: `qa/out/space/maple.png` shows the amber giant spanning
about 46% of the width, and 6.99° of the 15.07° portrait horizontal field is
46.4%. Every size below is quoted as the disc and converted with that factor.

---

## 3. THE PATCHES

Three, in landing order. Patch 1 is the instrument and must land first, because
the before-photographs cannot be taken without it. Patch 2 is the art. Patch 3
is the probe.

Anchors verified by reading the files at HEAD on 2026-08-27. Match on the
BEFORE text, not on the line numbers.

---

### PATCH 1 — `__pinIntro(u)`: hold the establishing shot so it can be photographed

**Why.** The opening move is the only camera in this game that ever points at
sky. It lasts under four seconds, the camera travels ~110 units per second of
it, and `qa/skypop.mjs`'s census swaps the background across four rAF frames —
which is exactly the "moving high-contrast edge" failure its own comment at
`:112-114` warns about. A before/after pair taken at two different points of a
moving dive is not a before/after pair. Pin it, and the census, the photograph
and the owner's eye all get the same frame.

There is precedent for every part of this: `__pinQuality`, `__pinMouth`,
`__pinGape`, `__setVoidR`, `__rushClock` all exist to stop something moving so
it can be measured.

**1a — `src/prototype3d.ts`, the debug interface (~:1646).**

BEFORE (verbatim):

```ts
  __pinQuality: (n: number | null) => void;
```

AFTER:

```ts
  __pinQuality: (n: number | null) => void;
  __pinIntro: (u: number | null) => void;
```

**1b — `src/prototype3d.ts`, the intro's state (~:5332).**

BEFORE (verbatim):

```ts
let introT = 0, outroT = 0;
```

AFTER:

```ts
let introT = 0, outroT = 0;
// QA: hold the establishing shot at a fixed point on its own curve — see
// __pinIntro. The opening move is the only camera in this game that ever
// points at sky, it does so for under a second, and it is travelling ~110
// units a second while it does — so a measurement taken while it runs is a
// measurement of a different frame every time. null = play it normally.
let introPin: number | null = null;
```

**1c — `src/prototype3d.ts`, the hook itself (~:1870).**

BEFORE (verbatim — this string occurs exactly once):

```ts
_dbg.__quality = () => ({ level: qLevel, pinned: qPinned, shadows: renderer.shadowMap.enabled,
```

AFTER:

```ts
// QA: HOLD THE ESTABLISHING SHOT. `u` is the opening move's own parameter:
// 1 is the first beat (camDist 300, subject on the world's landmark), 0.5 is
// halfway down the dive, 0.25 is the settle, null hands the move back. It
// re-enters the intro if it has already finished, so a probe does not have to
// win a race against a 2.2-second window.
//
// NOTE what stays true while it is pinned, because it is what the shot really
// renders: shadows are OFF (:9185 borrows them for the move and only gives
// them back when introT reaches 0), the controls are not live, and the welcome
// banners have not fired. That is the frame, not a doctored one.
_dbg.__pinIntro = (u: number | null) => {
  introPin = u;
  if (u !== null) introT = Math.max(1e-4, COPY.introLen * u);
};
_dbg.__quality = () => ({ level: qLevel, pinned: qPinned, shadows: renderer.shadowMap.enabled,
```

**1d — `src/prototype3d.ts`, the pin in the loop (~:9175).**

BEFORE (verbatim — `introT -= dt;` occurs exactly once in the file):

```ts
    if (introT > 0) {
      introT -= dt;
```

AFTER:

```ts
    if (introT > 0) {
      introT -= dt;
      // QA: __pinIntro holds the move here, AFTER the decrement, so k2 below is
      // exactly the pinned value rather than the pinned value minus one frame.
      if (introPin !== null) introT = Math.max(1e-4, COPY.introLen * introPin);
```

`COPY` is `const COPY = WORLD_COPY[pickedWorld]` at `:1419`, so it is
initialised long before either call site runs.

Cost: nothing. Inert unless a probe calls it.

---

### PATCH 2 — THE OPENING BODY, in Lantern and Powder only

**What it is.** One more body per world, placed in the band the establishing
shot can actually see, sized to sit above that world's own rim, painted plain —
no bands, no ring. One calm shape over the world's edge, at the moment the
camera is highest and the child has not touched anything. It is not a third
planet crowding the sky: it is the sky's first act.

**Why only two worlds.** Because that is what the geometry allows, and this is
the part of the proposal I expect to be argued with:

- **Powder** — sky band −30.1…−40.7 at the opening beat, 10.6° tall. A 5.60°
  disc centred at −35.5 spans −32.7…−38.3: **100% on frame, 100% unoccluded**,
  centre at x 67%, y 17% down.
- **Lantern** — band −30.1…−38.6, 8.5° tall. A 5.23° disc centred at −34.6
  spans −32.0…−37.2: **100% on frame, 98% unoccluded**, centre x 68%, y 14%
  down. The 2% is its lower limb behind the ridge, which is the read I want.
- **Game Day — NOT PROPOSED.** Its band is 4.1° tall. A disc that fits it is
  under 3°, and the rim it sits on is `treeline` on all four sides
  (`GAMEDAY_PLAN`, `island.ts:136-143`; `WOODS_OUT/WOODS_IN` inset 25 and 385,
  `gameday.ts:151-152`). A 12-unit tree at the ~400-unit slant range of that
  coastline subtends 1.7°, which is 41% of the whole strip. A body there is a
  clipped crescent between a tree line and the frame edge. That is fussy, not
  beautiful.
- **Pirate — NOT PROPOSED.** It already shows 98% of its ringed giant at the
  opening beat. Adding a second body to the one world whose spawn sky works is
  the definition of busier.
- **Maple — CANNOT.** 0.0% sky at the opening beat, and the arithmetic says
  why: sky needs the top ray to clear the coast, which along the 225° sightline
  from the Maple spawn is 345 units away, needing camDist ≥ 514 against the 300
  the dive starts at. Maple is world 1. See §7 for the only lever that changes
  that, priced and not proposed.

**Placement rationale for the numbers, since a skeptic will want each one:**

- `el` −34.6 / −35.5: as low as the world's rim allows while keeping the disc
  clear of the frame's top edge at −30.4°, with ≥1.6° of margin.
- `az AZ + 0.055` (both): AZ is 225°, the direction the rig always faces
  (`island.ts:830`). +0.055 rad puts the centre at **x ≈ 68%** of the frame.
  That is deliberate and it is a HUD call, not a composition one: `#board` is
  `position: fixed; top: ~10px; left: ~10px; max-width: 38vw; max-height: 152px`
  (`index.html:150-151`), so anything at x < 38% and y < 16% of a 932-tall
  screen is behind the score panel. At x 68%, y 14–17%, the body clears the
  board entirely and sits below the `#timer` glyphs (`top: ~12px`,
  `font-size: clamp(26px,8vw,40px)`, `index.html:117-121`).
- `size` 80 at d 700 → disc 5.23°; `size` 88 at d 720 → disc 5.60°. Both are
  **smaller than every giant in the game** (6.99–7.98°) and larger than every
  moon (2.22–3.02°). The recorded failure was an 18° body measuring 58.3% of
  the frame; these are a third of that angle.
- `d` 700 / 720: inside the 620–900 the other bodies already use, and well
  inside the far plane, which the camera-relative re-centring
  (`island.ts:3483-3486`) makes an exact 700/720 at every camera position —
  this is the retraction-10 fix and the new bodies inherit it by being pushed
  into the same `skyBodies` array.
- No `bands`, no `ring`. `paint()` gives it the terminator and the atmosphere
  glow, which is what separates a planet from a coloured circle
  (`island.ts:904-905`). Anything more is a second banded giant.

**2a — `src/proto3d/island.ts`, the LANTERN sky (~:847-855).**

BEFORE (verbatim):

```ts
      // a red lantern of a moon, and a distant violet companion
      lantern: [
        // #ff8a6a photographed as a salmon balloon. At that lightness the
        // painted terminator has nowhere to fall to, so the disc reads flat and
        // lit from nowhere. A deeper body in the same hue keeps the lantern red
        // and gives the shading somewhere to go.
        { d: 640, el: -56, az: AZ - 0.11, size: 98, hue: '#c9563f', dark: '#1e0713', glow: '#e8836a' },
        { d: 880, el: -76, az: AZ + 0.11, size: 58, hue: '#c9a6ff', dark: '#1d1440', glow: '#e0c9ff' },
      ],
```

AFTER:

```ts
      // a red lantern of a moon, a distant violet companion, and — above both —
      // the pale gold one the OPENING SHOT sees (see THE SPAWN BAND above)
      lantern: [
        // #ff8a6a photographed as a salmon balloon. At that lightness the
        // painted terminator has nowhere to fall to, so the disc reads flat and
        // lit from nowhere. A deeper body in the same hue keeps the lantern red
        // and gives the shading somewhere to go.
        { d: 640, el: -56, az: AZ - 0.11, size: 98, hue: '#c9563f', dark: '#1e0713', glow: '#e8836a' },
        { d: 880, el: -76, az: AZ + 0.11, size: 58, hue: '#c9a6ff', dark: '#1d1440', glow: '#e0c9ff' },
        // A harvest moon over the night market, and the only body in this world
        // a child sees before they touch anything. Plain: no bands, no ring —
        // the opening frame wants one calm shape, not a second banded giant.
        { d: 700, el: -34.6, az: AZ + 0.055, size: 80, hue: '#f4dfae', dark: '#2b1830', glow: '#ffeec6' },
      ],
```

**2b — `src/proto3d/island.ts`, the POWDER sky (~:856-860).**

BEFORE (verbatim):

```ts
      // an ice world with a bright ring, to match the aurora the poster set
      powder: [
        { d: 780, el: -57, az: AZ + 0.11, size: 136, hue: '#bfe6ff', dark: '#122844', ring: '#eaf7ff', bands: 3, glow: '#dff2ff' },
        { d: 660, el: -76, az: AZ - 0.11, size: 32, hue: '#9fe8d0', dark: '#0f2e2a', glow: '#c8f4e6' },
      ],
```

AFTER:

```ts
      // an ice world with a bright ring, to match the aurora the poster set —
      // and one warm moon low over the rim, for the opening shot
      powder: [
        { d: 780, el: -57, az: AZ + 0.11, size: 136, hue: '#bfe6ff', dark: '#122844', ring: '#eaf7ff', bands: 3, glow: '#dff2ff' },
        { d: 660, el: -76, az: AZ - 0.11, size: 32, hue: '#9fe8d0', dark: '#0f2e2a', glow: '#c8f4e6' },
        // The poster's rule for this world is warm windows against cold snow.
        // This is that rule in the sky: the one warm thing above a blue valley.
        // No ring — the ice giant already has one, and two ringed bodies in one
        // world reads as a set of stickers rather than as a solar system.
        { d: 720, el: -35.5, az: AZ + 0.055, size: 88, hue: '#ffd7a0', dark: '#2a1a2c', glow: '#ffe9c8' },
      ],
```

**2c — `src/proto3d/island.ts`, the note that would otherwise get these
"fixed" back (~:825-830).** This is not optional. The block above `SKIES`
currently states a rule the two new entries break, and the next reader will
obey the comment.

BEFORE (verbatim):

```ts
    // Elevation is the free axis, and it is where the variety goes. At the
    // sizes where space is actually on screen the camera is at its steepest and
    // the visible band runs about -50 to -81 degrees, so these sit between -57
    // and -75: below the island's edge, which is the only place you can see
    // past it from up here.
    const AZ = 3.927;   // 225 degrees, the direction the rig always faces
```

AFTER:

```ts
    // Elevation is the free axis, and it is where the variety goes. At the
    // sizes where space is actually on screen the camera is at its steepest and
    // the visible band runs about -50 to -81 degrees, so these sit between -57
    // and -75: below the island's edge, which is the only place you can see
    // past it from up here.
    //
    // ── THE SPAWN BAND, WHICH IS A DIFFERENT BAND ────────────────────────────
    // The paragraph above is true of PLAY and false of the OPENING. The match
    // opens on an establishing shot at camDist 300 (prototype3d.ts:9203) with
    // steep still 0, so the pitch is 46.4 degrees and the frame runs -30.4 to
    // -62.4 — and the top ray clears the ground 0.5437 * camDist past the
    // subject, which at 300 is 163 units and is past the coast in four worlds.
    // So there is a sky at the spawn, it is the top 10-29% of the frame, and it
    // lasts 0.6-1.2 seconds.
    //
    // The two bands DO NOT OVERLAP: -30.4..-62.4 at spawn against -49.6..-81.6
    // at VOID TITAN. No single elevation is in frame at both ends of a match,
    // so a body authored for one is invisible at the other. That is why Lantern
    // and Powder carry a THIRD entry at about -35: it is the opening's body,
    // it leaves the frame by radius 4, and the giants below it arrive as the
    // camera steepens. Three bodies, never more than two on screen at once —
    // measured across 2,568 and 2,608 sampled (position x radius) states.
    //
    // Game Day's opening band is only 4.1 degrees tall and its rim is treeline
    // on all four sides, so nothing fits there. Pirate already shows 98% of its
    // giant at the opening beat, through the gap in the hook. Maple sees no sky
    // at the opening at all: its coast is 345 units along the sightline and the
    // dive would have to start at camDist 514 instead of 300.
    const AZ = 3.927;   // 225 degrees, the direction the rig always faces
```

**What the two new bodies do across a match** (share of on-land grid positions
that see ≥20% of the disc):

| | r=1 | r=2 | r=3 | r=4 | r=6 |
|---|---|---|---|---|---|
| lantern | 7% | 11% | 19% | 0% | 0% |
| powder | 7% | 10% | 17% | 19% | 0% |

and through the establishing shot itself, share of the disc unoccluded:

| | t=0.00s | t≈0.6s | drops below 20% at |
|---|---|---|---|
| lantern (3.6s intro) | 98% | 41% | ~0.78s |
| powder (3.5s intro) | 100% | 73% | ~0.99s |

It rises with the world as the camera falls into it, and it is gone by the time
the controls go live. That is the shape of the beat, and it is what the
geometry does on its own — no animation, no new code path.

---

### PATCH 3 — `qa/spawnsky.mjs` (new file, complete)

Committed and run BEFORE patch 2, per GOVERNOR rule 2. Its failing reading is
the evidence: **planet coverage at the opening beat is 0.0% in Lantern and
Powder today.** It carries its own falsifier — Pirate must read non-zero on the
unpatched build, because Pirate's giant is on screen at the opening beat; if
Pirate reads zero, the probe is broken and nothing it says about the others
counts.

```js
// WHAT THE FIRST SECOND SHOWS — the establishing shot, held still.
//
// qa/skypop.mjs measures the sky at r=10 standing on a coast, which is the
// sky a child reaches after two minutes. This one measures the sky a child is
// shown before they touch anything: prototype3d.ts:9203 opens every match at
// camDist 300 and dives to 38 over COPY.introLen, and that move is the only
// camera in the game that ever points at sky.
//
// It cannot be measured while it runs. The census below swaps the background
// across four rAF frames and demands a pixel move twice and come back; a
// camera travelling 110 units a second fails that test on every edge in the
// frame. So the probe pins the move with __pinIntro(u) and reads a still one.
//
// THE CLAIM, and it fails before the fix: planet coverage at the opening beat
// is 0.0% in Lantern and Powder on the unpatched build, because every body in
// those worlds sits at -56 or lower and the spawn frame stops at -30.4.
//
// THE FALSIFIER, which runs every time: PIRATE must read non-zero on any
// build, patched or not — its ringed giant is on screen at the opening beat
// through the gap in the hook. A zero there means this probe is broken and
// nothing it says about the other four worlds is evidence.
//
// NO BAR ON THE COLOUR NUMBERS YET, deliberately. sat / range / dark are
// printed so a bar can be set from a measured reading rather than a guess —
// same probation as qa/skypop.mjs and qa/ringcount.mjs in OWNER-2026-08-25.md.
//
//   node qa/spawnsky.mjs [port] [tag] [world ...]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.argv[2] || '4173';
const TAG = process.argv[3] || 'before';
const WORLDS = process.argv.slice(4).length ? process.argv.slice(4)
  : ['maple', 'pirate', 'gameday', 'lantern', 'powder'];
const OUT = 'qa/out/spawnsky';
mkdirSync(OUT, { recursive: true });

// The two worlds patch 2 claims. Everything else is reported, not judged.
const CLAIMED = ['lantern', 'powder'];
// A body that is on screen and unoccluded cannot read 0.0. The ceiling is the
// recorded disaster: an 18-degree body measured 58.3% of the frame
// (island.ts:807-814). 20% is a third of that and four times the largest
// reading the shipped pack has ever produced, so it can only trip on a gross
// placement error, not on taste.
const FLOOR = 0.0, CEIL = 20.0;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const rows = [];
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    // the comma-joined key, not JSON — unlocks.ts:39, and the retraction in
    // GOVERNOR.md that cost three screenshot runs
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
  } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
  }));
  await p.waitForSelector('#btnPlay', { state: 'visible', timeout: 400000 });
  await p.evaluate(() => document.getElementById('btnPlay').click());
  await p.waitForSelector(`#worldRow .wCard[data-world="${wid}"]`, { state: 'visible', timeout: 400000 });
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`).click(), wid);
  await p.waitForFunction(() => (window.__matchState?.().camDist ?? 0) > 0, null, { timeout: 400000 });

  if (!(await p.evaluate(() => typeof window.__pinIntro === 'function'))) {
    console.log(`FAIL — ${wid}: __pinIntro is absent. This probe measures the`
      + ' establishing shot and cannot measure a moving one. Land patch 1 first.');
    await b.close(); process.exit(1);
  }
  // the painted sky, or say plainly that we are reading the canvas fallback
  await p.waitForFunction(() => (window.__scene?.background?.image?.width ?? 0) > 2048,
    null, { timeout: 120000 })
    .catch(() => console.log(`  (${wid}: painted sky never arrived — reading the canvas fallback)`));
  await p.evaluate(() => window.__pinQuality(0));
  await p.evaluate(() => window.__pinIntro(1));

  // let the follow spring converge on the pinned pose before anything is read;
  // camFollow closes ~22% of the gap per frame at dt 0.05 (prototype3d.ts:9274)
  await p.waitForFunction(() => {
    const c = window.__cam.position, k = window.__spawnskyPrev || { x: 1e9, y: 0, z: 0 };
    const d = Math.hypot(c.x - k.x, c.y - k.y, c.z - k.z);
    window.__spawnskyPrev = { x: c.x, y: c.y, z: c.z };
    return d < 0.05;
  }, null, { timeout: 400000, polling: 'raf' });

  // THE PHOTOGRAPH THE CHILD ACTUALLY SEES — HUD, title card and all. Taken
  // first, because hiding the DOM is what the measurement needs and not what
  // the owner is judging. An opening body hidden behind the score panel is a
  // defect this frame catches and the clean frame cannot.
  await p.screenshot({ path: `${OUT}/${wid}_${TAG}_hud.png` });

  await p.evaluate(() => {
    const cv = document.querySelector('canvas');
    for (const el of Array.from(document.body.children)) {
      if (el !== cv && !el.contains(cv)) el.style.display = 'none';
    }
  });
  await p.screenshot({ path: `${OUT}/${wid}_${TAG}.png` });

  const r = await p.evaluate(async () => {
    const S = window.__scene, T = window.__THREE;
    const cv = window.__renderer.domElement;
    // through rAF, never off __renderBloom() — preserveDrawingBuffer is false
    // and a direct read returns the last COMPOSITED frame (GOVERNOR retraction 8)
    const frame = () => new Promise((res) => requestAnimationFrame(() =>
      requestAnimationFrame(() => requestAnimationFrame(res))));
    const shot = async () => {
      await frame();
      const c = document.createElement('canvas');
      c.width = cv.width; c.height = cv.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(cv, 0, 0);
      return g.getImageData(0, 0, c.width, c.height);
    };
    const d3 = (u, v, i) => Math.abs(u.data[i * 4] - v.data[i * 4])
      + Math.abs(u.data[i * 4 + 1] - v.data[i * 4 + 1])
      + Math.abs(u.data[i * 4 + 2] - v.data[i * 4 + 2]);

    // SKY MASK — key the background black/white/black and demand a pixel move
    // both times and come back. Lifted from qa/skypop.mjs:115-153 unchanged,
    // because it is the version that survived two retractions.
    const keptBg = S.background, keptI = S.backgroundIntensity, keptFog = S.fog;
    S.fog = null;
    S.background = new T.Color(0, 0, 0); S.backgroundIntensity = 1;
    const kA = await shot();
    S.background = new T.Color(1, 1, 1); S.backgroundIntensity = 1;
    const kB = await shot();
    S.background = new T.Color(0, 0, 0); S.backgroundIntensity = 1;
    const kC = await shot();
    S.background = keptBg; S.backgroundIntensity = keptI; S.fog = keptFog;
    const real = await shot();

    const n = kA.data.length / 4, W = kA.width;
    let m = 0, moved = 0, topY = 1e9, botY = -1;
    const lum = [];
    for (let i = 0; i < n; i++) {
      const ab = d3(kA, kB, i), bc = d3(kB, kC, i), ac = d3(kA, kC, i);
      moved = Math.max(moved, ab);
      if (ab > 200 && bc > 200 && ac < 100) {
        m++;
        const y = Math.floor(i / W);
        topY = Math.min(topY, y); botY = Math.max(botY, y);
        const R = real.data[i * 4] / 255, G = real.data[i * 4 + 1] / 255, B = real.data[i * 4 + 2] / 255;
        lum.push(0.2126 * R + 0.7152 * G + 0.0722 * B);
      }
    }
    lum.sort((a, x) => a - x);
    const q = (f) => lum[Math.min(lum.length - 1, Math.max(0, Math.round(f * (lum.length - 1))))] ?? 0;

    // PLANETS — their own A-B-A, because a sprite at 0.95 opacity barely moves
    // when the background changes and the sky mask excludes it by construction.
    const planets = [];
    S.traverse((o) => { if (o.isSprite && o.userData?.planet) planets.push(o); });
    let planetPct = 0, planetTopY = -1;
    if (planets.length) {
      const on1 = await shot();
      planets.forEach((o) => { o.visible = false; });
      const off = await shot();
      planets.forEach((o) => { o.visible = true; });
      const on2 = await shot();
      let m2 = 0; const n2 = off.data.length / 4;
      let ys = 1e9;
      for (let i = 0; i < n2; i++) {
        if (d3(on1, off, i) > 30 && d3(off, on2, i) > 30 && d3(on1, on2, i) < 20) {
          m2++; ys = Math.min(ys, Math.floor(i / W));
        }
      }
      planetPct = 100 * m2 / n2;
      planetTopY = m2 ? 100 * ys / off.height : -1;
    }
    return {
      camDist: window.__matchState().camDist,
      sky: 100 * m / n, maxMove: moved,
      skyTop: m ? 100 * topY / real.height : -1,
      skyBot: m ? 100 * botY / real.height : -1,
      p5: q(0.05), p95: q(0.95), dark: 100 * lum.filter((x) => x < 0.06).length / Math.max(1, lum.length),
      bodies: planets.length, planetPct, planetTopY,
    };
  });
  rows.push({ wid, ...r });
  await p.close();

  console.log(`  ${wid.padEnd(8)} camDist ${r.camDist.toFixed(0)}  sky ${r.sky.toFixed(1)}% `
    + `(rows ${r.skyTop.toFixed(0)}-${r.skyBot.toFixed(0)}% of the frame)  `
    + `range ${(r.p95 - r.p5).toFixed(3)}  dark ${r.dark.toFixed(0)}%  `
    + `${r.bodies} bodies, ${r.planetPct.toFixed(2)}% of the frame`
    + `${r.planetTopY >= 0 ? ` from row ${r.planetTopY.toFixed(0)}%` : ''}`);
}
await b.close();

// ── VERDICTS. Silence is a FAIL; every branch below prints one. ────────────
let bad = 0;
for (const r of rows) {
  if (r.maxMove < 50) {
    console.log(`FAIL — ${r.wid}: no pixel responded to the background changing. `
      + 'The census is measuring nothing; do not read any number above.');
    bad++; continue;
  }
  if (r.camDist < 240) {
    console.log(`FAIL — ${r.wid}: camDist ${r.camDist.toFixed(0)} at the pinned opening beat, `
      + 'expected ~300. __pinIntro is not holding the move (prototype3d.ts:9203).');
    bad++; continue;
  }
  if (r.wid === 'pirate' && r.planetPct <= FLOOR) {
    console.log('FAIL — pirate reads 0.00% planet at the opening beat. Its ringed giant '
      + 'is on screen there on ANY build, so this probe is broken, not the game.');
    bad++; continue;
  }
  if (!CLAIMED.includes(r.wid)) {
    console.log(`  note — ${r.wid}: reported, not judged (patch 2 makes no claim here).`);
    continue;
  }
  if (r.planetPct <= FLOOR) {
    console.log(`FAIL — ${r.wid}: 0.00% planet at the opening beat. This is the reading `
      + 'the patch exists to change.');
    bad++;
  } else if (r.planetPct > CEIL) {
    console.log(`FAIL — ${r.wid}: ${r.planetPct.toFixed(2)}% of the frame is planet at the `
      + `opening beat, over the ${CEIL}% ceiling. It is not a body in the sky, it IS the sky.`);
    bad++;
  } else {
    console.log(`PASS — ${r.wid}: ${r.planetPct.toFixed(2)}% of the opening frame is a body, `
      + `first appearing at row ${r.planetTopY.toFixed(0)}% — clear of #board (top 16%, left 38%).`);
  }
}
console.log(bad ? `\n${bad} world(s) failed.` : '\nAll claimed worlds pass.');
process.exit(bad ? 1 : 0);
```

Run it at three points on the curve for the record, not only the opening beat:
`__pinIntro(1)`, `(0.75)`, `(0.5)` — the last two by re-running with the pin
value edited, or by adding a fourth argv. The single-point version above is
what carries the claim.

---

## 4. SEEDED-DRAW ACCOUNTING, PER WORLD

**Zero. In every world, on every stream. This is the strongest part of the
proposal and it is checkable by eye.**

| world | `mrnd`/`mr`/`mpick`/`mchance` delta | `Math.random` delta |
|---|---|---|
| maple | **0** | **0** |
| pirate | **0** | **0** |
| gameday | **0** | **0** |
| lantern | **0** | **0** |
| powder | **0** | **0** |

Why, mechanically:

- The `SKIES` table is authored constants. `island.ts:793-794` states it:
  *"Authored, not seeded — `rand()` here is Math.random, so a seeded planet
  would move every load. Every number below is a decision."* The two new rows
  are decisions in the same table.
- `paint()` (`island.ts:862-916`) contains **no** random call of any kind:
  gradients, `arc`, `ellipse`, `fillRect`, all from `bd`'s own fields. I read
  it line by line for this.
- The placement loop (`island.ts:917-934`) reads only `bd`. No draw.
- Patch 1 adds no draw. Patch 3 is a probe.

So the Maple mulberry32 stream (`mainstreet.ts`, and the maple path at
`island.ts:461`) is untouched, and Powder/alpine and Lantern/nightmarket —
which run on `Math.random` — see the same sequence they see today. Nothing
shifts.

Worth stating once for the record, because it will come up: `Math.random` is
unseeded, so those two worlds are already non-identical load to load. That is
not a licence to add draws there; it is the reason this patch adds none, so
that neither claim has to be argued.

---

## 5. TRIANGLE COST

**+2 triangles, in two of five worlds, and only while on screen.**

- A `THREE.Sprite` shares one internal unit-quad geometry across every sprite
  in the scene. One new sprite = **2 triangles**, no new BufferGeometry, no new
  attribute buffers.
- Draw calls: **+1 while the body is inside the frustum, 0 otherwise.**
  `frustumCulled` is left at its default `true` (the existing planets do the
  same; only `starField` sets it false, at `:766`, and for a stated reason).
  From §3's table that is the establishing shot plus 7–19% of positions below
  radius 4 — and zero for the rest of the match.
- Texture: one 512×512 sRGB canvas per world, ~1.0 MB (~1.4 MB with mips) —
  the same cost as each of the two bodies each world already builds. Two
  become three in Lantern and Powder; the other three worlds are unchanged.
- Boot: one extra `paint()` call, a handful of canvas gradients on a 512²
  surface, on the same path that already runs it twice.
- `qa/roundlod.mjs`'s sphere baseline is untouched — a Sprite is not a sphere,
  and no sphere is added, removed or re-tessellated.

---

## 6. THE PROBE, AND WHAT IT MUST REPRODUCE

`qa/spawnsky.mjs`, §3 patch 3. Its primary claim is stated there and it fails
before the fix.

It is also the test of **me**. Everything in §1 and §2 is arithmetic on a flat
ground plane, and the probe renders real terrain, real props and real trees.
On the **unpatched** build it must roughly reproduce these five sky shares at
the pinned opening beat, or this proposal is void and should be killed rather
than corrected:

| world | predicted sky at the opening beat | predicted sky rows |
|---|---|---|
| maple | 0.0% | none |
| gameday | 10.2% | top 14% of the frame |
| lantern | 20.8% | top 28% |
| powder | 26.8% | top 34% |
| pirate | 29.3% | to the bottom of the frame |

The prediction is an **upper bound**: standing geometry at each coastline —
tree lines, chalets, the bathhouse ridge — eats into the strip from below and
my model cannot see it. So readings a few points under these are the model
working. A reading of 20%+ in Maple, or 0% in Powder, means the model is wrong
about which frame the game shows and everything above it collapses.

Two more numbers it should confirm, both cheap:

- `bodies` = 2 in every world before, 3 in Lantern and Powder after.
- `planetPct` at the opening beat: 0.00% today in maple, gameday, lantern,
  powder; **non-zero in pirate** (the built-in falsifier).

I am deliberately **not** predicting what `planetPct` will read after the
patch. Solid-angle arithmetic says a 5.2° disc is about 4.5% of the frame's
area, and the shipped pack measures 3.6% for TWO bodies at r=10
(OWNER-2026-08-25.md), so the A-B-A pixel test evidently undercounts a painted
dark limb against a dark sky by a factor I have not measured. Writing a
predicted percentage into a header I had not run is retraction 10, and I am
not repeating it. The band is `> 0` and `< 20%`, with the reasons in the
file, and it gets tightened from the first green reading.

---

## 7. WHAT I AM NOT PROPOSING, PRICED

Three things a later round will want, each with the arithmetic that says why
they are not in this one.

**(a) Lifting the establishing shot's aim.** `camera.lookAt(lookX, R * 0.5,
lookZ)` at `:9276`, with an intro-only term `+ LIFT * k2 * k2` that is exactly
zero when the controls go live. It works, and it is the only lever that moves
Game Day. Measured at the opening beat, aim raised 46 units (pitch 46.4 → 39.5):

| world | sky, lift 0 → lift 46 |
|---|---|
| gameday | 10.1% → **31.5%** |
| lantern | 20.8% → **41.8%** |
| powder | 26.7% → **47.6%** |
| pirate | 29.3% → 28.8% |
| maple | 0.0% → 1.0% |

Not proposed, for three reasons and the third is the one that decides it.
(i) It is a camera change, and a round-2b skeptic has already killed two
patches this round whose authors were wrong about this camera. (ii) The
deepest ground hit rises from 433 to 542 units, which puts more world in the
frustum during the most expensive frames of the match — the intro already
renders 4,694 draw calls and 1.40M triangles on Game Day (`:9178-9184`), and
this makes that window both longer and wider. (iii) **It costs Pirate its
giant**: at lift 46 the one body that is on screen at any opening beat today
drops off the bottom of the frame. Damaging the only world whose spawn sky
works, to help the two the sky-body patch already helps, is a bad trade. It
belongs in a round of its own, with a perf reading attached.

**(b) Maple's establishing subject.** Maple is the only world with
`hero: null` (`:1273`) — there is no pan, only a dive onto the spawn — and it
is the only world with 0.0% sky at the opening. Both facts have the same
cause. Setting `hero: [(4000 - 6000) * 0.05, (4000 - 6000) * 0.05]` (the
fairgrounds, `MAPLE_PLAN[1][1]`) puts the subject where the top ray clears the
north-west coast, and Maple gets both the pan it never had and a sky. It is a
two-number patch and I am not proposing it, because it changes what a child
sees first in world 1 and the opening of world 1 is on the HANDS OFF list
("Spawn and the opening hand are hand-authored"). That is an owner call, not a
crew's.

**(c) More stars.** The field is 5000 points in one draw call and the spawn
strip holds 5–19 of them. Raising N would thicken the LATE sky too, where
`island.ts:678-681` argues 5000 is already right, and it would fix a
composition problem by adding count — the definition of busier. If the
photographs come back and the spawn sky reads empty *with* a body in it, the
answer is a wider `ph` weighting toward the visible band, not a bigger N, and
that is a separate proposal with its own A/B.

---

## 8. THE PHOTOGRAPH PLAN — what the owner is shown to say yes or no

**`qa/shippedlook.mjs` cannot carry this claim, and that is worth saying out
loud.** It calls `__setVoidR(4)` at `:102` and photographs settled play, where
the sky is 0.0% of the frame in all five worlds — look at
`qa/out/shippedlook/maple_look.png`: it is ground, edge to edge. So shippedlook
is the **control**, not the evidence.

**A. The control — `qa/shippedlook.mjs`, five worlds, tag `look`.** Reshoot the
canonical pack after patch 2 and put it beside today's:

    qa/out/shippedlook/lantern_look.png     <- the one that could regress
    qa/out/shippedlook/powder_look.png      <- the one that could regress
    qa/out/shippedlook/maple_look.png       <- must be identical, untouched world
    qa/out/shippedlook/pirate_look.png      <- must be identical, untouched world
    qa/out/shippedlook/gameday_look.png     <- must be identical, untouched world

The claim on these five is *nothing moved*. Three worlds are not edited at all,
and the two that are should be indistinguishable, because at r=4 no sky is on
screen to hold a new body. If `lantern_look` or `powder_look` changes, the body
is showing up where it was never meant to and patch 2 is wrong.

**B. The evidence — `qa/spawnsky.mjs`, ten frames, the ones the owner judges.**
Four he compares, three for honesty, and each of the four has an HUD twin:

    qa/out/spawnsky/lantern_before.png      \  the pair
    qa/out/spawnsky/lantern_after.png       /
    qa/out/spawnsky/powder_before.png       \  the pair
    qa/out/spawnsky/powder_after.png        /
    qa/out/spawnsky/lantern_after_hud.png   <- the real screen: HUD + title card
    qa/out/spawnsky/powder_after_hud.png    <- the real screen: HUD + title card
    qa/out/spawnsky/maple_before.png        \
    qa/out/spawnsky/gameday_before.png       > the three that do not change
    qa/out/spawnsky/pirate_before.png       /

The `_hud` frames are not decoration. The proposal placed both bodies at x≈68%
specifically to clear `#board` (top-left, 38vw × 152px) and to sit under the
`#timer` glyphs, and that reasoning is arithmetic off a stylesheet. A clean
canvas frame cannot catch a body sitting behind the score panel; the HUD frame
can, and this repo's retraction list is mostly cases of verifying the wrong
frame.

**What the owner is actually asked.** Two pairs, side by side, at the moment a
child sees before they touch anything: *the sky over the night market, and the
sky over the valley — better, or not?* Plus the three unchanged worlds, with
one line each saying why Maple gets nothing, Game Day gets nothing, and Pirate
already had it. He said "sure if you can make it beautiful"; the honest
question back is about two worlds, not five, and pretending otherwise would be
the thing that gets this killed later.

---

## 9. RISKS I SEE MYSELF

1. **My ground is flat and the game's is not.** This is the biggest one. Every
   number in §1–§3 comes from intersecting rays with `y = 0` inside a coastline
   polygon. Powder is a valley with walls; Lantern has a waisted plateau and a
   bathhouse on a terrace; every rim has trees. Real geometry can only *raise*
   the horizon, which eats the body from below. Lantern is already at 98%
   unoccluded, so it has ~2% of margin before its lower limb starts
   disappearing. **If the probe shows either body more than about a third
   eaten, raise `el` by 2–3° and re-shoot** — the top margin is 1.6–2.3°, so
   there is exactly that much room and no more.
2. **The disc could clip the top of the frame.** The body's screen position
   depends only on the camera's *orientation*, which is fixed at 46.4°/225°
   during the whole intro, so it does not drift with camDist — that part is
   safe. But `camera.fov = 32 + fovKick` (`:9281`), and if anything ever fires
   a lens punch during the intro, the frame widens and the top edge moves. I
   checked: `fovKick` is set only by bites and the void cannot eat during the
   intro. It is still a coupling worth knowing about.
3. **A body that is only on screen for one second.** Lantern's is under 20%
   visible by 0.78s of a 3.6s intro; Powder's by 0.99s of 3.5s. Someone will
   reasonably ask whether a sprite that lives all match to be seen for a second
   is worth a draw call. My answer is that the establishing shot is the frame
   this decision is about, and a body that stayed longer would have to sit
   lower, where the island is. But it is a real objection and I am not hiding
   it.
4. **Two worlds, not five.** The owner approved "the spawn sky"; this delivers
   it in Lantern and Powder. If the answer he wanted was all five, the only
   route is §7(a) and §7(b), both of which touch the camera and the opening of
   world 1.
5. **`__pinIntro` freezes more than the camera.** With the pin held, `introT`
   never reaches 0, so shadows stay off and the controls never go live. That is
   the true state of the establishing shot, which is why I want it — but a
   later probe that pins the intro and then expects to *play* will hang, and
   the hook's comment says so.
6. **The A-B-A planet census may undercount a warm body on a dark sky.** It
   requires each pixel to move by >30 in sum-of-channels twice. A painted dark
   limb against a near-black sky may not clear that, which is my best
   explanation for the shipped 3.6%-for-two reading. It biases the number DOWN,
   so it cannot manufacture a false pass — but it means the number is a floor,
   not a coverage figure, and the header should not call it "coverage" without
   that caveat.
7. **I have not rendered any of this.** No probe was run for this proposal —
   the brief is read-only outside this file, and every number here is geometry
   over constants I read off disk today. That is exactly why patch 3 lands
   first and why §6 lists the five readings that would refute me.
