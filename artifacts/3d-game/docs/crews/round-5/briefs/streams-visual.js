export const meta = {
  name: 'streams-visual',
  description: 'Launch-brief streams C (sky), A1 (placement), B1 (light rungs 2+3), D (first frame + splash): each crew files an exact proposal, a skeptic tries to kill it',
  phases: [
    { title: 'Crew', detail: 'one crew per stream, worktree-isolated, measures and files an exact patch' },
    { title: 'Skeptic', detail: 'one adversary per proposal, applies the patch in its own worktree and re-measures' },
  ],
}

const MAIN = '/home/user/voidling/artifacts/3d-game'

const FACTS = `
THE STUDIO. You are one crew in a game studio shipping THE CUTE WORLD ENDER to
the App Store this week. The owner's standard: "At no point is good enough
acceptable. AAA quality only." Read, in this order, from the MAIN checkout
${MAIN}: docs/FABLE-LAUNCH-BRIEF.md (the brief you are executing — its stream
sections quote the owner verbatim), docs/GOVERNOR.md (standing rules, ledger,
retractions, the HANDS OFF list), docs/STUDIO.md (the CREWS pipeline). Every
rule in them was paid for with a mistake.

NON-NEGOTIABLE RULES: (1) no claim ships as fact until measured; (2) every fix
needs a probe that FAILS before it and passes after; (3) every number you write
down is one you actually ran — write the command next to it; (4) a probe reads
the thing itself, on the thing's own clock; (5) HANDS OFF items in GOVERNOR.md
(the fear face and eyes, camera shake at zero, powers off, the hand-authored
spawn, the approved splash art and posters, the seeded draws) are not yours.

TRAPS (each cost a day): three@0.185.1 forces NoToneMapping into a
WebGLRenderTarget, so a probe that renders its own frame sees NO ACES, NO
exposure, no sRGB — for anything about how it LOOKS, screenshot the CANVAS
(page.screenshot after a real frame). The match clock under swiftshader runs
14-40x slower than wall — sample on window.__matchState().t, never wall time.
mrnd/mr/mpick/mchance are ONE mulberry32 stream, Maple only: one added draw
shifts every later placement in that world. Other worlds use Math.random:
qa/lookpair.mjs takes SEED=<n> in the environment so two builds compare.
Playwright launches with executablePath '/opt/pw-browsers/chromium' and args
['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] — copy the pattern
from any probe in qa/. Debug surface on the page: window.__voidState,
window.__matchState(), window.__scene, window.__renderer, window.__dbg (grep
"_dbg\\." in src/prototype3d.ts for what it exposes).

GPU LOCK — mandatory around EVERY chromium run (probe, shot, gate). This is a
4-CPU box; two browsers at once make the GPU process fail and both report
failures that are not findings. Acquire, run, release in ONE shell command:
  while ! mkdir /tmp/gpu.lock 2>/dev/null; do
    [ -n "$(find /tmp/gpu.lock -maxdepth 0 -mmin +25 2>/dev/null)" ] && rmdir /tmp/gpu.lock && continue
    sleep 30; done; node qa/yourprobe.mjs ARGS; rmdir /tmp/gpu.lock
Hold it only for the browser run, never while you read or think. Another
workflow (six refuters) does not know this lock: also read the 1-minute load in
/proc/loadavg and wait while it is above 3.0.

YOUR WORKTREE. You run in a fresh git worktree (ROOT = output of
"git rev-parse --show-toplevel"); the game is ROOT/artifacts/3d-game. It has no
node_modules — symlink both before anything else:
  ln -s /home/user/voidling/node_modules ROOT/node_modules
  ln -s /home/user/voidling/artifacts/3d-game/node_modules ROOT/artifacts/3d-game/node_modules
Build ONLY there: cd ROOT/artifacts/3d-game && npm run build (about a minute;
never from the repo root). Typecheck: npm run typecheck. Serve YOUR build on
YOUR port: npx vite preview --config vite.config.ts --port PORT --strictPort
(background it; if the port is taken use PORT+10). Probes take a port argument
— read each probe's argv handling (lookpair is [port] [world] [tag]; most others
are [world] [port]); a probe that hardcodes 4177 you copy to your scratch dir
/tmp/crew-KEY/ and edit. The MAIN checkout's preview on :4177 serves the
UNPATCHED build at HEAD — that is your BEFORE, shared by everyone; never restart
it. NEVER modify a tracked file in MAIN. Your worktree is yours to patch, build
and measure. When you finish: kill your preview, then in the worktree:
rm -rf dist && git checkout -- . && git clean -fd.

WHERE FILES GO (absolute paths in MAIN — the governor commits from there):
  your proposal  ${MAIN}/docs/crews/round-5/KEY.proposal.md
  your shots     ${MAIN}/docs/crews/round-5/shots/KEY-*.png (at most 10; crop to what matters; 430x932 viewport)
  new probes     ${MAIN}/qa/<name>.mjs (NEW files only; copy into your worktree to run them)
Nothing else in MAIN.

INCREMENTAL RECORD — the previous launch of this round lost fifteen agents to
the account session limit with NOTHING on disk, because every crew planned to
write its file at the end. So: create your output file in MAIN (the path
above) within your first ten minutes, headed "# DRAFT — in progress (<key>)"
with the required sections as empty headings, and APPEND to it every time you
finish a measurement, a shot or a finding — numbers and commands as you get
them, not at the end. Replace the DRAFT header with the final one only when
you are done. If you are cut off, what is on disk is the record; a plan in
your head is not.

THE PROPOSAL FORMAT (the governor lands from it mechanically, so it must be
exact): "# PROPOSAL: <key>" / "## The owner's words" / "## What I measured"
(numbers + the commands) / "## What is wrong" (each item with file:line and the
shot that shows it) / "## The patch" (unified-diff hunks against HEAD, grouped
per independent change so the governor can land one group without the others,
each group naming the probe that fails before it and the number after) /
"## What I could not verify" (be honest — a skeptic will attack this file).
A crew that files a claim it did not measure has produced literature.
`

const SKEPTIC = `
YOUR POSTURE: you are the SKEPTIC. A crew has filed a proposal and your job is
to KILL it if it deserves to die. Read the proposal, then the real files on
disk at HEAD — not the proposal's account of them. Apply its patch hunks in
YOUR worktree exactly as written (a hunk that does not apply cleanly is a
correction to record); typecheck; build; serve on YOUR port; re-run the crew's
probe AND a measurement of your own design; shoot canvas frames for anything
visual and compare against the :4177 BEFORE at the same SEED. A verdict that
trusts the proposal is not a verdict. Then the sharper question: even if every
number is right, is this change the AAA thing — would the owner, who is about
to show this to strangers, see it as "made rather than generated"?
Verdicts: SOUND (you tried to kill it and failed — say what you tried), SOUND
WITH CORRECTIONS (each correction verbatim and mechanically applicable — a
replacement hunk, not advice), or KILLED (the specific fact, with the command
or file:line that proves it). Rule per hunk group: say which survive.
If the crew filed NOTHING_FOUND or BLOCKED, your job becomes the measurement
they did not finish: attempt the stream's core finding yourself, and rule on
their negative claim with your own evidence.
Write exactly one file: ${MAIN}/docs/crews/round-5/KEY.verdict.md —
"# VERDICT: ..." / "## What I ran" / "## What I checked on disk" /
"## Kill shots" / "## Corrections (verbatim)" / "## Per-hunk ruling".
Your shots go to ${MAIN}/docs/crews/round-5/shots/KEY-skeptic-*.png (at most 8).
`

const FILED = {
  type: 'object',
  properties: {
    status: { type: 'string', description: 'FILED | NOTHING_FOUND | BLOCKED' },
    proposalPath: { type: 'string' },
    probes: { type: 'array', items: { type: 'string' }, description: 'new probe files written, absolute paths' },
    shots: { type: 'array', items: { type: 'string' } },
    headline: { type: 'array', items: { type: 'string' }, description: 'each a measured number with the command that produced it' },
    summary: { type: 'string' },
  },
  required: ['status', 'proposalPath', 'probes', 'shots', 'headline', 'summary'],
}

const VERDICT = {
  type: 'object',
  properties: {
    verdict: { type: 'string' },
    killShots: { type: 'array', items: { type: 'string' } },
    corrections: { type: 'array', items: { type: 'string' } },
    ranProbes: { type: 'string', description: 'which probes you actually ran and what they printed' },
    hunkRuling: { type: 'string', description: 'per hunk group: SOUND / CORRECTED / KILLED' },
    summary: { type: 'string' },
  },
  required: ['verdict', 'killShots', 'corrections', 'ranProbes', 'hunkRuling', 'summary'],
}

const LANES = [
  {
    key: 'sky', port: 4180, sport: 4200,
    crew: `STREAM C — THE SKY. The owner, verbatim: "The space behind the island —
it's a vast improvement but there's still a lot of work. In some levels the
planet in the back is cut off, like an image was half cut and put on there. It
doesn't look crisp, it doesn't look real, it's all faded."

Take him literally. He is describing a SPECIFIC ARTEFACT, not a mood. Find it
and photograph it before proposing anything.

WHAT IS IN THE SOURCE (read these before anything else):
- src/proto3d/island.ts:866-966 — the SKIES table: per world, sky bodies as
  sprites at distance 620-900, elevation -56 to -77, azimuth AZ +/- 0.11,
  sizes 32-143; :966 marks planets (sp.userData.planet = true). Read what
  "el" means in that code and work out where a NEGATIVE elevation puts a
  body relative to the island's silhouette for a camera pitched 46-66 degrees
  down at azimuth 225.
- island.ts:470-481 — THE SKY TRAVELS WITH THE CAMERA: bodies are re-centred
  on the camera every frame; depth stays ON "so the island occludes what is
  behind it". A planet partly behind the island's coast, with depth on, is
  cut along the coastline — one candidate for "half cut".
- src/prototype3d.ts:585 — PerspectiveCamera(32, aspect, 1, 1000). Gameplay:
  azimuth 225, pitch 46.4-65.6 degrees, follow distance 26-340 units.
- THE INTRO IS A DIFFERENT CAMERA: prototype3d.ts:5553 sets introT =
  COPY.introLen ("orbital reveal: the world's landmark, then dive to the tiny
  void"); the swing is at :9316-9328; introLen per world is in the five COPY
  tables at :1290-1440 (2.2, 2.2, 3.4, 3.6, 3.5). Pitch swings 45 degrees in
  3.5 s and the HORIZON IS ON SCREEN at the opening beat in four of five
  worlds (GOVERNOR.md ledger — three files claimed the opposite for a week).
  Any visibility claim you make must state the follow-distance range AND
  whether it holds during the intro, or it is not a claim.
- Known, measured: planets occupy 3.6% of the visible sky band; the starfield
  is 5000 points. Prior sky probes to read, not trust: qa/spaceshot.mjs,
  qa/skypop.mjs, qa/_sky.mjs, qa/_skydump.mjs, qa/_skygrid.mjs, qa/_fgsky.mjs,
  qa/_gsky.mjs, qa/_zsky*.mjs, qa/_zskytex.mjs.

CANDIDATES TO CHECK RATHER THAN ASSUME, each with a shot that proves or clears
it: (a) a body clipped by the island silhouette (depth); (b) a sprite whose
texture/alpha edge is visible — a straight edge or a square corner on a round
body ("like an image was half cut"); (c) a body intersecting the viewport edge
so only a fraction of its disc shows — not a bug in code but reads as one when
the disc is large; (d) a billboard not facing the camera (are they
THREE.Sprite or meshes with lookAt?); (e) a texture sampled past its edge
(wrap/clamp); (f) far-plane clip at any camera distance across 26-340 AND the
end-of-match pull-back.

THE INSTRUMENT: write qa/skycut.mjs. For every world, across the intro swing
(sample u = 0, .25, .5, .75, 1 of introLen on the match clock) and across
gameplay follow distances (small, mid, max — set them through the debug
surface or by letting a match run), project every body's screen disc and test:
is any island pixel in front of it (read depth or compare the island's
projected silhouette), does its quad cross the viewport edge and by what
fraction, is its texture edge visible (sample the sprite texture's border
alpha). Print a table per world; the probe FAILS before your fix if any body
shows a hard edge or a silhouette cut in any sampled frame. Screenshot the
CANVAS for every failing frame — those crops are the finding.

"FADED" IS A SEPARATE COMPLAINT. The sky may be geometrically correct and
simply too weak. Measure in canvas screenshots (the real pipeline): each
planet's median luminance and its local contrast against the surrounding
space, per world; check the sprite material (opacity, blending — additive
over near-black is dim), scene.fog, any overlay drawn over the sky, tone
mapping compression, and the procedural texture itself (dump one). Propose the
"faded" fix as its OWN hunk group with before/after crops and the numbers, so
the governor can land it independently of the artefact fix.

Deliver the proposal. Shots: one contact sheet per world across the swing is
worth more than ten isolated frames.`,
    skeptic: `Kill angles for the SKY proposal: (1) the artefact they name — reproduce
it yourself on :4177 at the same world, same match time; if it needs a
specific follow distance or intro moment, does the proposal state it? A claim
without the radius range and the intro status is a kill of the CLAIM. (2) Did
the fix create a new cut — a body now clipped at the viewport edge, or one
that now intersects the island at a follow distance they did not sample (test
26, 120, 340 and the end pull-back)? (3) The "faded" hunk: is it visible on
the CANVAS or only in a render-target measurement? Do the planets now compete
with the island for attention — the sky is a backdrop and the island is the
subject; measure the planet's luminance against the island's brightest
props, and against the mascot. (4) Frame cost: 5000 stars plus bodies — did
they add draws or a per-frame allocation? Run qa/hitch.mjs or qa/_cpuframe.mjs
before and after. (5) Does anything in their probe read the render target
where it should read the canvas?`,
  },
  {
    key: 'placement', port: 4181, sport: 4201,
    crew: `STREAM A (first half) — PLACEMENT: every object earns the spot it is
standing on. The owner, verbatim: "Sometimes in certain levels the items may
be misplaced — you have trees on roads, the road may not be finished, item
placement isn't dialled in. That needs to get fixed. Every item needs a
purpose in terms of where it's at."

This is his sharpest, most concrete complaint, and NOBODY HAS EVER MEASURED
IT. Build the instrument first.

WHAT IS IN THE SOURCE: src/prototype3d.ts:6204 validateWorld() — a validator
already runs; :1616-1647 and :1756 expose __edibles, __insideIsland3 and
__validateWorld on the debug surface and the comment says they "power the
placement auditor" — find which probe that is (grep -l __validateWorld qa/)
and read what it checks. Then find what it does NOT catch, because that is the
list the owner is seeing. Prop placement lives in src/proto3d/island.ts (roads,
buildings, trees, benches, lamps, signs, the plaza) and world-specific files
(src/proto3d/tailgate.ts for Game Day, life.ts for the movers); props are
MERGED into shared geometry after placement (colour lives in vertex colours),
so the auditor must hook the placement DATA — positions, footprints, yaw, kind
— before the merge. If nothing exposes that list, your first hunk is an
additive, draw-free export on _dbg (for Maple it must not consume a single
mrnd draw: the seeded stream is HANDS OFF).

THE INSTRUMENT: qa/placement.mjs walks every prop in every world and reports,
per category with counts and the worst offenders: trees or props whose
footprint intersects a road (distance from the road centreline less than half
the road width plus the prop radius); props inside a building footprint; props
floating or sunk (compare y against the terrain sample at x,z); roads that end
in nothing (an endpoint that joins no road, building, plaza or coast); doors
that open onto a wall or another prop; benches and seats facing away from the
thing they should face (path, plaza, view); props in the lagoon or off the
island (insideIsland3 false); overlapping props (footprint intersection). Print
a table. The probe FAILS before your fix if any category is above zero — or,
if a category is legitimately non-zero by design, say why and set the bar you
can defend.

PHOTOGRAPH EVERY OFFENDER YOU PROPOSE TO FIX. The camera is fixed at 225
degrees and follows the void: move the void (window.__voidState x/z, or the
debug surface — read how qa/shot.mjs or qa/_offprops.mjs gets to a spot) to
each offender, wait a frame, screenshot the CANVAS and crop. A placement claim
that never opened an image is worthless.

THE FIX: prefer rules over hand-moves — a rejection or nudge in the placement
pass (the way validateWorld already works) that fixes the CLASS of error in
every world, not one tree. On Maple it must not add or reorder a seeded draw
(the whole town shifts if it does — compare the placement list before/after
and prove the only movers are the offenders). On Math.random worlds compare at
the same SEED. After the fix: the auditor at zero (or the defended bar) in all
five worlds, and after-shots of the same spots.

Deliver the proposal with the table, the shots, and the hunks grouped by rule.`,
    skeptic: `Kill angles for the PLACEMENT proposal: (1) run their qa/placement.mjs
on :4177 and on your patched build; do the counts move the way the proposal
says, in ALL five worlds? (2) Maple's seeded stream: diff the full placement
list before/after — if anything other than the named offenders moved, the fix
consumed or reordered a draw: KILL that hunk. (3) Their categories: pick three
offenders from their table and go LOOK at them on the canvas — is the
"tree on the road" really on the road, or is the auditor's road width wrong?
Then pick three spots their auditor calls clean and look for what it missed
(an auditor that passes a world the owner calls misplaced is the real bug).
(4) The nudge rule: where does a rejected prop go — did they delete it (a
thinner world), stack it on a neighbour, or push it into the lagoon? Count
props per world before/after. (5) Did the shared debug export add a per-frame
cost or a draw? qa/hitch.mjs before/after.`,
  },
  {
    key: 'rungs', port: 4182, sport: 4202,
    crew: `STREAM B (first half) — MATERIALS AND LIGHT: land RUNG 2 and RUNG 3 of
the light ladder. The owner: "The items need to be better, to be blunt. Better
shading. More realistic." Be careful with "realistic": this is deliberately a
soft toy world; he almost certainly means BETTER MADE, not photoreal. Settle
it with pictures, not argument.

WHAT IS ALREADY MEASURED (do not rediscover it — read docs/GOVERNOR.md and
docs/CREWS-ROUND-2.md:30-45):
- One directional light plus a weak environment gives GGX almost nothing to
  reflect. A roughness-0.55 remedy was proposed, tested and REFUTED — the lever
  is the rig, not the material.
- RUNG 1 (exposure column reaching the renderer) landed. The mascot imposes a
  ceiling of ~1.26 on any world's exposure (above it he stops being one colour
  across the game, 9.6 dE against a bar of 6). Rungs 2 and 3 do not touch
  exposure but they change his specular: RE-MEASURE his cross-world colour
  constancy after each rung (find the probe: grep qa/ for pairwise / heroswatch
  / voidab / formsep) and report the max pairwise dE; the repo bar is 6.
- RUNG 2 — src/proto3d/island.ts:4046: GLOSS_ENV = 5.0 -> 6.5. Read the comment
  at :4020-4048: GLOSS_RADIANCE multiplies only the IBL SPECULAR term
  ("radiance *= 1 + GLOSS_ENV * vGloss"), per vertex, so matte surfaces (70%
  of the world) render bit-identically and only glossy props (chrome bumper
  0.9, painted truck door 0.42, lantern glass) gain.
- RUNG 3 — src/prototype3d.ts:568-583: scene.environment is RoomEnvironment
  through PMREMGenerator at intensity 0.15. READ THE COMMENT AT :568-579
  CAREFULLY: a per-world PAINTED SKY environment was tried and REVERTED — it
  measured 15% darker on Game Day (whole-frame luminance 0.406 -> 0.343)
  because every world floats in the same near-black space. RUNG 3 as
  specified is NOT that: it is a purpose-built neutral 64x32 DataTexture
  VERTICAL GRADIENT (bright top, mid horizon, dark ground) through
  PMREMGenerator, replacing the grey box with a sky-shaped neutral so
  highlights sit on top of props and dark reflections underneath — with a
  K-PARITY KILL GATE: if any world's median tonal K moves more than the gate
  allows, the rung dies. Find how the repo defines K (grep qa/ and docs/ for
  "tonal K", "median K", qa/_zgrade.mjs, qa/shading.mjs) and pre-register the
  gate number BEFORE you measure. Do NOT re-run the painted-sky experiment.

THE INSTRUMENT: qa/glossab.mjs, qa/glosscov.mjs, qa/glossgap.mjs exist — read
them; if none gives a per-prop specular metric on the CANVAS, write
qa/rung.mjs: for Maple and Lantern at the same SEED, in a canvas screenshot,
mask the glossy props (a car, a lantern, a bumper, a window) and report the
highlight pixel count above a luminance threshold and the highlight's peak,
plus whole-frame luminance and the K figure per world, before and after each
rung. The probe FAILS before the rung (highlight count below your bar) and
passes after; the K gate must PASS after.

DELIVER: rung 2 as one hunk group, rung 3 as another, each with before/after
canvas CROPS of the same glossy props at the same SEED, the numbers, the
mascot dE, and the K parity table for all five worlds. Then an art-director's
paragraph per rung: what changed to the eye, and whether it reads "better
made" or just "shinier" — if rung 3 makes the toy world look wet, say so and
recommend against it. Shoot options; the owner chooses.`,
    skeptic: `Kill angles for the RUNGS proposal: (1) K parity — recompute the K
figures yourself on all five worlds at the same SEED on :4177 and your patched
build; if any world moves past the pre-registered gate, that rung is KILLED
and no argument revives it. (2) The mascot: max pairwise dE across worlds
before/after with the repo's probe; bar 6. (3) Matte parity for rung 2: the
comment claims matte vertices render bit-identically — diff canvas pixels in a
matte region (a roof, a canopy) before/after at the same SEED; any change
above screenshot noise means the claim is false. (4) The measurement trap: did
any of their numbers come from a render target rather than the canvas? (5)
Look at the crops as an art director: does rung 3 make the props look wet or
plastic? Does the gradient environment put a bright reflection on the
UNDERSIDE of anything (a sign the map is upside down)? (6) Cost: PMREM at
startup — measure boot time with qa/_boottime.mjs before/after.`,
  },
  {
    key: 'firstframe', port: 4183, sport: 4203,
    crew: `STREAM D — THE FIRST FRAME, plus the splash. Nobody has ever
art-directed the establishing shot, because everyone believed it used the
gameplay camera. It does not. It is the first thing a player sees, the frame
an ad opens on, and it is currently unreviewed. The owner's acceptance test:
"I want one really good pass on everything, so people see this game and they
want to play it, and we can create really awesome videos for ads." Would a
stranger scrolling the App Store stop on this frame, and could you cut an ad
from it?

WHAT IS IN THE SOURCE: src/prototype3d.ts:5553 — introT = COPY.introLen
("orbital reveal: the world's landmark, then dive to the tiny void"); the
swing at :9316-9328 (k2 and u are introT/introLen); the five COPY tables at
:1290-1440 carry introLen (2.2, 2.2, 3.4, 3.6, 3.5) and each world's
landmark/hero coordinates. Pitch swings 45 degrees in ~3.5 s and the horizon
IS on screen at the opening beat in four of five worlds (GOVERNOR.md ledger).
resetMatch sets the camera offset (0.62, 0.92, 0.62) and camFollow. Gameplay
after the intro: azimuth 225, pitch 46.4-65.6, FOV 32.

PART 1 — THE ESTABLISHING SHOT. Shoot the intro in all five worlds at u = 0,
.25, .5, .75, 1.0 of introLen, sampled on the match clock (it runs 14-40x slow
under swiftshader, which makes this easy), CANVAS screenshots; one contact
sheet per world to shots/. Judge every opening frame as an art director:
where is the landmark in the frame (thirds, headroom), what is cut off at the
edges, how much of the frame is empty space or the black band, is the space
band a good backdrop or a hole, does the void read at the end of the dive, is
anything popping in during the swing (props, LOD rings, shadows snapping —
qa/roundlod.mjs and the LOD code know the rings), is the HUD or a banner
covering the shot. Then propose per-world start pose (pitch, azimuth,
distance), easing and a hold beat as exact hunks — the intro is a DIFFERENT
camera so gameplay framing (HANDS OFF: camera shake stays zero) is untouched.
Before/after contact sheets. Probe: qa/firstframe.mjs that shoots u=0 for
every world and asserts what you can measure (landmark bounding box inside the
frame with margin, black-band fraction under a bar, no HUD over it).

PART 2 — THE SPLASH. The owner's screenshot is at
docs/owner-2026-08-29-splash.png (his item 8: the "THE CUTE" line is faded).
Find the splash markup in index.html and the splash probe qa/splash.mjs.
Measure the contrast of "THE CUTE" against the REAL PIXELS behind the glyphs,
not the CSS colour: screenshot the splash at 430x932, take the element's
bounding box, sample the glyph pixels (the rendered text colour) and the
artwork under the box (shoot once with the text hidden by a style override),
and compute the WCAG contrast ratio; do the same for the title line below it
so you can say why one reads and the other does not. Also: the title appears
TWICE in that frame — identify both instances (one may be painted into the
artwork) and propose which to keep. The splash ARTWORK IS APPROVED by the
owner and HANDS OFF — change the type treatment only (weight, size, plate,
scrim, shadow, position) as CSS hunks, with before/after crops and the
after-contrast number. Bar: 4.5:1 minimum; say what you reached.

Deliver one proposal with two hunk groups (intro camera per world; splash
type).`,
    skeptic: `Kill angles for the FIRSTFRAME proposal: (1) re-shoot u=0 and u=1 for
all five worlds on your patched build at the same SEED; does the new pose
land on the gameplay camera cleanly at the end of the swing, with no jump cut
(compare the last intro frame and the first gameplay frame — any pose
discontinuity is a kill)? (2) The teaching hand and the DRAG pill on Maple
must still appear after the intro (qa/mapleteach.mjs) — if a longer intro or
hold breaks controlsLive timing, kill. (3) Did they touch gameplay framing?
Diff the camera pose 5 s into a match before/after. (4) The splash: recompute
the contrast on the real pixels yourself; check the treatment on the
430x932 viewport AND a wider tablet aspect (1024x1366) — a plate that fits
a phone can cover the artwork's face on a tablet. (5) Is the artwork
untouched — md5 the image files. (6) Judge the contact sheets: would you cut
an ad from the after-frame? Say which world's first frame is still the
weakest.`,
  },
]

const runCrew = (l) => agent(
  `${FACTS.replaceAll('KEY', l.key).replaceAll('PORT', String(l.port))}

${l.crew}

Return the structured result when your proposal file is written.`,
  { label: `crew:${l.key}`, phase: 'Crew', schema: FILED, isolation: 'worktree' },
)

const runSkeptic = (filed, l) => agent(
  `${FACTS.replaceAll('KEY', l.key).replaceAll('PORT', String(l.sport))}
${SKEPTIC.replaceAll('KEY', l.key)}

THE PROPOSAL UNDER ATTACK: ${MAIN}/docs/crews/round-5/${l.key}.proposal.md
(crew status: ${filed ? filed.status : 'UNKNOWN — the crew agent died; treat as BLOCKED'}).
Crew headline claims: ${filed ? JSON.stringify(filed.headline) : '[]'}.
Crew probes: ${filed ? JSON.stringify(filed.probes) : '[]'}.

${l.skeptic}

Return the structured verdict when your verdict file is written.`,
  { label: `skeptic:${l.key}`, phase: 'Skeptic', schema: VERDICT, isolation: 'worktree' },
)

const results = await pipeline(
  LANES,
  (l) => runCrew(l),
  (filed, l) => runSkeptic(filed, l).then((v) => ({ filed, verdict: v })),
)

const out = {}
LANES.forEach((l, i) => { out[l.key] = results[i] })
const dead = LANES.filter((l, i) => !results[i]).map((l) => l.key)
if (dead.length) log(`lanes with no result (agent died or was skipped): ${dead.join(', ')}`)
return out