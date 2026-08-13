# VOIDLING — build brief

You are taking over a 3D mobile game that is close to good and not yet great.
Everything below is measured, not assumed. Where I was wrong earlier in the
project, the correction is included, because the wrong version is persuasive and
you will re-derive it otherwise.

---

## THE GAME

**VOIDLING** — a hole.io-style eater for children roughly 6–11. The concept is
the asset: **a cute void that eats worlds.** A purple orb with a face rolls
around a toy town swallowing props, growing through six forms, racing a family
of rival voids over a three-minute match. Four worlds: Maple Falls (autumn
town), Pirate Bay, Game Day (stadium), Lantern Night (night market).

Target: top-10 App Store quality. The owner compares it against shipped premium
mobile titles and is right to.

- Code: `artifacts/3d-game/`, TypeScript + Vite + three.js 0.185.1.
- `src/prototype3d.ts` — scene, renderer, quality ladder, match loop (~7k lines)
- `src/proto3d/island.ts` — the prop kit and ground (~6k)
- `src/proto3d/life.ts` — the crowd and vehicles (~5k)
- `src/proto3d/void3d.ts` — the hero and his face (~2k)
- `src/proto3d/rivals.ts` — the difficulty controller
- World art: `mainstreet` / `tailgate` / `luxe` / `nightmarket` / `bay` /
  `gameday` / `lantern`
- Probes: `qa/*.mjs`, all Playwright + Chromium

---

## RULES THAT DO NOT BEND

1. **Measure, then change.** This codebase has produced a dozen confident wrong
   conclusions, every one caught by an instrument and none by reasoning. If a
   change cannot be measured, build the probe first. Probes live in `qa/`.
2. **A single run proves nothing.** Means and spreads, or it did not happen.
3. **Run `qa/smoke.mjs` before every push to main. Push to main is a deploy.**
   It listens on **4177**, not 4173. `node qa/smoke.mjs | tail -2` in a `&&`
   chain will print a CONNECTION REFUSED stack and still let the push through,
   because `tail` exits 0. Read the output for the word PASS.
4. **Never bypass the CDN egress block.** Asset requests 403 in the sandbox.
   That is expected and correct. Do not work around it, and never disable TLS
   verification or unset `HTTPS_PROXY`.
5. **Asset licence: CC0 / Public Domain / Pixabay / Kenney only.** Music and SFX
   are the owner's to supply; do not invent sources.
6. **Ship via `git push` only.** Never deploy manually.
7. **Do not open a pull request unless explicitly asked.** Push to `main`.
8. **Keep model identifiers out of anything pushed** — commits, code comments,
   PR bodies. Chat only.
9. Working directory resets to the repo root between shell calls. `cd
   artifacts/3d-game` every time.

---

## THE INSTRUMENTS, AND THE ONE THAT MATTERS MOST

| probe | answers |
|---|---|
| `qa/smoke.mjs` | boots, loads, grows, eats, makes sound |
| `qa/ab.mjs` | N matches, mean + sd — the only trustworthy difficulty read |
| `qa/shippedlook.mjs` | **what the CANVAS shows** |
| `qa/glosscov.mjs` / `glossgap.mjs` | specular coverage, and where a world's area is |
| `qa/shading.mjs` | flat vs smooth split per world |
| `qa/grounding.mjs` | is the hero standing on the floor |
| `qa/facewrap.mjs` | the face's wrap onto the sphere |
| `qa/groundsurf.mjs` | the ground's road/grass material mask |

**Read this or you will repeat the most expensive mistake in the project.**
Every colour probe except `shippedlook` measures by calling `renderer.render()`
into its own `WebGLRenderTarget` and reading it back. That is the *direct* path.
For weeks those probes reported healthy saturation while the owner reported a
purple wash, and both were right about different frames: `bloomOn` initialised
to `true`, `applyQuality()` is only called when the adapter *changes* rung, so
every device that held 60 fps shipped the EffectComposer path — which three
renders with `NoToneMapping`, skipping the entire graded tone map, into a target
with no MSAA. **The better the phone, the worse the game looked.** Fixed now.

**No probe that renders its own frame can catch a whole-pipeline swap.** When a
claim is about what *ships* rather than about a shader, screenshot the canvas.

Newer instruments: `qa/ladder.mjs` (the quality adapter, hand-cranked at exact
virtual frame rates with rendering stubbed), `qa/shading.mjs` (flat/smooth
split per world). Two probe traps found since: a watch window shorter than
sandbox game-time reports a working feature as broken (game time runs on frame
count here — ten game-seconds is ~100 wall-seconds), and any concurrent build
or second Chromium instance eats a probe's budget. One more code trap with
teeth: the boot now yields at seams, so anything reachable from window during
boot must not touch consts declared later — the debug API stages on a
buffering proxy and attaches atomically at end of module for exactly this
reason. Do not add window-reachable hooks that bypass it.

---

## WHAT I THINK THIS NEEDS, RANKED

### STATUS 2026-08-13: the first four items below are DONE and verified.
Each keeps a one-paragraph record with its commit; item 5 is the open work.

1. ~~Quality ladder one-way door~~ — FIXED (02386f2). The latch now lives in
   applyQuality (wantShadows = q.shadows && !qShadowLatch), the adapter is
   gated on `started`, and qa/ladder.mjs proves menu-gate / recovery / demote
   against the shipped adapter with a negative control.
2. ~~The people are Lego~~ — FIXED in three layers, each found by photograph:
   the crowd's hair crown 12x4 -> 16x8 + loaf feet + 9x6 hands (24a678f); the
   vehicles' rounded boxes were creased because computeVertexNormals ran on
   per-face duplicated corners — welded (4e8e648); the diner's two welded-in
   people were flat-shaded by their own building's merge — split (ab6f0cb).
   The last one is CLOSED: the "solo campus lawn figure" was never a crowd
   person — it was GAME DAY's quad statue (tailgate.ts makeStatue), whose
   bronze was five raw boxes, planted eight times. Every crowd builder
   checked out smooth because the figure wasn't crowd. Rebuilt in capsules
   with its own smooth merge (masonry stays flat), bronze registered at
   0.55 gloss; controlled crop in qa/out/statue_rounded.png.
3. ~~First thirty seconds~~ — the boot breathes: checkShaderErrors off
   (?shaderlog restores; no measured sandbox win, honestly recorded), module
   seams + createIsland/populate sliced at district boundaries. Ten stage
   labels paint on a cold boot where zero could before (b4de2ff, b52b17b).
   The SPLASH is already good — photographed 2026-08-12; do not redesign it.
4. ~~Material pass~~ — Pirate 28->87% glossy, Lantern 34->74%, strong
   fractions untouched (e0a3fd8). PAPER stays matte, lit-lantern hexes are
   unlit-material no-ops, AO-darkened shades inherit their source's gloss.
5. FUN, still open. Shipped so far: the final-ten countdown ritual (4e8e648)
   and far-rival speech routed to the ticker under the speaker's name
   (09d3fc0) — fifteen speech triggers used to play to an empty camera.
   Remaining, unbuilt: world BEATS that change the world rather than the
   banner (does TREASURE FEAST look like anything?), the fun audit's five
   unbuilt findings (first-60-seconds, moment-vs-celebration mismatches,
   unfinished-in-motion, the fourth-play reason, six-year-old readthrough),
   and the coin economy dead-end at ~30 matches (docs/OVERNIGHT.md §4).

### RETRACTION 2026-08-13, first-60-seconds: "the match runs behind the
tutorial card" was a PROBE ARTIFACT, not a bug. The probe (firstrun.mjs)
cleared storage, so the first-launch autoplay put it straight into a match —
then it JS-clicked #btnPlay and a world card, both display:none at that
moment. A finger cannot tap invisible buttons. The real flows are clean:
first launch is zero-tap autoplay with in-game guidance; session two shows
the tut card BEFORE startFresh and only LET'S EAT starts the match. What the
investigation did surface (owner concurred, same day): the drag lesson was
all TEXT — archaic against hole.io's animated-hand teach. Replaced with the
ghost hand — at the owner's direction, hole.io's exact form: a white glove
tracing a solid ∞ ribbon (lemniscate, hand keyframes sampled from the same
curve so the fingertip rides ON the ribbon), on from controls-live to first
real drag (#hand, handEl toggle), plus the same demo inside the tut card.
The old probe's "FIRST BITE at t=23.1s" number was ALSO an artifact:
__matchState().ate is an object ({you, family} percentages), so its
`.ate > 0` check was NaN>0 forever and the number was a swallowed timeout.
The true picture, measured by firstrun2.mjs (which only performs gestures a
child can, and uses score as the bite signal): the suction well feeds a
stationary void — score 23 before ANY input at t=2.4 — and the first
drag-driven bite lands within a tenth of a game-second of the drag.
Tap-to-first-bite is ~0: bites begin before the first tap.

---

## TRAPS THAT HAVE ALREADY COST WRONG CONCLUSIONS

- **A backtick inside a JS template literal ends the string.** GLSL lives in
  template literals here. A backtick in a *comment* inside one silently produces
  a stale bundle.
- **`#include <tonemapping_pars_fragment>` / `colorspace_pars_fragment` must not
  be re-declared** in a custom shader — you get "function already has a body",
  and it fails *asymmetrically*: clean at 3 s, broken at 25 s, because three
  forces `NoToneMapping` into render targets. Declare nothing; just add
  `#include <tonemapping_fragment>` and `#include <colorspace_fragment>`.
- **`#joy` is a DOM element.** A held joystick ring sits dead centre of screen,
  exactly where the follow camera keeps the void. It is invisible to raycasts
  and to `readPixels`, and it cost three wrong shader changes chasing a "ring
  around the void" that was the probe's own thumb. Hide every DOM layer over the
  canvas in any visual probe, not just `#joy`.
- **Jumping the radius fires the evolution burst**, a torus at 1.42× the body
  that takes ~3 s to reach zero opacity. Settle 3.4 s after `__setVoidR` or you
  will photograph a bright ring and go hunting for it in the shader.
- **Freezing the rAF loop is not enough to hold a frame still.** `animate()`
  takes dt from `THREE.Clock`, which reads `performance.now()`, so a hand-cranked
  frame still advances the world by however long the previous screenshot encode
  took. Virtualise the clock too, and step with dt = 0 when sweeping one
  variable. Assert the freeze held by sampling the match clock across wall time —
  a freeze that quietly does not freeze manufactures the exact artefact you
  installed it to prevent.
- **Never re-assert `__setVoidR` between shots of a sweep.** It sets a target the
  growth spring eases toward, so it shrinks the void a little every step — a
  monotonic ramp that reads exactly like "the change made his face smaller".
- **Counting roundness by vertex is wrong.** A box is 36 vertices, a sphere ~600.
  Count by part.

---

## WHAT DONE LOOKS LIKE

A child taps PLAY, is eating within five seconds, and cannot tell you why the
game feels expensive — only that it does. The void is crisp dark purple at every
size, the crowd is alive, the town is made of materials rather than of one
matte, nothing pops or shimmers, the match is close, and the last thirty seconds
are the best part.

Commit unverified work as unverified and say so in the message. Retract in the
next commit if the instrument disagrees. Never defend a number.
