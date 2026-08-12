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

---

## WHAT I THINK THIS NEEDS, RANKED

### 1. The quality ladder is a one-way door — fix this first, it gates everything
`prototype3d.ts`, `QUALITY` table and the adapter near the end of `animate()`.

Once a device reaches rung 3, `qShadowLatch` blocks the climb back **forever**,
across matches. The comment promises "the pixel-ratio rungs above still give the
device its quality back" — but rung 3 is the only shadowless rung, so the escape
hatch it describes does not exist. Worse, the adapter samples straight through
the 30–45 s world build with no `started` gate, so one bad stretch at load
strands a good phone at ~11% of native for the whole session.

Fix: gate the adapter on `started`; add a shadowless high-pixel-ratio rung so
the latch has somewhere to climb to, or clear the latch between matches. Then
re-check with `shippedlook` at each rung.

### 2. The people are Lego, and the fix is silhouette, not faces
The owner: *"I'd want them more alive/high detail. Not like actual faces. But
not Lego blocks."* He is describing a real, specific thing.

Measured in `life.ts`: **`CapsuleGeometry` appears zero times.** Limbs and
torsos are `BoxGeometry`; heads are `SphereGeometry(r, 8, 6)` — eight segments.
A person merges majority-box, so it stays on the faceted material even after the
auto flat/smooth split landed. Boxes with hard facets at 30–60 px is exactly the
Lego read.

What actually fixes it, in order of effect per unit of cost:

- **Capsules for limbs and torso.** A capsule is barely more expensive than a
  box and has a rounded silhouette that smooth-shades correctly. This is the
  single biggest change available.
- **Taper and a neck.** Shoulders wider than hips, forearm thinner than upper
  arm, a short neck between head and torso. Three ratios, no new geometry.
- **Head to 12–16 segments.** At the size a crowd is read, 8 is a visible
  polygon; 12–16 is not, and heads are a small share of crowd triangles.
- **Secondary motion.** "Alive" is mostly animation, not polygons: arm swing
  phase-offset from the legs, a small head bob on the step cycle, a per-person
  idle sway with a random phase so a standing crowd is not a frozen diorama, and
  a lean into turns. Cheap, and it is what separates a crowd from a prop shelf.
- **Do NOT add faces.** The owner is explicit and correct: at this camera
  distance a face becomes noise, and a stylised headless-silhouette crowd reads
  as premium. Hair shape, hat and outfit silhouette carry identity.

Budget honestly: Game Day already carries a ~390 MB heap, 84% of it vertex
buffers, and the crowd is instanced heavily. Measure the heap before and after
(`qa/heap.mjs`) and keep the distance gate that already exists.

### 3. Finish the material pass
Per-vertex specular works; coverage was the problem. Maple went 5.3% → 76.1%
glossy this session by registering the autumn canopy. Pirate (28%) and Lantern
(34%, but only 6.8% *strong*) have the same shape of gap. Use `glossgap.mjs` to
find where each world's surface area actually is before registering anything —
counting registry entries answers the wrong question.

Watch the collision trap: the gloss registry is global, keyed by raw colour,
written by five modules at import time, last-write-wins by import order. It now
warns on conflicts. Main Street's `FAIR_C` and Game Day's `GOLD` are the same
hex, and adding one silently demoted every gold surface in the stadium.

**Do not** try to make the ground read as different materials via roughness.
Measured dead: 0.02% of pixels change between roughness 0.97 and 0.45, because
the island floor is one flat horizontal plane whose specular lobe never points
at this camera. It needs normal *variation*. The verified road/grass mask is in
`island.ts` at neutral values for whoever does that.

### 4. The first thirty seconds
The splash and first-run flow are on the table and they matter more than any
shader. Specifically:

- The menu art is heavily occluded by its own chrome — roughly 40% of the splash
  visible in the owner's screenshot.
- Cold boot is a 30–45 s blocking stretch. That is the single worst thing in the
  product and it is also what strands the quality ladder (see #1). Profile it
  (`qa/_bootgl.mjs` established it is ~99% ordinary JavaScript, not GPU), then
  stream or defer the world build so the first frame arrives fast and the rest
  fills in.
- A child's first thirty seconds should be: tap, see the void, eat something,
  feel it. Anything between tap and first bite is a leak.

### 5. Fun, not just fidelity
The match is now a genuine contest — all four worlds finish 1st or 2nd against a
child driver, and the win condition is one comparison against a per-world par.
Do not retune the difficulty controller without reading the nine failed attempts
recorded in `docs/OVERNIGHT.md`; the band is a controller that absorbs anything
fed into its inputs, and only a change to the controller itself has ever worked.

Where the fun headroom actually is: the last 30 seconds of a match has no shape,
world events fire but are not felt, and the family rivals have arcs the player
never notices. Those are design problems, not rendering ones.

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
