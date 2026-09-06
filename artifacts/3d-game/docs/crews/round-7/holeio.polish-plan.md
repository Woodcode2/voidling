# The polish plan — THE CUTE WORLD ENDER against HOLE.IO (round 7, draft 1)

*Governor's draft for the owner. Nothing here is built. Every bar is a number a probe
can fail. The owner approves streams and order before a crew is briefed.*

**Sources.** `holeio.recon.md` (Opus's ten-lens report, §6 twenty mechanisms, §11 motion
from the owner's recording) and a code map of our build taken today (file:line cited
below, branch head at time of writing). Where a number of ours is *derived from code*
rather than measured from a rendered frame, it says so; the first task of every stream
is to measure it from a frame with the same method used on theirs.

**Standing constraints.** The void stays a creature and gets refined, not replaced. No
ads, no ad-skip currency, 4+ stays 4+. Nothing lands without a skeptic verdict. The
gate (`qa/gate.mjs --profile=push`) stays green at every commit.

---

## 0 · Where we stand, in ten lines

| | HOLE.IO (measured) | Ours (today) | Gap |
|---|---|---|---|
| Match start | On the first touch; 0.7 s free idle at a high camera | On load or on a tap gate; clock runs during the intro (the t = 5 s frame already reads 2:55) | **Their opening is the player's; ours is a cutscene** |
| Intro camera | 1.17 s ease-in-out, ×4.75 ground scale, first bite at 45% of the way down | 2.2–3.6 s quadratic ease-in, controls dead throughout (`prototype3d.ts:9841`, `:9034`) | **2–3× longer, and the player cannot move** |
| Player on screen | 22.6% → 48.3% of screen width, Size 1 → 14 | **18.5%** at spawn (t = 5 s), **31.9%** at 17 m (t = 163 s), measured on `recon/self/maple-*.png`; ≈40% at the 18 m cap by formula (`:9840`) | 18% smaller at spawn, a third smaller late |
| Player's rim | Lit torus, 13.4% of diameter, 3 tones, 9.1:1 vs interior | No rim: a glossy sphere, one hue, lit/shade value 0.85/0.42 = 2.0:1 across the body (`recon/self/maple-spawn-t5.png`); the shader lip is ~2.5 px (`void3d.ts:246`) | **A ball where they have a lit ring; the body's two tones are right** |
| The stage | Ground chroma < 0.12 over 56% of the playfield; props 57–100% sat | Maple spawn frame: **26% of the playfield below 0.12**; saturated green grass covers 30% at chroma 0.39, the pale path 31% (`recon/self/maple-spawn-t5.png`, `self.py`) | **Half the neutral stage they have; the grass is a prop colour** |
| Materials | Two tones per material, 2:1; shade hue-shifted | Single-tone vertex colour under a real rig with a cool fill (`island.ts:3973`, `prototype3d.ts:793`) | Half right: the rig shifts hue; the material has one tone |
| Display type | Gradient fill + thick stroke (67% of fill area) + shadow | Fredoka 700, 3 px stroke, no gradient (`index.html:128`) | One layer short |
| Menu | Violet ground `#4c3cbe` (value 0.75, chroma 0.51) over 45% of the frame; 3D diorama of the level at 49% of height, slow orbit, static UI | Dark violet ground `#1b0f38` (value 0.22, chroma 0.16; frame value median 0.36); painted key art over 82% of height; no 3D, no motion (`qa-out/menu.png`, `index.html:850`) | **A poster where they have a world, and half as bright** |
| Ladder | Five colour-coded pips, current one 29% wider, one tap to play | Six poster cards on a separate screen; goals hidden until the end card (`index.html:1933`, `:474`) | Progress is a grid, not a picture |
| Reward beat | "Size N" pop at the avatar, floater size = bite value, end card over the dimmed world, next reward as a locked jewel | Evolve card on the HUD, one floater size + big, end card over the dimmed world ✓, NEW WORLD card ✓ | Two of four |

What is **not** in the gap and stays ours: named rivals with hunt behaviour, the newsroom,
authored beats on the clock, a crowd with jobs, six worlds with their own fiction, a
creature you can dress, a real light rig, the machine gate, and no ads (§7 of the recon).

---

## 1 · Streams

Six streams, each small enough for one crew and one skeptic. Cost is a rough size
(S = a day, M = two or three, L = a week) for a crew of two plus a skeptic.

### A · The opening is the player's (M)

**Mechanism.** The match does not start until the player touches. Free idle at the high
camera; the clock starts on the touch; the descent is 1.17 s ease-in-out and *on the
clock*; the first bite lands during the descent; the goal scroll is timer-driven and
never waits.

**Ours today.** `launchWorld` starts the clock before the intro (`prototype3d.ts:5793`,
`:6076`); the intro is 2.2–3.6 s per world with a quadratic ease-in and dead controls
(`:9034`, `:9855`); `#titlecard` fades over `introLen + 0.45 s` (`:5908`); a `TAP TO PLAY`
gate exists only on the reload path (`:6398`).

**Bars.**
1. High-camera idle after load, clock stopped, until the first touch. Idle ≥ 0.5 s is
   free; there is no upper limit.
2. Touch-down → hole moves within 8 frames at 60 fps (theirs: 7).
3. Descent 1.10–1.30 s, ease-in-out on camera height (50% at t = 0.40–0.50), ground
   scale ×4–5, controls live from the first frame of the descent.
4. First edible thing within reach at 40–50% of the descent; first "+N" before the camera
   settles.
5. Goal card: unroll ≤ 150 ms, open 350–450 ms, roll-up ≤ 120 ms, starts ~0.5 s after
   the first gameplay frame, independent of input.
6. Every world keeps its hero-landmark reveal, but inside the 1.2 s, not instead of it.
   (If a world needs longer, the owner decides per world; the default is 1.2 s.)
7. Rivals: all voids start within one screen of the player at the settled camera.
   *(Their co-location is the owner's belief; §11.9 will say what the recording shows.)*

**Probe.** `qa/opening.mjs`: records frames from load to settle, reports idle length,
touch→move latency, descent length and easing fit, time of first floater, goal card
timings. Fails on any bar.

### B · The menu is a world (L)

**Mechanism.** Same violet as ours. The hero is a live 3D diorama of the selected level
at ~49% of frame height, on a slow orbit (~0.3 px/frame at full-res); the UI never moves;
PLAY and the HUD sit at ≥ 4.2:1 / 6.5:1 against the ground; the coin pill pops with
overshoot on every tab change; each tab is a colour world (blue store, violet play,
orange skins); tab changes are hard cuts.

**Ours today (measured on `qa-out/menu.png`, 860×1864).** Opaque `#menu`: dark violet
ground `#1b0f38`–`#191539` (value 0.22, chroma 0.16) against their `#4c3cbe` (value 0.75,
chroma 0.51); the painted key art (island, falling houses, the void's face) spans rows
5.7%–88% of height; 15.8% of pixels have chroma > 0.35; `#menuOrb` hidden
(`index.html:891`); world select is a separate poster grid (`:1933`); PLAY → picker →
PLAY is two taps. The art is good; it is a poster, and it is dark.

**Bars.**
0. The menu ground is lifted toward theirs: value 0.55–0.75, chroma 0.40–0.55, still
   violet. Measured at the four corners of `qa/menushot.mjs`'s frame.
1. The menu's hero is the selected world's island, rendered live (the same island build,
   low-cost variant), occupying 45–52% of frame height, on a camera orbit of 0.25–0.4
   px/frame at 1320-wide; the crowd idles; the void sits on it in its current skin and
   hat.
2. Menu UI: zero motion at rest except the coin pill's entrance pop (250 ms, 10–20%
   overshoot) and the PLAY sheen (≤ 400 ms).
3. The ladder row (stream C) sits under the hero; PLAY under it. One tap to play.
4. Contrast: PLAY ≥ 4.2:1 against the ground behind it, HUD bar ≥ 6.5:1, measured by
   `qa/pickerfit.mjs`'s method.
5. Menu frame time ≤ 16.7 ms on the reference device; the diorama costs nothing after
   the first paint (no shadows, no bloom, no crowd AI).
6. Tabs: SHOP blue, PLAY violet, VOIDS/HATS orange, each ground within its own hue
   family; the tab switch is a hard cut with content one frame late, no cross-fade.
7. Key art is not thrown away: it becomes the splash and the store listing.

**Probe.** `qa/menushot.mjs` extended: hero share, orbit rate over 60 frames, UI-region
motion (must be 0 after settle), contrast pairs, frame time.

### C · The ladder: six worlds × N goals (L)

**Mechanism.** One map, many runs. Objectives vary per level on the same world: a points
bar, a colour-set clear counting down per colour, a full clear. Progress is five
colour-coded pips: done grey, 100%-cleared magenta, current green and 29% wider, locked
blue with a padlock. Goals are shown on the match's goal card before play and counted
on the HUD during play.

**Ours today.** Six worlds unlock in `WORLD_ORDER` (`src/game/unlocks.ts`); the only
in-match goal is "eat everything"; a day-seeded quest board exists (`QUEST_POOL`,
`prototype3d.ts:3648`) but is hidden in play (`index.html:474`) and shown only on the end
card; solo mode has `% DEVOURED`.

**Owner's decision needed.** ×3 or ×5 per world. The three that exist as mechanics
already: **(1) EAT** — reach N points on the bar; **(2) SET** — eat N of each of three
kinds, counting down per kind (our `cars`/`houses`/`big`/`gold` pools are the kinds);
**(3) CLEAR** — 100% devoured (solo's `voidBestPct` is the counter). Two more that need
new logic: **(4) RIVALS** — finish first against the named rivals; **(5) RUSH** — N points
in a shortened clock. Recommend ×3 now, ×5 after launch, so 18 levels ship first.

**Bars.**
1. Level = (world, goal). 18 levels at ×3; the pip row shows five at a time with the
   current one centred; unlock is strictly sequential; state persists (new key
   `voidLevels`, versioned).
2. Pip states with four distinct colours at ≥ 3:1 from each other and from the ground;
   the current pip 25–35% wider than the others.
3. Each level's goal is on the goal card (stream A bar 5) as one line of ≤ 6 words, and
   on the HUD as a counter for the entire match; the counter's leading edge is hot (bar
   brightness at the growing end ≥ 1.3× the rest).
4. A finished level lights its pip on the end card before anything else moves (≤ 400 ms
   after the card is up); 100% clear turns it magenta with a distinct sound.
5. Difficulty: goal N per world tuned so the median tester clears level 1 of a world
   in one run and level 3 in ≤ 3 runs (measured in the playtest, not asserted).
6. The daily quest board is retired into this system, or kept only as the end card's
   bonus row. Owner's call; recommend retire.

**Probe.** `qa/ladder.mjs`: state machine test over all 18 levels (unlock order, persist,
100%-clear flag), pip contrast, HUD counter presence at t = 5/88/163 s.

### D · Colour and pop (M)

**Mechanism.** The stage is neutral; the actors are saturated. Two tones per material at
~2:1; shade hue-shifted; the player object has a lit rim; display type is three layers.
No texture, no fog *(theirs; we keep ours where measured to help)*.

**Ours today (measured on `recon/self/maple-*.png`, reference viewport, DPR 2–3).**
Spawn playfield: 26.2% of pixels below chroma 0.12 (theirs 56%), 37.7% above 0.35;
saturated grass 30% of the field at chroma 0.39, pale path 31%. Late (t = 163 s): 9%
below 0.12. Void: 18.5% of width at spawn, 31.9% at 17 m; no rim, body value 2.0:1
lit/shade. Props single-tone under the rig (`island.ts:3973`); type 3 px stroke, no
gradient (`index.html:128`); fog per world (`island.ts:656`). One more observation: in
the mid-match frame (t = 88 s, autopilot) the void is **fully hidden behind a
landmark** with only the joystick ring visible (`maple-mid-t88.png`); their hole is on
the ground and can never be occluded. Bar 7 below covers it.

**Bars.**
1. **The stage.** In a rendered spawn frame, ≥ 50% of the playfield has chroma < 0.15,
   and the props on it have median chroma ≥ 0.45 (theirs 0.12 / 57–100% sat). Achieved
   by desaturating ground districts 50–70% toward their own hue's grey, *not* by
   greying them: maple park stays green, at chroma ~0.15. Prop palettes untouched
   unless a prop reads below 0.45.
2. **Two tones.** Every merged prop material gets a shade tone at 1.9–2.6:1 luminance
   below its lit tone, hue-shifted 8–15° toward the fill light's hue, selected per face
   by the face normal against the key (a vertex-colour pass in the prop shader). Measured
   on a bench, a tree and a house.
3. **The void's rim.** A lit rim 10–15% of the void's on-screen diameter at every size
   (scale with `uPxR`, not fixed px), three tones in the skin's family, ≥ 8:1 against the
   body's interior, and the face still reads. The rim is the void's, in its skin colour,
   not a hole's.
4. **Screen share.** The void spans 22–26% of screen width at spawn and 45–50% at the
   cap (theirs 22.6 → 48.3), by re-fitting `targetDist` (`prototype3d.ts:9840`); the
   camera does the work, the world's scale does not change.
5. **Type.** `#timer`, `#evolve`, the goal card and the end card title carry three
   layers: a two-stop gradient fill, a stroke whose area is 60–75% of the fill's at
   ≥ 3:1 from the fill, and a shadow. Measured by the cluster method in `measure.md`.
6. **Fog** stays, but its near plane is pushed so that nothing within the settled
   camera's playfield is fogged more than 5%.
7. **Never hidden.** When a prop occludes the void from the camera, the prop fades to
   ≤ 40% opacity within 150 ms (or the void's silhouette draws through it); measured
   by an occlusion probe at 5 s / 88 s / 163 s on every world.

**Probe.** `qa/pop.mjs`: chroma histogram of the playfield vs props (the recon's
`chroma.py` method), two-tone ratio on three named props, rim ratio and contrast at Size
1 and cap, screen share at Size 1 and cap, type layer areas.

### E · The accomplishment beat (S–M, bars firm after §11.8)

**Mechanism.** "Size N" pops at the avatar with a ground ring, arrows rising inside the
hole and the bar resetting; floaters sized by bite value; the bar's leading edge is hot;
the end card overlays the dimmed world; count-up; the next reward shown as a locked
jewel. *(Swallow duration, floater lifetime, the size-up curve and the count-up length
are being measured in §11.8–11.10 and will replace the placeholders marked †.)*

**Ours today.** Evolve card on the HUD with `ev 1.8 s`, `camPunch` is a no-op
(`prototype3d.ts:683`), one ring at `R*5` for 0.8 s (`:9995`); floaters 17 px / 26 px big,
0.9 s (`bubbles.ts:162`); end card over the dimmed world with a 900 ms coin count-up ✓;
NEW WORLD card ✓; growth bar on the HUD (`index.html:168`).

**Bars.**
1. Size-up: the "SIZE N" read pops **at the void** (projected, not HUD), gold, with one
   ground ring and the bar reset; total beat ≤ †(their length); the camera punch is
   real (the no-op is replaced) and ≤ 1.1× of `camDist` for ≤ 300 ms.
2. Floaters: three sizes keyed to bite value (small / medium / big at 1 : 1.5 : 2.2 of
   height), lifetime †(theirs), rising †(their distance), never more than 6 alive.
3. Growth bar: leading-edge brightness ≥ 1.3× the fill.
4. End card: the *level pip* lights first (stream C), then coins count up (keep 900 ms),
   then the next reward, drawn as its own illustration behind a padlock (island art per
   world exists in the poster set), then PLAY AGAIN.
5. Whether the size read moves from the HUD to under the void is the **owner's call**;
   it was moved to the HUD once for legibility. Recommend: the momentary pop at the void
   plus the persistent bar on the HUD, not one or the other.

**Probe.** `qa/_juiceshots.mjs` extended with frame timing of the size-up beat and floater
lifetimes; the end-card order asserted by DOM timestamps.

### F · Loading and the tap gate (S)

**Mechanism.** The loading screen is a still (283 ms) with an illustration and
"Loading…"; no bar, no ring.

**Ours today.** World change reloads the page, `GETTING READY…` → `TAP TO PLAY`
(`prototype3d.ts:6398`); the same-world path skips it.

**Bars.** One loading illustration per world (the poster art, cropped), text only, no
spinner; median load-to-idle ≤ 800 ms on the reference device; both paths go through
stream A's idle, so the tap gate and the idle become one thing.

### G · Premium (parked)

Their $12.99 "no ads" premium does not apply: we have no ads. If a premium exists, it is
the legendary characters and hats we already sell behind the parental gate. Nothing to
build now; revisit after C ships.

---

## 2 · Order

1. **Measure ourselves first (S).** Done for the menu and Maple (`recon/self/`, method
   in `self.py`); the other five worlds and the evolve/end-card frames remain, and a
   skeptic re-measures the Maple numbers before any crew is briefed.
2. **A · the opening** — the largest feel gap for the smallest change. Ships alone.
3. **D · colour and pop** — bars 1, 3, 4 first (stage, rim, screen share), then 2, 5, 6.
4. **C · the ladder (×3)** with **E · the beat** — they share the goal card and the end
   card, so one crew.
5. **B · the menu** — last, because it renders the island from C's level state and D's
   materials; building it first would build it twice.
6. **F** rides with A.

Each stream: brief → build → probe → skeptic verdict → gate → commit. Corrections are
recorded in the stream's brief, never hidden.

## 3 · What we do not do

- Replace the void with a hole, or make the void read as an absence.
- Add ads, an ad-skip currency, or a "no ads" purchase.
- Add textures, bloom passes or post effects to chase their look; their look is value
  steps and colour, and so is ours.
- Copy their strings, their island illustration, their sounds or their skins.
- Ship any stream without its probe passing on the reference viewport (430×932, DPR 2).

## 4 · Decisions the owner owns

1. ×3 or ×5 goals per world at launch (recommend ×3, 18 levels).
2. Size read under the void, on the HUD, or both (recommend both, as in E bar 5).
3. Retire the daily quest board into the ladder, or keep it as the end card's bonus row
   (recommend retire).
4. Per-world intro length: 1.2 s default, or a named exception (recommend no exceptions).
5. Whether stream B (the live menu) is in the launch scope or the first update.

*Draft 1, written before M2–M4 and the skeptic returned. Placeholders marked † are
filled and the file re-issued as draft 2 when §11.8–11.11 land.*
