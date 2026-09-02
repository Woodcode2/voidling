export const meta = {
  name: 'streams-content',
  description: 'Launch-brief streams A2 (purpose), B2 (saturated albedos), the newsroom rewrite, the sixth-world design, and the name memo',
  phases: [
    { title: 'Crew', detail: 'purpose, albedo and newsroom crews file exact proposals; world6 and name are memos' },
    { title: 'Skeptic', detail: 'one adversary per proposal' },
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

const MEMO = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    recommendation: { type: 'string' },
    summary: { type: 'string' },
  },
  required: ['path', 'recommendation', 'summary'],
}

const LANES = [
  {
    key: 'purpose', port: 4184, sport: 4204,
    crew: `STREAM A (second half) — PURPOSE. The owner, verbatim: "Every chat
bubble, every person moving, there's got to be a purpose behind that. Make the
world feel more alive." Today the crowd wanders and speaks from a pool. Ask
what each townsperson is DOING: going somewhere, doing a job, reacting to the
hole. Forty people with errands reads alive; forty people drifting reads like
a screensaver — and it is the same forty people either way. The cheapest
version of this is not more people, it is DESTINATIONS.

WHAT IS IN THE SOURCE: src/proto3d/life.ts:2557 the wanderer (pedestrians,
animals, event NPCs); life.ts:4570-4590 — a ROUTE system already exists:
route(), routeAt(), onTrack(mesh, route, speed, t0, vehicle, scare=22, boost)
puts an object on a route, and "people hand control back to their wanderer
when the void closes in (so they scatter); vehicles floor it". Read who is on
a route today and who merely wanders, per world (census: count movers by
kind and by mode). src/proto3d/bubbles.ts:19 say() — how a line is chosen
from the pool, its cooldowns, and the duty-cycle gag (a banner up discards
bubbles — see the comment near prototype3d.ts:3130). life.ts:5063 the mayor on
the stage; life.ts:4208 Maple's mover column. Per-frame cost matters: the
movers already have a budget; find it (grep budget / cap / MAX_MOVERS) and
keep the frame cost flat.

THE DESIGN: an ERRAND table per world — each wanderer gets a purpose drawn
from it: home -> shop -> bench -> stage; a dog walker's loop; a mail carrier;
kids to the playground; a shopkeeper who sweeps outside the door; a queue at
the food stand; a couple on a bench that turns to face the void when it is
near. A destination is a point on the existing route graph or a prop
(benches, doors, stalls, the plaza) — reuse what placement already put there.
Bubble lines become CONSEQUENCES of the errand ("late for the market!", "the
bench is MINE") chosen from the errand's own line-set, not the global pool;
keep the reactions to the void (they are the best lines in the game and they
must still win when the void is near). Kid-safe, funny to a six-year-old,
readable in the bubble's measured fit.

Seeded-draw rule: on Maple do NOT draw from mrnd for any of this — use a
separate stream seeded from the world id so the town does not shift (prove it:
placement list identical before/after). The panic/scatter when the void closes
(scare radius 22) must still fire — measure it.

THE INSTRUMENT: qa/purpose.mjs — per world: fraction of movers that have a
destination, fraction actually heading toward it (heading dot direction-to-
destination > 0.7 sampled over 20 match-seconds), fraction of bubbles whose
text came from an errand line-set vs the global pool, and per-frame CPU
(qa/_cpuframe.mjs or qa/hitch.mjs) before/after. FAILS before (destinations
near 0%), passes after with the numbers you set as the bar.

Shots: a plaza before/after at the same SEED with movers annotated by their
errand (draw the labels in the probe, not by hand). Deliver the proposal with
the census, the errand tables, the hunks, and the numbers.`,
    skeptic: `Kill angles for the PURPOSE proposal: (1) run qa/purpose.mjs on :4177
and on your patched build — do the numbers move as claimed, in every world?
(2) Maple: diff the placement list and the first 200 mrnd draws before/after;
any shift is a KILL of the whole thing. (3) The scatter: park the void next to
a crowd and confirm they still panic and run (before/after, same SEED). (4)
Frame cost: qa/hitch.mjs before/after; a destination search per frame across
forty movers is the classic regression — find where the destination is chosen
and how often. (5) Watch a plaza for 60 match-seconds: do people actually
ARRIVE and do something, or do they walk to a point and stand? A destination
with no arrival behaviour is a screensaver with extra steps. (6) Read every
new bubble line as a parent: kid-safe, no brands, funny, fits the bubble
(qa/bubbleclear.mjs, qa/_mvbubble.mjs).`,
  },
  {
    key: 'albedo', port: 4185, sport: 4205,
    crew: `STREAM B (second half) — THE SATURATED-ALBEDO AUDIT. Game Day's crimson
was just fixed at the albedo (src/proto3d/tailgate.ts: CRIM = 0xc4453f, CRIM_D
= 0x92312d, with a derivation comment — read it): below a LINEAR green/red
ratio of ~0.08 the pipeline destroys the green channel and the surface cannot
shade — it renders as a flat blob with no form, which is exactly what the owner
calls "not realistic". Game Day was found by COMPLAINT, not by search, so
assume there are others. The owner chose the Game Day value himself; you
propose values, he chooses.

THE AUDIT, two ways because props are merged and colour lives in vertex
colours: (a) SOURCE — every hex literal and colour table in src/proto3d/
(island.ts, life.ts, tailgate.ts, palette.ts, rivals.ts, the world tables in
prototype3d.ts:1290-1440): convert to linear, compute each secondary channel's
ratio to the dominant channel, flag anything with a ratio below 0.08 (pure
reds, pure blues, pure greens, deep magentas), and note where it is used and
in which worlds. (b) RUNTIME — qa/gamutzero.mjs exists and was recently
repaired: read what it measures (it sounds like this audit); qa/_matcensus.mjs
and qa/_palette.mjs too. Walk the scene's geometry colour attributes and
material colours per world and list the surfaces that trip the threshold, with
their pixel area on screen in a canvas shot (a flagged colour on 12 pixels
does not matter; on a roof it does).

THEN PROVE THE SYMPTOM before proposing: for the worst five offenders, in a
CANVAS screenshot, measure the luminance range across the surface's pixels
(a shading surface has a lit side and a shadow side; a dead one is flat).
Report the range for Game Day's fixed crimson as the reference.

THE FIX: hue-preserving lifts using the CRIM derivation method (lift the
dead secondary channel to clear the ratio, keep the hue and the perceived
saturation as close as possible; give the exact hex, the linear ratios, and
the CIE Lab dE from the original). Each colour its own hunk so the governor
can land them one at a time. Before/after crops at the same SEED with the
luminance range numbers. Probe: qa/albedo.mjs (or gamutzero extended) FAILS
before with the offender list and passes after.

Do NOT touch the mascot's colour, the ring meaning colours (DANGER/PRIZE/SAFE
— they are chosen for dE against each other, see qa/ringmeaning.mjs), the
sibling FAMILY_INK table, or the sky. Deliver the proposal.`,
    skeptic: `Kill angles for the ALBEDO proposal: (1) recompute the linear ratios
for every proposed hex yourself; a lift that clears 0.08 by moving hue more
than ~4 degrees or dropping chroma so the thing reads pink instead of red is
a KILL of that hunk — this is a picture-book world and its reds must stay
red. (2) The symptom: re-measure the luminance range on the canvas for three
of their offenders before/after at the same SEED; if the surface was already
shading (range above their own bar), the fix was unnecessary and the hunk is
KILLED. (3) Collateral: a colour table may be shared — grep every use of each
changed constant; a lift on a roof that also changes a sibling's ring or a
HUD colour is a kill. (4) The mascot and ring-meaning colours must be
untouched: qa/ringmeaning.mjs and the mascot constancy probe before/after.
(5) Is their runtime audit reading the render target where it should read
the canvas?`,
  },
  {
    key: 'newsroom', port: 4186, sport: 4206,
    crew: `THE NEWSROOM REWRITE. The owner, verbatim (docs/OWNER-2026-08-29.md,
item 3): the news is "sloppy" and "not fun" — "Get a serious writer that would
[work] on triple A games." A crew filed docs/crews/round-4/newsroom.proposal.md
and it was never ruled on: read it, keep what is good, and rewrite the rest.
The noun problem ("the hole" 69 times) was already fixed — do not relitigate
the noun; find what the news is called now and use it.

FIND THE COPY: grep src/ for the news source (the ticker/newsroom module, the
COPY tables at prototype3d.ts:1290-1440 carry newsGap and signOn per world;
qa/newsarc.mjs, qa/newsstyle.mjs, qa/_news.mjs measure the arc and the fit).
Read how lines are chosen (per phase of the match? by score? by what was just
eaten?), the fit width the ticker can show, and the cooldowns.

THE VOICE: write a three-rule voice bible first and put it at the top of the
proposal. A world-ending event covered by a small-town news desk that refuses
to panic: deadpan, specific, local, escalating. Every line must be (a) funny
to a six-year-old AND to the parent reading over the shoulder, (b) about a
THING in the world (a named shop, the mayor, the bus, the football team, the
lanterns — each world's own props; the crew that placed them wrote their
names), (c) short enough to fit the measured width with no ellipsis, (d)
kid-safe: no real brands, no real people, no violence beyond cartoon peril,
no politics, no death. The ARC across a match: early = local colour and
weather; mid = alarm with dignity; late = apocalypse-lite comedy, the desk
still filing. Reactive lines (what was just eaten, a rival passing you) are
the best real estate — write them for the actual event types the code fires.

DELIVER: the full replacement copy as exact hunks against the copy tables,
per world, with per-line character counts against the measured fit; run
qa/newsstyle.mjs and qa/newsarc.mjs on your build and paste the output; a
probe qa/newsfit.mjs if the fit is not already asserted. A world is not done
until every line in it would make a stranger in the App Store preview video
smile.`,
    skeptic: `You are the EDITOR, and you are hard to please. Kill angles for the
NEWSROOM proposal: (1) read every line cold; any line that is not clear on
first read, not funny, or not about a thing in that world is struck — list
them verbatim with a replacement (a struck line without a replacement is
advice, not a correction). (2) Kid-safety: brands, real people, anything a
parent would frown at. (3) Fit: run qa/newsstyle.mjs and your own width check
on the canvas at 430x932 — any ellipsis or overflow is a kill of that line.
(4) The arc: does the late-match copy escalate, or is it the same joke three
times? (5) Repetition in a real match: how many distinct lines does a child
actually see in one three-minute match, and how often does one repeat? Play
one on your build and count. (6) Does the copy still read once the surge,
the family rivals and the crown cards fire — or does it talk over them?`,
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

const WORLD6 = `${FACTS.replaceAll('KEY', 'world6').replaceAll('PORT', '0')}

THE SIXTH WORLD — DESIGN ONLY. The owner asked for a sixth world; the brief
(docs/FABLE-LAUNCH-BRIEF.md section 0) allows it to be DESIGNED this week and
built only if the four refinement streams are green first. Design costs
nothing; a half-built world in the shipping bundle costs everything. You do
NOT build, patch, or run a browser. You do not need a worktree, node_modules,
or a port — ignore those parts of the environment notes; work in MAIN,
read-only, and write ONE file.

READ THE FIVE WORLDS FIRST so the sixth belongs to the same game: the five
COPY/WORLD tables at src/prototype3d.ts:1290-1440 (par scores, introLen,
newsGap, hero coordinates, landmark), the per-world sections of
src/proto3d/island.ts (palettes, props, the SKIES table at :866), tailgate.ts
(how a themed world is built as a layer over the island), the posters and
splash art (find them: grep -ril poster docs/ public/ src/ | head), the
progression ladder (Maple is always the intro/tutorial world; the others get
harder — find how difficulty scales: par, rival lane, edible density), and
the owner's words in docs/OWNER-2026-08-29.md. Respect the palette rule from
the Game Day crimson: every saturated accent needs a linear secondary/
dominant ratio above ~0.08 or it cannot shade.

DELIVER ${MAIN}/docs/crews/round-5/world6.design.md: (1) the name and a
one-line premise a child can repeat; (2) why THIS world is the sixth — what
it adds to the ladder (a new visual register the five do not have, a new
difficulty beat, a reason a video of it stops a scroll); (3) palette: space
tint, ground, three accents, as hex with the linear ratios computed; (4) the
landmark the establishing shot dives past and its coordinates on the island
grid the way the other tables express them; (5) a prop list of 15-25 with a
PURPOSE next to each (the placement stream is about to enforce that); (6)
crowd errands — who lives here and what they are doing (the purpose stream's
errand-table format); (7) three sky bodies in the SKIES table's terms; (8)
music mood and the intro beat; (9) par score and the ladder position; (10)
ten newsroom lines in the newsroom voice; (11) ONE poster concept as an
art-direction paragraph plus a composition in words; then, ONLY IF the
Higgsfield image tools are reachable (ToolSearch for generate_image), ONE
image in the style of the existing posters saved as
${MAIN}/docs/crews/round-5/world6.poster.png — one image, no iterations;
skip silently if the tool is not there. (12) An honest cost: the file list
and rough line counts a build would touch, from how tailgate.ts did it.`

const NAME = `${FACTS.replaceAll('KEY', 'name').replaceAll('PORT', '0')}

THE NAME. The owner wants one and none is settled: "voidling", "the void" and
"cuboid" are all live in the repo and in his messages. The hero is a small
purple sphere with a face who eats a town; the working title is THE CUTE
WORLD ENDER. You do NOT build or run a browser; no worktree, no port — work
in MAIN read-only and write ONE file. You may use WebSearch (ToolSearch for
it) to check what already exists.

TEST EVERY CANDIDATE, the three above plus up to five of your own, against:
(1) the App Store listing — title 30 characters max, a subtitle, how it reads
next to the icon, and what a search for it returns today (existing apps or
games with the same or a confusable name — search and record what you
found); (2) a six-year-old saying it to a friend — syllables, whether it can
be shouted, whether it sounds like what you DO in the game; (3) the hero —
does the name belong to him, to the act of eating, or to the world; (4) ad
copy — the one line under the name in a video; (5) trademark red flags
(generic words, famous marks nearby — be honest that this is not legal
advice); (6) how it sits with the five worlds and the family of rival voids
(their names are in src/proto3d/rivals.ts).

DELIVER ${MAIN}/docs/crews/round-5/name.memo.md: a table, one line of verdict
per candidate per test, a ranked recommendation with the App Store title +
subtitle written out for the top two, and the single sentence you would say
to the owner. No skeptic follows you: the governor and the owner are the
judges, so do not pad.`

phase('Crew')
const [laneResults, world6, name] = await Promise.all([
  pipeline(
    LANES,
    (l) => runCrew(l),
    (filed, l) => runSkeptic(filed, l).then((v) => ({ filed, verdict: v })),
  ),
  agent(WORLD6, { label: 'design:world6', phase: 'Crew', schema: MEMO }),
  agent(NAME, { label: 'memo:name', phase: 'Crew', schema: MEMO }),
])

const out = { world6, name }
LANES.forEach((l, i) => { out[l.key] = laneResults[i] })
const dead = LANES.filter((l, i) => !laneResults[i]).map((l) => l.key)
if (dead.length) log(`lanes with no result (agent died or was skipped): ${dead.join(', ')}`)
return out