# STUDIO — ROUND 4 — 2026-09-23

The first studio round on a lookbook with the hero in every play frame
(qa/out/lookbook.json, 2026-09-23). Nine teams reviewed their own surfaces
against named bars, a skeptic tried to kill every finding, art direction asked
whether the six worlds read as one game, and the governor set the order of
work. The owner's question going in: *is this AAA, and will kids keep playing?*

**Verdict: NO-SHIP.** Seven blockers (B1-B7). Its most urgent finding was
against this loop's own work: G10's anti-aliasing fix (bb1430b) multisampled
only every other frame, and the probe passed it. The ledger that tracks each
job is docs/AAA-LOOP.md; this file is the round's record, kept whole.

The full board (every team review and every skeptic, ~260 KB) stays in the
workflow journal and is not copied here.

---

## The governor — blockers and the order of work

### VERDICT: NO-SHIP

Seven blockers are still open. One of them is new since the review: the anti-aliasing fix that landed during the review (bb1430b) only works on every other frame. The branch is about to ship edges that flicker at 30 Hz on the owner's phone, and the probe that checks it reports PASS.

### THE BAR

**Donut County** (Annapurna; Apple's iPhone Game of the Year 2018). It has the same verb and the same high camera as ours, and it does three things mechanically:
1. It uses one tessellation style per frame.
2. Faces are flat dark marks drawn on the head surface, so they read from any angle the camera reaches.
3. The reward lands when the object drops in.

**hole.io** is the floor. **Crossy Road** is the bar for "many worlds, one game".

Where the opening frame of Maple sits against Donut County:
- It fails point 1 three times: maples covered in faceted polka dots, a faceted pine, and hexagonal blossoms.
- It fails point 2 on every walking person and every cap.
- It fails point 3 on every bite: the sound fires on contact, 170–290 ms before the object starts to sink.
- It also shows two coffee stains and two glowing planters, which neither title would ship.

Commit f20e21c (G1) made Maple dot 1 the first match of every new install. So these two days go on Maple's opening minute.

### WHAT BLOCKS

| # | Blocker | Vetoed by | State at the branch tip | Closed by |
|---|---|---|---|---|
| B1 | Leaf drifts are painted onto the square's pale walks: two coffee stains in the opening frame (src/proto3d/island.ts:3433, :3454-3455) | GROUND, upheld by skeptic | **Open.** I can see both discs at 3x in maple_look.png (560-760, 1420-1480) | Job 3 |
| B2 | Maple canopy carries six 8×6 "dapple" spheres (src/proto3d/mainstreet.ts:1823) | STATIC, upheld | **Open.** Three trees show them in maple_look.png, and there are 603 in the town | Job 2 |
| B3 | Walking-crowd eyes sit inside the shared hair crown (life.ts:873 against :1450). Eyes are 0% visible at 46/55/65° for 10 of the 14 `HAIRS` entries | MOTION, upheld | **Open.** `qa/_headcover.mjs` prints "0.0%" and blocks nothing | Job 4 |
| B4 | Caps bury the eyes (life.ts:803-804). 21 dress codes default to a cap. The skeptic found that beanie, hood, bandana and sun hats do the same | MOTION, upheld; the fix was replaced by the skeptic's visor sweep | **Open.** In gameday_look.png a cream cap reads as a skull (my crop gdcap.png) | Job 4 |
| B5 | No anti-aliasing on quality rungs 0–1 | LIGHT, upheld | **Half-closed by bb1430b, then reopened** (see the note under this table) | Job 1 |
| B6 | No current frame of the in-match HUD (charter rule 1) | UI, upheld | **Wider now.** G6's NOMS pill and G4's end party are both visual, and neither `nomstream.mjs` nor `endparty.mjs` takes a screenshot | I-2, I-8 |
| B7 | A glow does not mean a light source | ART DIRECTION. This one had no skeptic; I checked both pixel claims and the amber arithmetic myself | **Open** | Job 5 (Maple), Job 9 (Lantern) |

Why B5 reopened: RenderPass draws into `composer.readBuffer`, and OutputPass keeps `needsSwap = true`. So the read buffer alternates every frame between renderTarget2, which has 0 samples (prototype3d.ts:193), and renderTarget1, which has 4. The evidence is in three's source: EffectComposer.js:89/97/256 and RenderPass.js:156. aamsaa bar (a) reads `renderTarget1.samples` once, so it cannot see the alternation. Its 29.6% reading came from a frame that happened to be multisampled.

What B7 looks like in the pixels:
- maple_front.png, the game's first frame: both cream planters have a white halo beside the tutorial hand.
- lantern_look.png: of the four lanterns on the wire, only the paper-white one has a halo.
- The arithmetic: G_AMBER side faces reach a luminance of 0.70 and G_RED reaches 0.38. Bloom starts at 1.05.

Downgraded by skeptics, so not blocking:
- Results-screen ghosts (UI) are now major.
- Bite timing (CHOREOGRAPHY) is now major.
- The square-wave bite sound (AUDIO) is now major.
- NIBBLES attacking from off screen (PLAY) is major, pending a measurement.

**Precondition on the push itself.** This branch does not fast-forward main until the following are true:
- **G4 (aeffe9d) and G6 each have a frame a person has read.** G4's commit is titled "(unverified)". G6 was marked DONE at 45e6c76 with no rendered frame, while AAA-LOOP step 5 says "Rendered and looked at if it is visual".
- **G6's pill has a named decision.** The NOMS pill is `#8a5cff` (index.html:239), placed beside a hero whose colour is `0x9a5cff` (prototype3d.ts:5874). The governor's own ledger rejected "new HUD chips (owner clutter complaint, 2026-08-29)" (docs/AAA-LOOP.md:123). The pill needs a frame and a decision on record.
- **The end-of-match sounds stop stacking.** `endMatch()` still fires `finale()` (:8215), then `audio.evolve()` on a rank level-up (:8323), then `audio.win()` on a world unlock (:8379), all in the same synchronous call. `qa/endparty.mjs` must assert at most one celebration sound within 0.5 s.

### THE ORDER OF WORK

Rank is value to the first 30 seconds of Maple, divided by the risk of breaking something that works. Two days is roughly four landing cycles, each one a build, a lookbook reshoot and the 40-minute push gate.
- **Day 1:** Jobs 0, 1, 2, 3 and 5, then land and have the owner check his phone.
- **Day 2:** Jobs 4, 6 and 7, plus Job 8 if there is time.
- **Jobs 9–11** run only if everything above is green. Otherwise they head the next list.

None of Jobs 0–11 adds a draw call or a material.

#### Job 0 — The pack photographs what a child sees (QA only, prerequisite)
- **Files:** qa/shippedlook.mjs, plus a QA-only hook in src/prototype3d.ts next to `__camAim` (:3596).
- **Change:**
  - Add `_dbg.__settleCam()`: set `camDist = camAim` and snap the follow camera. Today the pack waits 0.6+0.15 match-seconds (shippedlook.mjs:132/155), and settling takes about 57 frames.
  - Hide the HUD with an injected `!important` stylesheet instead of inline styles. `addCoins` (prototype3d.ts:6013) rewrites the inline style, which is why "✦ 35" appears in maple_look.png only.
  - Add HUD-on frames (I-2) and the face line-up (I-3).
- **Cost:** 0 to the game. **Seeded stream:** none.
- **Gate:** shippedlook prints FAIL when the void's measured width differs from (R / `__camAim().aim`) / 0.1323 by more than 5%. Today all six frames read 0.544–0.572 against 0.405, so it fails.

#### Job 1 — Every frame anti-aliased (repairs G10, closes B5)
- **Files:** src/prototype3d.ts:176-194 and :244.
- **Change:**
  - Replace the OutputPass line with `const out = new OutputPass(); out.needsSwap = false; composer.addPass(out);`.
  - After construction, set `composer.readBuffer = composer.renderTarget1; composer.writeBuffer = composer.renderTarget2;`. renderTarget2 keeps 0 samples and is never drawn to.
  - Correct the G10 comment at :178-186. Its claim that "nothing … ever renders into renderTarget2" is false.
  - Correct the stale "BLOOM IS OFF ON EVERY RUNG" block at :2257 (LIGHT F6 rider).
  - Change G10's AAA-LOOP status from "DEFECT FIXED" to reopened, with the reason.
- **Cost:** 0 draw calls, 0 triangles. It adds no GPU memory beyond what bb1430b already added, which is about 60–70 MB at pixel ratio 2 on a 390×844 phone and has never been measured on a GPU.
- **Seeded stream:** none.
- **Gate:** add `qa/aamsaa.mjs` bar (a′): wrap `composer.render` and record `composer.readBuffer.samples` over 6 consecutive renders; every one must be ≥ 2. Today it reads 0,4,0,4… and fails; after the fix it passes. Retire bar (a) and add (a′) to push.
- **Device:** check I-9. If Game Day reloads the page on the phone, drop to `samples: 2`, or failing that use FXAA after OutputPass.

#### Job 2 — Maple crowns become one mass each (closes B2)
- **Files:** src/proto3d/mainstreet.ts:1806 (`lit`), :1818-1824 (the dapple arithmetic and its `part()`), and the comment at :1795-1799.
- **Change:** delete the dapple and `lit`. The four `mr()` draws per lobe stay.
- **Cost:**
  - Per tree: 480 fewer triangles (6 × 2·8·5).
  - Across Maple: 603 trees, about 289k fewer triangles, and about 32 MB less CPU-side vertex data at 111 B per triangle.
  - 0 draw calls.
- **Seeded stream:** untouched, because the dapples were arithmetic on draws already taken. `qa/rng.mjs` and `qa/opening.mjs` must stay green.
- **Gate:**
  - `qa/roundlod.mjs`: set BASELINE 153→152 and TRI_BASELINE 39320→39240 in the same commit. Changing BASELINE alone would fail after the fix too; that is the skeptic's correction. Today's tree has 153 sites and fails; after the fix it passes.
  - The ratchet cannot see a polka dot, so a person must read a 2x crop of the nearest maple in the **settled** frame.
  - Fallback if the crown reads as a lollipop: STATIC's three-dapple variant (12×8, tint 0.08, `d = CR − 0.62·r2`). That costs 24 more triangles per tree and uses the same stream.

#### Job 3 — The opening square is clean (closes B1, with a Pirate rider)
- **Files:** src/proto3d/island.ts:3417-3478 (the drift pass) and :2920-2922 (the protest patch). Rider: :1637, :1677, :1718.
- **Change:**
  - **Drift pass:** for each grassy block, call `getImageData` once before painting its lobes. Keep every `dr()` call, but only `fill()` a lobe when its centre and four rim points are green-dominant (G > R+6 and G > B+6).
  - **Protest patch:** replace it with a radial falloff clipped to green texels, in a cool worn-grass tone.
  - **Pirate rider:** use `quiet('#f2e2b8', 0.6)` at all three sites, including the DCOL fallback. Leave the deck at 0.35 and the DCOL `beach` entry unchanged; at 0.205 it would break GROUND_STAGE.
- **Cost:** 0 draw calls, 0 triangles. About 13 block readbacks at Maple boot.
- **Seeded stream:** the drift stream is local (seed 0x1eaf5) and keeps its draw count, so every surviving lobe lands exactly where it lands today. The shared stream is untouched.
- **Gate:**
  - New `qa/leafsurface.mjs` on the bake canvas (via the `_dumpbake` route). Count warm texels (R−B > 40, R > G) whose 15×15 neighbourhood has median luminance above 0.80 and chroma below 0.10, and fail above about 20. Today it fails on the walks, the forecourt and the protest patch. It passes after.
  - Pirate: sample the sand in the settled play frame and require chroma ≥ 0.11. Today it is 0.064; pirate_land.png read 0.139 at the same spot on 9 Sep.

#### Job 4 — Walking people have faces (closes B3 and B4)
- **Files:** src/proto3d/life.ts:864, :866, :873 (hair shells), :803-804 and :826-828 (cap and postal), :1392-1395 (hair, then hat, then hat colour).
- **Change:**
  - Add rotation `−0.55` as the ninth `pc()` argument on the shared crown, buzz and curly shells. The skeptic's raycast gives eyes 0/0/0 → 72/68/61 and mouth 48/40/34, and bare scalp seen from above stays at 0.0%.
  - Cap and postal crown: `pc(B.hemi, col, 0, 0.16, -0.04, 1.17, 0.94, 1.17, -0.5)`.
  - Cap visor, from the skeptic's sweep: depth 0.30, y 0.36, z 0.44, rotation −0.7, giving 73/67/53. MOTION's own visor gave 64/16/0 and is discarded.
  - Compute `hk` before the hair, and draw curly hair as short under any hat.
  - Pick hat colours only from those with ΔE > 15 from both the shirt and the skin. Today a cream cap reads as a bald head.
  - Run beanie, hood and bandana through the same sweep. Sun, straw and captain brims may shade the eyes; record that as a deliberate convention.
- **Cost:** 0 draw calls. 960 fewer triangles per capped person with curly hair; otherwise 0.
- **Seeded stream:** none; the crowd uses `Math.random`.
- **Gate:**
  - Harden `qa/_headcover.mjs`:
    - Parse the eye from life.ts instead of its stale literal (0.40 against the real 0.43).
    - Parse the ninth argument.
    - Exit 1 whenever an eye is 0% outside a shell.

    It fails today and passes after.
  - Add a node raycast that parses life.ts (it must not copy numbers out of it). For every Hair × Hat at 46/55/65°, at least 50% of eye samples must land on INK. Today `short` scores 0%.
  - A person reads the line-up (I-3).

#### Job 5 — Paint never glows (Maple half of B7)
- **Files:** src/proto3d/mainstreet.ts:192, or `installPropShader` in island.ts.
- **Change:** run an A/B first. Set CREAM gloss 0.20→0 on the settled Maple frame and compare bloom 0.5 against bloom 0.
  - If the halo goes, ship WHITE/CREAM/BONE at gloss 0.06.
  - If it stays, the cause is the skyK top ×1.18 on near-white under the key light. In that case, clamp lit-prop output luminance to 0.95 × the 1.05 bloom cut at the end of the `installPropShader` fragment.
- **Cost:** 0 draw calls. About 4 extra shader instructions per fragment if the clamp is needed.
- **Seeded stream:** none.
- **Gate:** halo census (I-5). No non-glow prop may lift the brightness of its 4–16 px ring by 3 L* or more. Today the planters fail (ART DIRECTION measured the lawn luminance rising 0.545→0.651 toward the rim); after the fix it passes.

#### Job 6 — The first two people she sees
- **Files:** src/proto3d/mainstreet.ts:336, :455-460, :910; qa/personsheet.mjs:119.
- **Change:**
  - Chest top 0.40T → 0.34T. The yoke then overhangs by 0.054T and the ruff disappears.
  - Flatten each eye along the skull normal and narrow it to sx ≈ 0.75, so it sits inside the tessellated 16×11 silhouette (0.356T) while standing at least 0.005T proud. MOTION's numbers put the eye at 0.358T, so they are replaced.
  - In `makeTownsfolk`, hoist the three draws in their **current order** (`shirt = mpick`, `ry = mr`, `hc = hat ? mpick : undefined`) and store `userData.faceRy`.
- **Cost:** 0 draw calls, 0 triangles.
- **Seeded stream:** order and count are unchanged. Hoisting `mr()` alone would swap two draws and shift every later placement in Maple Falls. `rng.mjs` and `opening.mjs` must stay green.
- **Gate:**
  - A node probe builds the head with three. It fails when an ink part pokes through the silhouette or stands out less than sag + 0.005T; today the eye reaches 0.365T against 0.356T. It also fails when a same-colour sphere/cap pair is closer than 0.03T; today that gap is 0.006T.
  - personsheet asserts that in the front frame the eye centre is nearer the camera than the head centre. Today the bowler fails; maple_front.png shows the back of his head.

#### Job 7 — One HUD, and screens without ghosts
- **Files:** index.html :138, :320, :570-576, :687, :712, :1447-1450, :2120-2126, :3289, plus the tab and end buttons; src/prototype3d.ts:4471.
- **Change:**
  - **Ghosts:** add `body:has(#end.show) :is(#timer,#news,#banner,#count,#btnQuit,#wayfind,#form,#noms,.vb,.vf){display:none}`. Keep `#coins` visible.
  - **Countdown:** give `#count span` an 8 px `-webkit-text-stroke` with `paint-order: stroke fill`. Place it in the free band below the void, measured on the HUD frame. It cannot go under the timer (`#news` is there) or above the head (`#form` is there).
  - **Chips:** apply `.clay` to `#goal`, `#coins`, `#growth` and `#btnQuit`; put their radii on the design scale; delete the four backdrop blurs; set the label weight to 600.
  - **Buttons:** `button{font-family:inherit}` and a 44 px minimum height on `.bkTabs button`, `#endMore` and `#soloTog`.
  - **Glyphs:** draw → ▾ ▶ ⌂ from the existing `<symbol>` sheet. ⌂ becomes a pause mark, because that button pauses.
  - **Panels:** `modalIn` on 4 panels, and a 0.28 s fade on `#end`.
  - **Overlays:** move the overlay observer out of the DEV-only guard and add `'end'` to it.
- **Cost:** 0 draw calls. It removes 3–4 full-screen blurs from every match frame.
- **Seeded stream:** none.
- **Gate:**
  - `endghost`: fails today on `#timer` and `#news`.
  - `uisystem`, walked through a live match: fails 4 of 4 chips today.
  - `countdown` (at `?len=15`, clock 7): requires a stroke of at least 4 px and less than 10% overlap with the hero box. Fails both today.
  - `glyphs`: fails on → ▾ ▶ ⌂.
  - `modalin`: fails 4 of 4.
  - On the production build, `body.ovl` must be set while the shop is open. Fails today.

#### Job 8 — The void is alive at spawn
- **Files:** src/proto3d/void3d.ts:2082, :2085, :2155, :1410, and the mouth block at :2292; src/prototype3d.ts:13460-13463 and :13878, plus the line beside `celebrate()` at :14519.
- **Change:**
  - Add `vRef = steerCap(settled cd)` to VoidState. Use the settled camera distance, not the live `camDist`, because the intro dive reaches 300. Motion becomes `speed/(0.85·vRef)`, lean becomes `−vx/vRef·0.11`, and the flip triggers at `0.25·vRef`. Rigs that don't pass `vRef` keep 40.
  - Hurt face: `lid: 0.2, shut: 1`.
  - Evolution face: `smugUntil = Math.max(smugUntil, tClock + 1.8)`.
  - Visible wind-up: `uniformK -= 0.04·g·sin(π·min(1, mouthAge/0.06))`. Today's jaw envelope peaks at 0.12, under the 0.25 threshold at which the mouth is drawn at all.
- **Cost:** 0 draw calls, 0 triangles.
- **Seeded stream:** none.
- **Gate:** `faceState()` gains `move`, `lid`, `shut` and `uniformK`.
  - `heromotion`: at full stick, motion must reach at least 0.85 at both r 0.9 and r 8. Today the spawn size reads 0.36.
  - `moodrule`: fails today on hurt.
  - `juice`: from a fresh match, `__forceEvolve` must produce smug or victory within 3 frames. Fails today.
  - `mouthwind`: fails today.

#### Job 9 — Lantern Night's lanterns light up (Lantern half of B7)
- **Files:** src/proto3d/island.ts:4913; src/proto3d/nightmarket.ts:775-786 and :809-818.
- **Change:**
  - In `PROP_GLOW_MAT`'s `onBeforeCompile`, add `diffuseColor.rgb *= clamp(1.35/max(luminance(diffuseColor.rgb),1e-3), 1.0, 4.0)`. The 4.0 cap is my addition: G_RED needs ×3.55, so the cap changes nothing that ships today and only protects against a future dark emitter.
  - **Umbrella:** build canopy, ribs and pole in the umbrella's own frame and tilt them all with one `makeRotationZ(0.7t)·makeRotationX(t)`. Put the ribs at about −0.01k, under the paper.
  - **Moss rock:** pre-rotate it with the same three `rnd(0,3)` draws, then squash it to (1.15, 0.62, 1.0) at 0.45k. Do the same to the 35% second chunk.
- **Cost:** 0 draw calls, 0 triangles, about 4 extra shader instructions per glow fragment.
- **Seeded stream:** none (`Math.random`, same order).
- **Gate:**
  - `qa/emitters.mjs` (node): 9 of the 11 Lantern/Powder glow colours fail today.
  - Lantern halo census: at least 90% of glow meshes must halo. Today 1 of 4 lanterns on the wire does.
  - `qa/propfit.mjs`, splitting ribs from paper by vertex index range rather than hue. It also requires at least 25% of the moss above the rock's top; today it is about 0%.
- **A/B:** run it on Lantern, Powder, Pirate and Skylark, because all four share this material; my arithmetic says Pirate's pink and cyan neon would start to halo. Red paper must still read as red after ACES.

#### Job 10 — The alarm means danger and only danger
- **Files:** src/prototype3d.ts:4940, :5011, :5128-5129, :7047, :7855, :10011; src/proto3d/fx.ts:121; src/proto3d/audio3d.ts:4488-4518 and :3605-3612.
- **Change:**
  - A rival joining plays `audio.ready()`.
  - Losing the lead gets no red wash and no alert.
  - Tapping a locked card plays a soft pop.
  - The charge keeps its sting and gets a red wash that grows from the screen edge at `wayAim(rival).ang`. That adds 0 DOM nodes. It is what the code comment already promises, and it avoids a new HUD chip, which the ledger rejected.
  - Rival eaten: one `flash()` call. The gold one never renders today.
  - `hit()`: a triangle wave rising 330→520 Hz plus a sine an octave up.
  - `alert()`: a triangle wave plus a sine at 2f.
  - Lantern, while a recording is live: `clack(t)`, then `kane(t+0.08)`.
- **Cost:** 0 draw calls, 0 DOM nodes.
- **Seeded stream:** none.
- **Gate:**
  - `dangerchannel`: fails on the first sibling join.
  - `eightbit`: 14 square oscillators today, 0 after.
  - `lnalert`: the first voice starts at 2.0 s today; it must be ≤ 0.05 s.

#### Job 11 — The bite pays off on the swallow (only after G6 and G4 are verified)
- **Files:** in src/prototype3d.ts, `capture()` (`hitStop` at :8729), the drain at :14101, the particles at :14169, and the evolution check.
- **Change:** the skeptic's corrected version.
  - Sound, voice and haptic fire when `e.t` crosses `T_FALL`, the start of the sink.
  - Hit-stop, puff and impulse fire on the swallow frame.
  - The evolution ceremony waits for the swallow.
  - Particles run on `dtw`.
- **Cost:** 0 draw calls.
- **Seeded stream:** none.
- **Gate:** write `qa/bitetime.mjs` first (I-10). The sound must land within 67 ms of the sink start. Today it lands 170–290 ms early. Retire `juice.mjs`'s credit for everything firing on the capture frame in the same commit.

### WHAT I AM NOT DOING, AND WHY

**STATIC**
- Pine 14→22/18 segments, blossoms 6×5→10×7, lanterns 8→12, snow drifts, chalet bank, snowman, bandstand hip ridges. These spend triangles, and every frame in the pack is about 37% too close. They get re-judged at the settled camera (I-1) after roundlod learns the `sph()`/`cone()` helpers (I-11). The lantern segments may not be needed once the lanterns halo.
- Maple rocks into a shared `makeBoulder`, coin-pile merges, and a census of fallback builders that create more than one mesh. These are real but are performance work; next sprint.

**MOTION**
- Bowler brim: the proposed shrink kills the hat's read from above. The tip-up experiment waits for the line-up.
- Protesters gripping their placards, and seated people at Game Day: real, but each needs animation or arm work.
- Elbow bend on the static townsfolk: after Job 6.

**GROUND**
- Plateau falloff on the tonal patches, tone on the square, a kerb strip, rails that don't read as a road, the river's dashed foam, grain per surface, and a seeded bake. All real, none is a failure in the first 30 seconds. The plateau falloff plus the square's tone is the next GROUND job; `lawnedge` needs masks first. The seeded bake lands before the next studio round so A/B evidence is clean.

**LIGHT**
- Powder hemisphere light: real, but it relights every Powder colour. Next sprint.
- Lantern hemisphere: discarded; the skeptic found the rig already retracted it.
- Exposure compensation: the written fix was unsound, and the corrected one has to touch every hero material. Next sprint with HERO.

**HERO**
- Big-meal swell: the fix was replaced (scale the clamp and add a floor). Next sprint.
- Katamari camera step: an experiment for the owner's phone.
- Skylark's mismatched eyes, visible in my crop skeyes.png: they need I-13 to diagnose first.
- Cast shadow: **dropped.** HERO's skeptic killed it, so ART DIRECTION's conflict 8 does not come back. The only follow-up left is I-15.

**UI**
- Results-card hierarchy, system emoji, the empty top 40% of the card, confetti over the text, and mixed case: the card changed under G4 after the pack was shot, so they wait for I-8. The emoji go with task U1/#48.
- Picker level dots, one-word tagline lines, text under 12 px, and the scene drawing behind opaque sheets (battery only): next sprint.
- Home indicator and edge gestures: native code, and there is no Mac.

**CHOREOGRAPHY**
- Big props winding up, leans that are abandoned half-way, and sunbathers flipped upright off their towels (the skeptic's find, code only): one rest-quaternion job, first on the next list.
- Rival-kill freeze and evolution camera timing: fold into research item G8.
- Menu→match camera blend and resume ramp: they carry a risk to the "identical every load" opening.
- Intro control tax: an experiment against `opening.mjs`.

**AUDIO**
- The place layer under the recordings (four worlds): this is the **third round it has been raised and left unfixed**. It is not in these two days because the drum rule has to be extended to the ambience buses first; the owner has vetoed drums over recordings twice. Then it needs a listening pass on the phone. It is first in line next, reusing `qa/ambience.mjs`.
- Per-track gain, the chomp pitch ladder's key, and the 52 Hz sub: minor.

**PLAY**
- Notice cues on screen, ring-count limits, shuffle-bag lines, and the lunge-speed copy: they need I-12's measurements first.

**ART DIRECTION**
- Palette rules beyond Pirate's sand.
- The dark hero on the menu (dioshot/pirate.png): one CSS rule, but it exposes a palm seen from underneath, so the stage needs reframing first.
- Car style and merging the 16-mesh sedan (about 420 fewer draw calls on Maple's roads): next sprint.
- Pirate torch flames: about 80–100 more draw calls, or a new emissive code in the gloss channel. Next sprint.

**Research queue:** G5 and G7–G29 wait until the blockers close.

**Discarded as NOT REAL by the skeptics, and not deferred:**
- makeTree's lit lobe.
- Foliage vibrance.
- iOS status bar.
- The 800/900 font weights.
- CHOMP being inaudible.
- Unwiring evolve_epic.
- Decoded-track memory.
- The silent switch.
- The `noise()` buffer.
- The rival-bite mouth pop.
- The hero cast shadow.

### NEW INSTRUMENTS NEEDED

Each one is delivered before the work it gates.

- **I-1.** `__settleCam()` plus the width check in shippedlook. Gates every tessellation decision, the prop-share table, and where the countdown goes.
- **I-2.** HUD-on frames for every world (t≈20 and clock 7) and the injected hide stylesheet. Gates Job 7 and G6's pill (B6).
- **I-3.** A face line-up: every Hair × Hat, built with `makePerson` in a page, facing the camera at 46/55/65°. Personsheet selects movers (radius 2.4) and subtracts `faceRy`. `crowdface.mjs` gets its head-node crop and joins the lookbook. Gates Jobs 4 and 6.
- **I-4.** aamsaa bar (a′), readBuffer samples on every render. Gates Job 1.
- **I-5.** Halo census in postpipe: bloom 0.5 against 0, ring lift per mesh. Gates Jobs 5 and 9.
- **I-6.** `leafsurface.mjs`. Gates Job 3.
- **I-7.** The node face raycast and the hardened `_headcover.mjs`. Gates Job 4.
- **I-8.** End-card frames (win and miss) after G4, and `endparty` asserting at most one celebration sound. Gates G4 reaching main.
- **I-9.** The owner's phone, in plain words:
  1. Watch a tree against the plaza for five seconds. Do its edges stay steady?
  2. Play three minutes of Game Day. Does the page ever reload?
  3. Do the people walking toward you have eyes?

  Nothing in the pack has ever run on a GPU.
- **I-10.** `bitetime.mjs` with a `__biteLog`. Gates Job 11.
- **I-11.** roundlod learns the `sph`/`cone`/`cyl` helpers and counts cones and cylinders. Gates the tessellation sweep.
- **I-12.** An on-screen column in ringcount, plus one measured normal minute per world. Gates PLAY's cue changes.
- **I-13.** Eye-pair ΔL* in heroswatch across all six play frames, the menu and the results card.
- **I-14.** Two renders of Lantern, one with pool passes 7a/7b off and one with the void's bloom sprite off. Identifies the iridescent arc (my crop larc.png).
- **I-15.** `node qa/grounding.mjs <port> lantern 1.5,4`.
- **I-16.** Measurements: is AudioBuffer PCM counted inside the 446 MB heap figure, and what is the real multisampling GPU memory on the phone?

### THE ONE THING

**Job 1: set OutputPass `needsSwap = false` and point `readBuffer` at the multisampled target.**

It is two lines, with zero draw calls, zero triangles, no seeded draws and no memory beyond what G10 already spent. It gives smooth, stable edges on every frame of every world and every menu on the rung the owner's phone runs. Without it, the next push ships a new 30 Hz edge shimmer with a PASS next to it; in the menu, which draws every other frame, the shimmer is 15 Hz. That is the third time a gate has passed a visual failure, which is how the first two happened.

It does not fix a single stain, polka dot or blind face. It is the one change that touches every pixel she sees, and it goes toward the owner's own "not crisp".

### IS THIS THE BEST THIS CAN BE?

No. After these two days, the opening minute meets Donut County's point 2 if the line-up reads. It meets point 1 only in part (the pine and blossoms are still faceted) and misses point 3 until Job 11. What stands between here and the bar, ranked:

1. **Glow means light in every world.** A gloss-channel emissive code would put Pirate's torches on the glow material, orient Powder's windows, and merge the 27 two-draw `lit()` builders into one draw each. That is the cheapest large draw-call saving on Lantern, whose late-match frame costs 6,436 draw calls.
2. **Bites and buildings wind up and pay off on the swallow.**
3. **Palette rules in every world.** Kit accent colours go through `loud()`, Powder's chalets take their poster colours, and the pop.mjs D2 prop-share check becomes a gate.
4. **One tessellation style, judged at the settled camera,** and a squashed boulder in place of every raw polyhedron rock.
5. **The hero identical everywhere:** the menu veil and its stage, Skylark's eyes, and a results card that shows him.
6. **The place layer under the recordings.**
7. **Menu→match without a camera cut.**
8. **Surface richness toward Animal Crossing:** a leaf pattern on one canopy mass and contact shading from an occupancy texture. Both are GPU experiments.

### COVERAGE

**Images read:**
- qa/out/shippedlook/ maple_look.png, lantern_look.png, powder_look.png, gameday_look.png, pirate_look.png, skylark_look.png
- person/maple_front.png
- endshot/maple-g1-miss-phone.png
- hudgoal/powder-g1.png
- mood/now/mood-hurt.png
- dioshot/pirate.png
- My pngjs crops in `(the crew scratchpad — not in the repo)`: stains.png, dapple.png, planter.png, lstring.png, larc.png, rim.png, skeyes.png, gdcap.png

**Docs:** docs/STUDIO.md (whole), docs/AAA-LOOP.md (whole), docs/HANDOFF.md §2 and §7, docs/AAA-BRIEF.md §2, §6 and the headings.

**Code:**
- src/prototype3d.ts: 160-250, 2269-2282, 14940-14960, and grep sites (endMatch audio calls, alert, flash, hitStop, the drain, celebrate)
- three.js: EffectComposer.js, RenderPass.js, Pass.js
- src/proto3d/mainstreet.ts: 180-200, 334-338, 455-462, 506-514, 905-915, 1640-1705, 1780-1832
- src/proto3d/island.ts: 1286-1345, 2872-2925, 3410-3480, 4520-4560, 4895-4925, 5250-5345
- src/proto3d/nightmarket.ts: 70-185
- src/proto3d/life.ts: 795-880, 1100-1190, and the hair and hat lines
- src/proto3d/void3d.ts: 380-400, 714-735, 1398-1440, 1664-1700
- src/proto3d/fx.ts: 118-132
- src/proto3d/audio3d.ts: 4486-4520
- index.html: 226-252, 570-576, and grep sites
- qa/: roundlod.mjs, _headcover.mjs, shippedlook.mjs 110-160, aamsaa.mjs, personsheet.mjs, gate.mjs profiles

**Git:** commits bb1430b, 796a246, dfbcd11, aeffe9d, 4c11aa4, 0276ca3, 45e6c76, and the uncommitted G4 tick/bonk diff. HEAD moved three times during this review. Line numbers are cited against the working tree at the time I read each file.

No browser, build or Playwright was run, and no repo file was edited.

---

## Art direction — does it read as one game?

### VERDICT: NO-SHIP
The game has three style rules: glow means a light, the ground stays quiet so the props can be loud, and things that grew are smooth. Each rule holds in only some worlds, and on every menu without a painted poster the hero shows up darker and grey-eyed, so the six worlds read as one hero visiting several different games.

### DOES IT READ AS ONE GAME?
No, not yet.

**What holds it together** (measured):
- **The hero.** His body renders within ±3.5 L* at the same point in all six play frames. His face is lit from a fixed vector copied from the body shader (src/proto3d/void3d.ts:1197-1199).
- **The camera, the HUD chips, and the kit.** All three are the same everywhere. Every prop is one merged, vertex-coloured, skylit mesh.
- **Shadow direction.** Five of six light rigs key from screen-left, so shadows fall the same way in those worlds. Skylark reverses it on purpose.

**What splits it:** the three rules are written in three different files, never in one place, and each holds in only some worlds.
- **Glow means light only in Powder.** Painted planters glow in Maple. Lantern's lanterns are dark. Pirate's lit torches read as pencils.
- **"The ground stays quiet so the props are loud" holds in two worlds.** Loud pixels are 25.2% in Maple and 18.7% in Game Day, but 6.1% in Pirate, 3.2% in Powder and 1.6% in Lantern.
- **Things that grew are smooth in some places only.** Maple's canopies are smooth. Its pine and rocks, Lantern's rocks and Powder's snow are faceted.
- **The one object that is consistent in play is not consistent on the menu.** On the menu, the hero is a different, darker character.

A child who plays the worlds in order meets a bright toy town, then a grey concrete dance floor, then a bright toy car park, then a brown room, then an empty blue field. Game Day is what the other four should be.

The chrome (dark space-violet, Fredoka, the hero's own colours) does belong to the same product as the splash. The places where a third style gets in are UI's: glass chips over the canvas, fallback glyphs, and system emoji on the results card.

### THE STYLE, STATED

This is a toy town seen from a kite. The camera looks down at 46–65°, so an object is its top and its outline: identity lives on horizontal surfaces and silhouettes, never on walls or fine print.

- **Two form families, and no third.**
  - **Things that grew or were turned** (trees, bushes, snow, heads, barrels, domes) are soft, smooth-shaded masses of a few overlapping spheres. The spheres share one hue and vary only in value: a dark mass underneath, the lightest part at the crown. They are tessellated so that no outline ever reads as a polygon at the play camera. Stone may be faceted but is never a regular solid.
  - **Things that were built** (houses, stalls, signs, furniture) are chunky, crisp, flat-faced boxes. Each has one loud body colour, one dark or white trim, and detail at a tenth of its size: a cup, a bunting flag, a tailgate sticker. Vehicles are rounded boxes.
- **People** are ball-headed pegs whose face is two ink dots and a smile.
- **Colour follows one law: the ground stays quiet, the props are loud.**
  - The ground carries a world's identity at low chroma (albedo at or below 0.16), with value steps of at least 1.35:1 between districts. It is never so grey that sand stops reading as sand.
  - Props sit at chroma 0.46 or above, with a few deliberately dark members for value structure.
  - Nothing in the world wears the hero's violet at his saturation.
- **Light.**
  - One warm key light rakes across the frame with long, soft shadows, against a cool counter-fill.
  - A skylight is baked into every vertex: tops ×1.18, sides ×0.74, undersides ×0.56.
  - Every base gets contact darkening.
  - There are no textures, no outlines and no normal maps.
- **Glow means a light source** (window, lamp, lantern, flame, neon), and every light source glows. Paint, snow, metal and skin never cross the bloom threshold.
- **The hero** is the only glossy, self-lit thing in the frame and the only face big enough to read. He looks the same in every world, on every menu and on every card.
- **Stylised:** proportion, scale, colour, and the ground treated as a soft painting.
- **Literal:** what things are and where they stand. A pickup is parked in a bay, lanterns hang on a wire, a gritter drives on the road. Signs carry glyph bars rather than words, so a child who can't read yet loses nothing.

It sits between **hole.io** and **Animal Crossing: New Horizons**:
- **hole.io** is the owner's reference and the genre floor: a flat, bright toy city of boxes and blobs on a quiet ground.
- **Animal Crossing: New Horizons** supplies soft organic masses built from value, a warm key against a cool fill, and a handmade-toy finish.
- **Crossy Road** is the discipline for the built kit.
- **Kirby** is the bar for a hero who never changes.

In short: hole.io's legibility, Animal Crossing's hand.

### THE BAR
**Crossy Road** is the bar for "many worlds, one game". It ships dozens of themed worlds (space, haunted, snowy and more), and every theme changes the palette and the props but never the grammar. There is one build language at one scale, one flat key light with one crisp shadow, and saturated props on a plain ground. A player never wonders which game they are in.

Where we sit against it:
- Maple and Game Day each meet that bar on their own.
- Across worlds, we break it on three rules and on how the hero looks on the menu.
- On pop, the house's own metric is D2: the share of the playfield above chroma 0.35. The owner's hole.io reference frame reads 25.9% (qa/food.mjs:10-12). Only Maple reaches that figure, and Game Day comes closest.
- For night scenes the bar is **Alto's Odyssey**: unlit things fall into one cool family, and only light sources carry warm colour with a halo. Lantern does the reverse.
- For the hero the bar is **Kirby**: the same character on every screen.

### WHERE IT BREAKS
Ranked by how much each costs the read.

#### 1. Glow does not mean light: paint glows at spawn, and the lanterns, windows and torches do not
SEVERITY: blocker

AT:
- src/prototype3d.ts:229-237
- src/proto3d/island.ts:4913, :4863, :4787, :5583-5584
- src/proto3d/nightmarket.ts:81-88, :179
- src/proto3d/alpine.ts:98-101
- src/proto3d/mainstreet.ts:192

SAW:
- **maple_front.png and maple_threequarter.png** (the game's first frame, with the tutorial hand): both cream planters wear a white halo. In maple_look.png, three more do.
  - I measured the lawn beside the planter at (470,1390) on maple_look.png. Its relative luminance rises from 0.545 at 30 px out to 0.651 at the rim, and its chroma falls from 0.18 to 0.12.
  - That is bloom spilling onto grass, not shading. The planters read as lamps, or as pickups.
- **lantern_look.png**: of the four lanterns on the wire, only the paper-white one has a halo, lifting its surroundings by +26 L* at 23 px. The two amber lanterns and the red one lift theirs by nothing (−7 and −2 L*).
- **lantern_aaa1.png** is the frame the ledger cites for "the lanterns HALO now" (docs/AAA-BRIEF.md:926-928). It shows the same thing: the white ones halo, the amber and red ones do not.
- **pirate_look.png**: the spawn frame has about nine "lit bamboo tiki torches". Each flame is a matte, shaded, seven-sided mustard cone that reads as a pencil tip.
- **powder_look.png** (3x crop of the chalet): the roof skylight has a halo. The wall panes glow only along their up-facing top edge. Whether a lamp glows depends on which way it faces, not on whether it is a lamp.

EVIDENCE:
- The threshold line reads `1.05,   // threshold: LINEAR — above diffuse white, below every emitter` (prototype3d.ts:237). Both halves of that comment are false on screen.
- `PROP_GLOW_MAT = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(1.75, 1.75, 1.75) })` (island.ts:4913).
- part() bakes the skylight into every vertex colour, lamps included: `k = skyK(nrm.getY(i), lum)` (island.ts:4863), with `SIDE_K = 0.74` (island.ts:4787).
- Bloom keys on Rec.709 luminance. I computed the bloom luminance each glow colour reaches on a lamp's side faces, against the 1.05 threshold:

| Glow colour | Where it is used | Bloom luminance (side face) |
|---|---|---|
| G_AMBER | "the workhorse: most paper lanterns" | 0.70 |
| G_WARM | Lantern | 0.51 |
| G_RED | Lantern | 0.38 |
| G_GRIDDLE | Lantern | 0.41 |
| G_BLUE | Lantern | 0.77 |
| G_WINDOW | Lantern bathhouse | 0.91 |
| G_WINDOW | Powder | 0.83 |
| G_HEARTH | Powder | 0.53 |
| G_BEACON | Powder | 0.71 |
| G_PAPER | Lantern | 1.14 (clears) |
| G_GREEN | Lantern | 1.06 (clears) |

  Only G_PAPER and G_GREEN clear the threshold.
- Two kit headers promise the opposite of what ships:
  - nightmarket.ts:46-50: "The GLOWS are the only saturated colours … the only thing the eye is ever asked to follow".
  - alpine.ts:36-38: "pushes it to 1.75, past the bloom threshold, so warm glass halos".
- The torch flame is `part(new THREE.ConeGeometry(0.26, 0.72, 7), 0xffb054, 0, 3.3, 0)` (island.ts:5583). It is merged into the lit prop, not the glow material.
- The likeliest source of the planter halo is `[WHITE, 0.20], [CREAM, 0.20]` (mainstreet.ts:192), with the specular reflection boosted by ×(1+6.5·gloss) (island.ts:4541). A round, glossy, near-white hoop always has one facet reflecting the bright panels of the room environment. One A/B confirms it: set CREAM's gloss to 0.

FIX (0 draw calls, 0 triangles and 0 seeded draws unless stated):
- **(a) Normalise every lamp's brightness regardless of hue.** Add an onBeforeCompile to PROP_GLOW_MAT, after `#include <color_fragment>`:

  ```glsl
  diffuseColor.rgb *= max(1.0, 1.35 / max(luminance(diffuseColor.rgb), 1e-3));
  ```

  Every lamp's dimmest face then lands at about 1.29× the threshold, whatever its hue, and the skylight bake stops dimming lamps. It costs about 4 shader instructions per glow fragment. PROP_GLOW_MAT's colour is never changed at runtime, so the dusk ramps are untouched.
- **(b) Keep paint under the threshold.** Compare two options against the halo gate:
  1. Drop CREAM, WHITE and BONE gloss from 0.20 to 0.06 (mainstreet.ts:192). This is the smaller patch.
  2. Clamp brightness to 0.95× the threshold on PROP_SHARED_MAT and PROP_SMOOTH_MAT in installPropShader. This is the one that enforces the rule.
- **(c) Move the torch flames onto the glow material** using the existing lit() pattern. That is +1 draw call per torch: about 80–100 island-wide (20 in the stage ring, 49 on the promenade, plus the party and old-town scatter), about 9 of them in the spawn frame. A zero-draw-call alternative is in "IS THIS THE BEST".

GATE:
- **qa/emitters.mjs** (new, node-only, no browser). Take every colour merged into PROP_GLOW_MAT, apply SIDE_K and the normalisation read from source, and require at least 1.2× the threshold. Today 9 of 11 Lantern and Powder glow colours fail; after the fix, none do.
- **qa/postpipe.mjs** gets a halo census; it is already in the art and live profiles.
  - Render the frozen lookbook frame at bloom strength 0.5 and at 0.
  - At least 90% of on-screen glow meshes must lift a 4–16 px ring by 6 L* or more.
  - No non-glow prop may lift its ring by 3 L* or more.
  - Today it fails on Lantern (1 of 4 lanterns on the wire) and on Maple (the planters).

#### 2. The palette law holds in two of six worlds, and its instrument gates nothing
SEVERITY: major

AT:
- src/proto3d/palette.ts:170-171: loud() is module-private and wraps only `PROPS` (:192).
- src/proto3d/island.ts:1274-1277 and :1295-1297.
- qa/pop.mjs:38-41, which is not in qa/gate.mjs.

SAW: I measured the six shippedlook frames with the hero disc and the coin chip masked.

| world | props (chroma ≥0.35) | ground (chroma <0.12) | mean luma |
|---|---|---|---|
| Maple | 25.2% | 42.6% | 0.55 |
| Game Day | 18.7% | 71.7% | 0.40 |
| Pirate | 6.1% | 73.0% | 0.52 |
| Skylark* | 5.6% | 17.2% | 0.37 |
| Powder | 3.2% | 42.2% | 0.54 |
| Lantern | 1.6% | 51.2% | 0.23 |

\*Skylark was not one of my five frames, but it was in the pack.

- **Pirate (pirate_look.png).** The picker sells this world as "SUN, SAND, SNACKS", with golden sand and turquoise water (menushot/fresh-worlds.png). Its sand renders at rgb(185,180,169), chroma 0.064. That is greyer than Powder's snow at 0.088. Its props are black speakers, mustard coins and brown torches.
- **Powder (powder_look.png).** The frame shows one brown chalet on a blue-grey floor. Its poster shows pink and red chalets under an aurora.
- **Skylark** inverts the law: a loud ground (a lawn at chroma 0.25) under quiet props.
- **Powder's 3.2%** matches the 3.3% that qa/food.mjs:11 recorded a round ago. Nothing moved.

EVIDENCE:
- `const PROP_CHROMA = 0.46; const loud = …` is used only inside `PROPS`. alpine.ts, luxe.ts, tailgate.ts, nightmarket.ts and skyfield.ts write raw hex colours and never go through it. So the "loud props" half of the law lives in one file, while the "quiet ground" half, quiet(), is applied per world.
- island.ts:1274 says `// PIRATE takes 0.35 rather than maple's 0.40`. That reason is relative to a Maple value that was raised to 0.62 four paragraphs later (:1278), and Pirate was never revisited.
- palette.ts:157-161 already concedes this: "the measurement behind it was taken on MAPLE".
- qa/pop.mjs carries the bar, `D2: … want: '>= 15%'`, and no gate profile runs it.

FIX (0 draw calls, 0 triangles):
- **(a) GROUND's named sand scale.** Use 0.6 on sand, keep 0.35 on the magenta deck, and leave DCOL beach out, as GROUND's skeptic asked. Sand goes from 0.064 to about 0.136 chroma, still under GROUND_STAGE 0.16.
- **(b) Export loud() and run each kit's accent colours through it.** loud() already refuses anything with a channel span under 0.28, so Lantern's dark solids, snow and slate are untouched by construction.
- **(c) Add two loud wall colours to Powder's chalet builder,** taken from its own poster: pink and red. Changing a candidate list is safe for the seeded stream, and alpine uses Math.random anyway.
- **Lantern** is graded on its glows (finding 1), not on its prop share.

GATE: promote qa/pop.mjs D2 (15% or more) into the art profile for the daylight worlds, measured at the settled camera with the hero masked. Today Pirate, Powder and Skylark fail. Add GROUND's frame-sampled check that Pirate's sand chroma is at least 0.11; today it is 0.064.

#### 3. The hero is a different character on the menu
SEVERITY: major

AT:
- index.html:1651-1654 (the diorama window), against :1676-1680, the island-mode stops that already solve this, under the comment "…murk is this gradient" (:1670).
- src/prototype3d.ts:1204 and :1463.

SAW: dioshot/pirate.png, dioshot/lantern.png (23 Sep) and menushot/fresh-menu.png all show a near-black indigo ball with grey eyes.

| | Menu | Play (pirate_look.png, maple_look.png) |
|---|---|---|
| Body L* | 15–20 | 45–53 |
| Sclera L* | 40 (Pirate menu), 29 (Maple's live fallback) | 71–76 |

- The approved splash (firstframe/maple_boot_430x932.png) agrees with the play frames. The menu is the one that doesn't.
- On a device, Maple hangs its painted poster (no void, by the owner's design). So this dark version is the hero a child meets on every other world's front door.

EVIDENCE:
- The diorama window's gradient:

  ```css
  linear-gradient(180deg, #1c0f3d 0%, rgba(28,15,61,0.92) 15%, rgba(20,11,45,0.38) 30%, rgba(13,8,33,0) 44%, …)
  ```

- He stands between 19% and 37% of the screen height. That puts him under 0.78 violet at the crown, 0.55 at the eyes and 0.20 at the base.
- Veiling the play sclera, rgb(178,169,198), at 0.55 predicts rgb(89,80,112). I measured rgb(99,91,117).
- The same file's island mode already clears that band by 18%, but `DIORAMA` is false unless `?dio=1` (prototype3d.ts:1204).

FIX:
- Give `body.diorama #menu` the island-mode stops. The name stays on the band that is at least 0.90 opaque (0–11%). This is one CSS rule and costs 0 draw calls.
- Lifting the veil exposes the stage behind him: a palm seen from underneath on Pirate, a flat wall on Lantern. So MENU_STAGE framing needs a look in the same pass, or the poster route extends to other worlds as the owner planned.

GATE: qa/menuhero.mjs (new).
- For each world without a poster, project the void's bounds to CSS pixels and evaluate the computed alpha of #menu's gradient across them. The maximum must be 0.10 or less; today it is 0.78.
- Sclera L* on the menu must be at least 0.9× the same world's play frame; today it is 40 against 71.

#### 4. Two tessellation grammars, and two written doctrines
SEVERITY: major as a rule. Each individual item keeps the severity STATIC gave it.

AT: src/proto3d/island.ts:4369-4371 and :4991, against src/proto3d/alpine.ts:11. The violators:
- island.ts:5087 (pine)
- island.ts:5898-5904 (Maple rocks)
- nightmarket.ts:812-816 (moss rock)
- nightmarket.ts:146-151 (lanterns)
- alpine.ts:259, :441-444, :458-460 (drifts, snowman)
- mainstreet.ts:1823 (dapples)
- mainstreet.ts:1696 (blossoms)
- island.ts:5583 (flame)

SAW:
- **maple_look.png:**
  - The pine is the largest and darkest prop in the frame, a 14-sided cone reading as dark as rgb(4,115,40), and it stands beside smooth bushes and canopies.
  - A 12-sided die sits top right as a rock.
  - The maples are covered in octagonal dapples.
- **maple_front.png:** hexagonal blossoms on the planters at spawn.
- **lantern_look.png:** a 12-sided moss rock and a lantern shaped like a hex nut.
- **powder_look.png:** snow drifts that look like popcorn, and an octagonal plinth under the chalet.
- **pirate_look.png:** seven-sided flames.

EVIDENCE:
- island.ts:4369-4371 says "flatShading is right for architecture: a chunky, crisply-facetted building is the house style … It is wrong for a tree."
- alpine.ts:11 lists "flat shading" as a house rule, "same as island.ts, nightmarket.ts and the rest".
- So two doctrines are live in the repo, and each kit followed the one it was written under.

FIX:
- Write one rule, once, and point every kit header at it:
  1. Grown or turned things never resolve as polygons at the settled play camera.
  2. Stone may be faceted but is never a regular solid.
  3. Built things are crisp.
- Then land STATIC's list with its skeptic's corrections. Re-judge it at the settled camera first (conflict 1).
- Make deleting the dapples the default: −480 triangles per tree, about −290k across Maple. That leaves the crown as the single lit mass that mainstreet.ts:1788-1790 asks for.

GATE:
- Extend qa/roundlod.mjs to see the sph/cone/cyl helper forms, and cones and cylinders inside builders for grown things.
- Add a census to qa/normals.mjs that fails any unsquashed dodecahedron or icosahedron in a rock or drift builder.
- Both fail today and ratchet down.

#### 5. One noun, two hands: the car
SEVERITY: major

AT:
- src/proto3d/life.ts:400-406, :481-499, :3198
- src/proto3d/mainstreet.ts:1703-1724
- src/proto3d/island.ts:4315-4323, :8551-8558
- src/proto3d/tailgate.ts:309-340

SAW:
- **hudgoal/maple-g1.png** (top right): Maple's traffic car is a glossy, rounded, die-cast sedan.
- **gameday_look.png**: the tailgate lot is hard, matte boxes with no bevel.
- **skylark_look.png**: its field vehicles are hard boxes too.
- **Maple's driveways** (from code only; no frame in the pack shows a driveway): 45% get the rounded pickup, which uses rbox. The other 55% get makeParkedCar, a hard-box fallback for a GLB that has since been deleted.

EVIDENCE:
- life.ts:400-406 records the owner pointing at hard-edged cars as "blocky, not HD". That is why the moving sedan became `roundedBox(7.2, 1.4, 2.9, 0.34)`.
- That sedan is 16 separate meshes (body, hood, cabin, roof, 4 lamps, 4 tyres, 4 hubs), so it costs 16 draw calls. There are 30 of them (life.ts:3198).
- Game Day's truck is `glossy(part(new THREE.BoxGeometry(5.9, 0.9, 2.4), col, …), 0.42)`, one merged prop (tailgate.ts:319).
- The owner's complaint was answered in one builder out of four.

FIX: the owner already chose the rounded look. Take it wherever it is cheap:
- **makeParkedCar and Skylark's vehicles** switch to the cached roundedBox. The geometry is shared, and Maple is not at its memory ceiling.
- **Merge the moving sedan** into one prop plus one glow mesh. That takes it from 16 draw calls to 2, about −420 potential draw calls on Maple's roads.
- **Game Day's 200 trucks** cannot go rounded until Game Day's memory can pay for it; the heap is at 446 of 450 MB. Price one chamfer per box first (+32 triangles per box, about +51k across the lot) with qa/heap.mjs, and find the memory before landing it.
- **Do not unify by making Maple's sedan blocky.** That would undo a fix the owner asked for.
- **No seeded draws change:** life.ts uses Math.random, and makePickup's mpick/mchance calls stay the same in number and order.

GATE: qa/kitgrammar.mjs (new, a static census in the style of qa/normals.mjs). Every builder matching /car|truck|pickup|van|rv|trailer|tender/ must use one box family and return one merged prop plus at most one glow mesh. It fails today on makeCar (16 meshes) and on the split between BoxGeometry and roundedBox.

#### 6. Paint on the ground has hard edges in three worlds
SEVERITY: major. The Maple stain is GROUND's blocker.

AT: src/proto3d/island.ts:3433 and :3455 (leaf drifts on paving), :2636 (hard-edged tonal discs), :2011-2049 (Lantern's ovals), :2920-2921 (the protest patch).

SAW:
- **maple_look.png** (2x crop at 440,1330): two brown discs on the cream walk in the opening frame. This is the failure the studio was founded on.
- **lantern_look.png** (top): pale ovals with hard rims on the slate plaza.
- **powder_look.png**: a hard grey rectangle, plus a straight tone step across the snow at y≈1215. It is unidentified and reads as a render seam.
- Pirate's jungle already paints the soft version (island.ts:1733-1738).

EVIDENCE: GROUND's quotes, verified by its skeptic.

FIX: one rule. Nothing painted on the ground has a hard edge unless a person put it there: lane paint, kerbs, rails, runway numerals. Land GROUND's fixes with its skeptic's corrections: the plateau falloff for tonal patches and the per-texel leaf test. 0 draw calls.

GATE: GROUND's qa/leafsurface.mjs and qa/lawnedge.mjs, run over all six bakes instead of Maple's alone.

#### 7. Two kinds of people in the first frame
SEVERITY: minor

AT: src/proto3d/mainstreet.ts:336-337 (the ruff) and the rest of personParts, against src/proto3d/life.ts:1371-1373.

SAW:
- **maple_front.png and maple_threequarter.png** (spawn): the protesters are peg dolls with straight tube arms, flat hair lids and a scalloped ruff.
- **The crowd** in maple_look.png, gameday_look.png, powder_look.png and pirate_look.png has ball heads over shoulder yokes, with bent forearms.
- So the first people a child sees are the one group whose look the rest of the game has retired.

EVIDENCE: life.ts:1371-1372: "a dead-straight prism from shoulder to fingertip is the other half of the 'moving block' tell".

FIX: MOTION's item 6 (an elbow bend, about 9 triangles per arm) plus its ruff fix (chest top radius 0.34T). No seeded draws.

GATE: qa/species.mjs, source arithmetic in the style of qa/peoplefacet.mjs. Both builders must have a forearm bend of at least 0.15 rad and a shoulder-yoke overhang of at least 0.03. It fails today on personParts.

#### 8. The anti-aliasing that landed during this review works only on alternate frames
SEVERITY: major

AT: src/prototype3d.ts:176-194 (commit bb1430b, 04:04) and :244.

SAW: only visible in code. Every frame in the pack predates bb1430b (the frames were taken 02:07–02:19), and a still frame cannot show one frame differing from the next.

EVIDENCE: the G10 comment says "nothing on this chain ever renders into renderTarget2", and sets `composer.renderTarget2.samples = 0`. three's own code says otherwise:
- EffectComposer starts with `this.writeBuffer = this.renderTarget1` and `this.readBuffer = this.renderTarget2` (EffectComposer.js:89, :97).
- RenderPass draws the scene into `readBuffer` (RenderPass.js:156).
- OutputPass never overrides `needsSwap = true` (Pass.js:46), and render() swaps the two buffers after every pass that has needsSwap set.
- So frame 1 renders into the 0-sample target, frame 2 into the multisampled one, and so on. On the owner's phone every edge alternates between smooth and stepped at 30 Hz.
- LIGHT's skeptic wrote exactly this: "the read buffer alternates between rt1 and rt2 from frame to frame. You cannot save memory by multisampling only rt1."

FIX: keep the memory saving and stop the swap. Create the pass with `const out = new OutputPass(); out.needsSwap = false`, and start with `composer.readBuffer = composer.renderTarget1; composer.writeBuffer = composer.renderTarget2`. That costs 0 draw calls and no extra memory. Alternatively, multisample both targets, as the skeptic suggested, at about twice the GPU memory.

GATE: qa/aamsaa.mjs renders two consecutive frames. Before each one it asserts `composer.readBuffer.samples > 0`, and it grades the share of blended edges on both frames. Today it fails on every other frame. Its current check, bar (a), reads `renderTarget1.samples` once, so it can never see this.

### CROSS-TEAM CONFLICTS
1. **HERO's evidence pack against everybody's pixels.**
   - All six play frames were shot while the camera was still pulling back. The hero is 0.544–0.572 of the frame width against 0.405 when the camera has settled. So every team, this one included, judged a town 37% closer than a child sees it at r=4.
   - How visible faceting is depends on on-screen size, so STATIC priced its triangles against inflated props. GROUND's stains take up more of the settled frame. My D2 table will move.
   - **Recommend:** land HERO's `__settleCam()` first, reshoot, and re-judge STATIC's tessellation list before spending a single triangle.
2. **LIGHT's threshold, STATIC's glow palettes and two kit headers** (finding 1).
   - LIGHT set a brightness threshold. STATIC authored saturated lamps that fall under it. Each kit header promised halos.
   - Normalising the lamps raises Lantern's glow budget from the 0.012 that postpipe measured. LIGHT's hero-survives-glow check (no more than 0.05 saturation loss) has to keep passing. The halos are amber and the hero is violet, which are complementary.
   - **Recommend:** land the fix, then re-judge STATIC's 12-segment lanterns (+64 triangles × STATIC's ~338 lanterns). A lantern with a halo hides its octagon, so those ~22k triangles may never need spending.
3. **LIGHT's MSAA against Game Day's memory, and against how it landed** (finding 8).
   - Multisampling every target costs GPU memory on a phone already holding Game Day's ~376 MB of vertex buffers. The landed version saved that memory by breaking alternate frames.
   - Crisp edges in one world next to stepped edges in another would be a new coherence break.
   - **Recommend:** the no-swap fix, one AA method in every world, and a measurement on the iPhone 13 in Game Day. If that fails, use FXAA after OutputPass everywhere.
4. **STATIC's blue-shadow rule against LIGHT's rig.**
   - alpine.ts:26-34 forbids neutral grey snow in shadow.
   - The rig renders it grey anyway, at b* −6. HEMI_APPLIED is Maple-only (prototype3d.ts:2024), and Powder's hemiSky is a dark navy that would only darken things if it were applied.
   - **Recommend:** LIGHT's opt-in for Powder plus a sweep of lit dusk-blue sky colours, judged against STATIC's written rule. Leave Lantern out, per the rig's own retraction (prototype3d.ts:1923).
5. **Lantern reads as mud, and three teams each own a third of it.**
   - STATIC's glows sit under the threshold.
   - GROUND's LN_FLOOR is a brown albedo with hard ovals.
   - LIGHT owns the ambient.
   - **Recommend this order:** emission first. Then GROUND cools the unlit floor's albedo so the warm pools read against cool ground (Alto's rule). LIGHT tunes last. The ambient lift has already been tried and retracted.
6. **UI's veil against the hero** (finding 3).
   - The veil exists so the name reads over a moving 3D scene. The island stops already do that without covering him.
   - The trade is that the unveiled menu stage now has to stand up on its own.
   - **Recommend:** re-frame MENU_STAGE per world, or extend the poster route.
7. **MOTION's rounded car against Game Day's memory** (finding 5).
   - The owner chose rounded, and Game Day cannot afford it today.
   - **Recommend:** ship rounded where it is cheap, price a chamfer for Game Day, and never unify downward.
8. **HERO's no-shadow decision against every other object in the frame.**
   - void3d.ts:1747-1756 argues from the idea of a hole: "A HOLE SHOULD NOT THROW A SHADOW SIDEWAYS". The standing directive is that he is a creature, "refined, never replaced by a hole" (docs/HANDOFF.md:82-84).
   - In every frame, each prop throws a long shadow, and the largest object throws none.
   - **Recommend:** the HERO skeptic's shadow-only proxy, on a layer only the shadow camera renders (+1 draw call in the shadow pass, 0 in the main pass), shown to the owner as an A/B. It is a shadow, not a ring, which he has rejected.
9. **PLAY's "red means danger" and this review's "glow means light" are the same rule: one meaning per channel.**
   - PLAY's lead-lost red wash and the alarm on a locked-card tap are to the HUD what the glowing planter is to the world.
   - **Recommend:** land them together.

### THE SINGLE HIGHEST-VALUE VISUAL CHANGE IN THE GAME
**Make glow mean light, in every world.**

Alto's Odyssey builds its night on one mechanical rule: unlit things fall into one cool family, and only lamps and lanterns carry warm colour with a halo. The eye reads light as place, so a player can find the village in the dark.

We ship the reverse.
- In the first frame of the whole game, two painted planters glow like nightlights beside the tutorial hand.
- In Lantern Night, a world made of nothing but lanterns, the lantern that does most of the work reaches 0.70 against a 1.05 threshold and never gets a halo.
- Pirate Bay's lit torches are pencils.
- Powder's windows glow or not depending on which way they face.

The change is one onBeforeCompile line on PROP_GLOW_MAT, which lifts every lamp's dimmest face to 1.35 whatever its hue. Add lower gloss on cream (or a clamp on lit props), and put the torch flames on the glow material.

It costs 0 draw calls (about +90 for the torches via lit(), or 0 with an emissive code), 0 triangles, 0 seeded draws and no new asset. It changes what three worlds mean. It answers the owner's own Lantern note, "so dark… not crisp", with light sources rather than the ambient lift the rig already retracted. It makes true what three kit headers promise.

To a six-year-old, a glow says "this is special". The game breaks that promise at spawn.

MSAA comes second: it sharpens every edge but changes nothing about what the worlds mean, and it needs finding 8 fixed first.

### IS THIS THE BEST THIS CAN BE?
No. Here is what stands between here and the bar, ranked.

0. **Fix the evidence first.** Nothing below can be certified until the pack shows what a child sees:
   - a settled camera (HERO);
   - frames with the HUD on, and menu frames for all six worlds (UI);
   - one device capture per world, because the owner's phone runs the bloom path that the sandbox only reaches when pinned.
1. **The emission contract** (above).
2. **Anti-aliasing that holds on every frame** (finding 8), using one method in every world.
3. **The hero identical everywhere**, under one gate: extend qa/heroswatch.mjs over the menu, the results card and all six play frames, including an eye-pair ΔL* of 3 or less. It needs to cover:
   - the menu veil (finding 3);
   - Skylark's mismatched eyes: in skylark_look.png the right sclera is L* 88 and the left is 78, where Maple's pair is 73/74;
   - the results card, which shows a checkmark instead of him (CHOREOGRAPHY's skeptic).

   Separately, Skylark lights from the right while his baked highlight stays upper-left, so in world 6 he is lit from the side the world is in shadow.
4. **The palette law in every world:** Pirate's sand, kit accent colours through loud(), Powder's chalets, and pop.mjs D2 as a gate.
5. **One tessellation grammar,** re-judged at the settled camera.
   - Add a reserved emissive code in aGloss. Use 255; the highest gloss in use today is 0.9.
   - That lets the 27 lit() builders in nightmarket.ts and alpine.ts merge their two draw calls into one. It is the cheapest large draw-call saving available on Lantern, whose late-match frame costs 6,436 draw calls (docs/HANDOFF.md:368-369). It also gives the torch flames a zero-draw-call path.
6. **One vehicle grammar** (finding 5).
7. **Soft paint on the ground** (finding 6).
8. **One kind of people** (finding 7).
9. **A shadow for the hero,** as an owner A/B.
10. **Our own marks on the payoff screen.** The system emoji on the results card (trophy, gem, gift, house, car, popcorn) are a third art style on the screen where a child decides whether it was fun. Task #48 does not cover them.

Measured against the bars:
- **After items 0–4,** the worlds would hold Crossy Road's consistency and hole.io's clarity, with more charm than either.
- **The gap to Animal Crossing** would then be surface and light richness: a leaf pattern on one canopy mass (STATIC's procedural experiment) and runtime contact occlusion under props (LIGHT's occupancy-texture experiment).
- **The approved posters** are painterly, textured and warmly bounce-lit, and they will always promise more than a vertex-coloured world can deliver. The part of that promise we can keep is their colour and their light, which are findings 1 and 2.

### COVERAGE
**Images read** (all under qa/out/):
- The six required: shippedlook/maple_look.png, pirate_look.png, gameday_look.png, lantern_look.png, powder_look.png, and person/maple_front.png.
- Also: shippedlook/skylark_look.png, shippedlook/lantern_aaa1.png, person/maple_threequarter.png, menushot/fresh-worlds.png, menushot/fresh-menu.png, firstframe/maple_boot_430x932.png, dioshot/pirate.png, dioshot/lantern.png, endshot/maple-g1-win-phone.png, hudgoal/maple-g1.png, hudgoal/maple-g5.png.

**Crops and measurements** are in (the crew scratchpad — not in the repo)
- Crops of people, void bases, props, eyes, cars, planters, stains, edges and chalet windows (about 40 files).
- crop.cjs and stats.cjs (Lab, chroma, luminance).
- frame.cjs (per-world prop and ground shares, hero masked).
- glowluma.cjs (bloom luminance of every Lantern and Powder glow colour).

**Docs:**
- docs/STUDIO.md, whole.
- docs/HANDOFF.md §0–§8 (lines 1-377).
- docs/AAA-BRIEF.md §0–§4.1 and the §7 ledger (893-1054, 1268-1568).

**Code:**
- src/proto3d/palette.ts:1-260
- src/proto3d/island.ts: 1228-1417, 4300-4345, 4367-4382, 4495-4600, 4787-4887, 4905-5100, 5570-5675, 8050-8260, 8540-8565
- src/proto3d/mainstreet.ts:1640-1832
- src/proto3d/nightmarket.ts:40-200
- src/proto3d/alpine.ts:1-101
- src/proto3d/tailgate.ts:300-345
- src/proto3d/life.ts: 400-530, 620-622, 1250-1400, 3198
- src/proto3d/void3d.ts: 1185-1215, 2195-2240
- src/proto3d/gloss.ts
- src/proto3d/assets3d.ts: 1-30, 140-175
- src/prototype3d.ts: 150-260, 1400-1530, 1700-1760, 1866-1882, 2024, 2218-2262, 14880-14900
- index.html:1598-1760
- qa/pop.mjs, qa/food.mjs, qa/bloomtruth.mjs (header), qa/aamsaa.mjs, qa/gate.mjs (profiles)
- three's EffectComposer.js, OutputPass.js, RenderPass.js, LuminosityHighPassShader.js, and WebGLProgram's luminance().

**HEAD moved during this review** (f20e21c → dfbcd11). bb1430b (G10, MSAA) and 796a246 (G6, the new violet `#noms` HUD pill) landed after the pack, and neither has a frame, so under rule 1 I have not judged how #noms looks. Line numbers are cited against the working tree at 04:20.

**Not done:** no browser, build or Playwright. The planter-halo mechanism is inferred and needs the gloss-0 A/B. No frame in the pack shows a Maple driveway car.
