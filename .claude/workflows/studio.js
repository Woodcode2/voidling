export const meta = {
  name: 'studio',
  description: 'The eight specialist teams review their own surface against a named bar, a skeptic refutes each, and art direction judges whether it reads as one game',
  whenToUse: 'Before anything visual goes live. See artifacts/3d-game/docs/STUDIO.md. Run qa/lookbook.mjs first — teams may not review a surface they have not seen rendered.',
  phases: [
    { title: 'Review', detail: 'each team judges its own surface against the best in the world' },
    { title: 'Refute', detail: 'an independent skeptic tries to kill every finding' },
    { title: 'Direct', detail: 'art direction asks whether it reads as one game' },
    { title: 'Govern', detail: 'the order of work, and what blocks' },
  ],
}

const ROOT = '/home/user/voidling/artifacts/3d-game'

const CHARTER = `THE STUDIO — you are one team in it. The charter is ${ROOT}/docs/STUDIO.md.

THE GAME: "THE CUTE WORLD ENDER", a hole.io-style 3D game for children aged 6-11.
You are a small purple void with a face; you roll around a town swallowing
everything smaller than you; in three minutes you eat a whole world while an
in-world newsroom reports on you and five family-member rivals race you.
Three.js + TypeScript + Vite, no engine. Ships to iOS via Capacitor and to web.

THE OWNER'S MANDATE, in his words: "I want a full billion-dollar team that can do
its due diligence, vet, and fix. Nothing sub-par passes them. They're always
asking is this the best visually, if not they figure out how to get there."

His standard is a top-10 App Store game. He playtests on a real iPhone with his
young daughter. He has twice now caught visual failures that passed every
automated gate in the repo, so assume the gates do not protect you.

REPO ROOT: ${ROOT} — cite paths relative to it (src/proto3d/life.ts:1234).
Use absolute paths when you actually call a tool.

READ FIRST:
  docs/STUDIO.md       the charter, the four rules, and why this exists
  docs/HANDOFF.md      standing directives, the code map, the traps
  docs/AAA-BRIEF.md    §2 the six absences, §4 the six fronts, §7 the ledger of
                       every change already made and its measurement

THE FOUR RULES (charter §"The four rules"):
  1. LOOK AT THE PIXELS. You MUST Read the images listed for you below before
     you write a word. Two shipped failures came from reading code and never
     looking: eyes verified from behind that turned out to be white balls on the
     sides of heads, and leaf litter verified by luminance mean that read as
     spilled coffee on a pale plaza. Both passed every gate.
  2. NAME THE BAR. "It looks cheap" is not a finding. Cite a SHIPPED title and
     what it does mechanically, then measure us against it.
  3. THE FIX, OR THE PATH TO IT. NO-SHIP owes either the smallest change that
     closes it, or the experiment that would find out.
  4. A GATE, OR IT COMES BACK. Every fix names a probe in qa/ that would fail on
     today's build and pass after.

HARD CONSTRAINTS — a proposal that breaks one of these is worthless:
  - DO NOT EDIT ANY FILE. You review; the governor implements.
  - DO NOT run Playwright, start a browser, or build. 4 CPUs, and the governor is
    running measurements. You MAY Read .png files — you are required to.
  - DETERMINISM: the town must be identical every load. mrnd()/mr()/mpick() run
    off a seeded stream and mainstreet.ts:252 warns that adding or removing ONE
    draw "would shift every subsequent authored placement in Maple Falls". Any
    proposal that adds a seeded draw must say so and justify it. Hashing from
    values already in hand costs no draw — that is the pattern used elsewhere.
  - BUDGET: 60fps on iPhone 13, 450 MB JS heap worst world (Game Day is at ~446,
    and an audit found 84% of it is CPU-side vertex data). Props are merged to
    ONE draw call each; a proposal that adds draw calls or materials per instance
    must count them. Triangles are cheaper than draw calls here, but not free.
  - DELIBERATE DECISIONS, not defects: camera shake is ZERO by absolute owner
    order (fx.kick/fx.shake/camPunch are no-ops on purpose); POWERS_ON=false;
    spawn and the opening are hand-authored and identical every load; the splash
    art and world-picker posters are APPROVED and must not be changed; the void's
    purple identity is owner-approved.

OUTPUT — plain markdown, no JSON:

## VERDICT: SHIP or NO-SHIP
One sentence on why.

## THE BAR
The shipped title you measured against, what it does mechanically, and where we
sit against it.

## FINDINGS
### <short title>
SEVERITY: blocker | major | minor | polish
AT: <path>:<line>
SAW: what you saw in which image, by filename. If it is only visible in code,
     say so and say why the render does not show it.
EVIDENCE: the actual line(s), quoted
FIX: the smallest change that closes it, with its cost in draw calls/triangles
GATE: the probe that fails before and passes after

## IS THIS THE BEST THIS CAN BE?
If no: what is between here and there, ranked. If yes: why you believe that,
against the bar you named. This section is the mandate — do not skip it.

## COVERAGE
The files you read and the images you looked at.`

const TEAMS = [
  { key: 'static', name: 'TEAM STATIC',
    images: ['qa/out/shippedlook/maple_look.png', 'qa/out/shippedlook/lantern_look.png', 'qa/out/shippedlook/powder_look.png'],
    brief: `YOU OWN EVERYTHING THAT STANDS STILL: buildings, landmarks, trees, bushes,
signage, street furniture, props.

Files: src/proto3d/island.ts (the prop builders — makeTree, makePine, makeBush,
makeFlowers, makeHouse, makeRowBuilding and the ~50 landmark builders — plus the
per-world populate blocks), src/proto3d/mainstreet.ts (Maple's kit, including
makeMapleTree and personParts' props), luxe.ts, alpine.ts, nightmarket.ts,
tailgate.ts.

Recent work you are judging, not repeating:
  - makeBush was ONE squashed sphere and is now three merged lobes.
  - makeMapleTree was seven large smooth spheres reading as a balloon cluster; it
    is now six mains + six darker satellites + a lit crown, and the seeded draw
    order was deliberately preserved.
  - signs had one fat white bar for text; they now carry rows of varying length.
  - props with no front are turned by a position hash (87% shared one facing).

Judge specifically:
  - SILHOUETTE. At the play camera, does each prop class read as the thing it is,
    or as the primitive it is made of? Which classes still read as primitives?
  - REPETITION. What is still obviously the same object over and over?
  - SCALE AND COMPOSITION. Do the big props dominate correctly, or bully the frame?
  - THE UNFINISHED. Anything that reads as placeholder — blank faces, untextured
    slabs, things that float, things with no contact with the ground.
  - island.ts is 6.7k lines and mainstreet.ts 1.5k. You will not read it all;
    read the builders for whatever you can see failing in the images.` },

  { key: 'motion', name: 'TEAM MOTION',
    images: ['qa/out/person/maple_front.png', 'qa/out/person/maple_threequarter.png', 'qa/out/person/maple_side.png', 'qa/out/person/maple_back.png', 'qa/out/shippedlook/gameday_look.png'],
    brief: `YOU OWN EVERYTHING THAT MOVES: crowd people, vehicles, animals, the rival
voids — their silhouettes, poses, variety and animation.

Files: src/proto3d/life.ts (5.5k lines — makePerson, the mover system, flee/greet
behaviour, every spoken line, per-world set pieces), src/proto3d/rivals.ts,
and personParts in src/proto3d/mainstreet.ts (the STATIC townsfolk, which are
your problem too because they are people).

THE CHARACTER SHEET IS YOURS. qa/personsheet.mjs turns people to face the camera
on purpose, because the crowd walks AWAY from a camera that follows the void and
a play screenshot cannot answer this. Four angles are in your image list. The
front and side ones are where the last failure was found.

Recent work you are judging, not repeating:
  - Crowd and townsfolk had NO faces at all. White-sclera eyes were tried and
    were a disaster — pale spheres breaking the head silhouette, "eyes that pop
    out" in the owner's words. They are now small DARK marks sitting nearly
    flush, sized against the head's own surface arithmetic.
  - personParts gained shoes, hands, hair, per-person height jitter and aimed
    arms so no two stand identically. Its limbs used to sit along world X
    regardless of facing.
  - A shirt colour was also a skin tone, producing monochrome people.

Judge specifically:
  - Do these read as PEOPLE at the play camera, or as clothespin dolls?
  - The walking crowd (life.ts makePerson, ~3900 verts, tapered limbs, garments,
    nine hairstyles) versus the static townsfolk (personParts, simpler): do they
    read as the same species standing side by side? They did not before.
  - POSE AND LIFE. Everything stands; nothing leans, sits, points or gathers.
    What would buy the most life per triangle?
  - Vehicles and animals: are they up to the same standard as the people?` },

  { key: 'ground', name: 'TEAM GROUND',
    images: ['qa/out/bake/maple.png', 'qa/out/shippedlook/maple_look.png', 'qa/out/shippedlook/pirate_look.png'],
    brief: `YOU OWN THE LARGEST SURFACE IN EVERY FRAME. A player stares at the ground
for three minutes.

Files: the bake in src/proto3d/island.ts (a 3072px canvas: base fill, per-biome
block fills, roads, crosswalks, district painting per world, then the shader
detail layers — speckle, mottle, and the per-world GRAIN weights), palette.ts.

YOUR OWN TEXTURE IS IN YOUR IMAGE LIST: qa/out/bake/maple.png is the actual baked
canvas, 3072px, before any prop stands on it. Nobody had ever looked at it until
the day this studio was formed.

THE TEXEL BUDGET IS THE CENTRAL FACT and it is measured: 3072px across ~650 3D
units is 4.7 texels per unit, while the play camera shows ~50 css px per unit —
the ground is magnified about ELEVEN TIMES on screen. A real maple leaf is ONE
TEXEL. That is why leaf litter is painted as DRIFTS and not as leaves, and why
anything authored here has to live at the patch scale, not the grain scale.

Recent work you are judging, not repeating:
  - Maple's lawns were flat colour: the base mottling is overpainted by the
    opaque per-biome fills in exactly the park blocks the match opens in. Large
    tonal patches and leaf drifts were added.
  - Leaf drifts were first painted on paved blocks too and read as STAINS on the
    pale plaza — spilled coffee. They are now grass-only, fewer, and fainter.
  - qa/ground.mjs reports Maple as "has texture at play distance" and is not
    wrong: it measures GRAIN. It has never been able to see composition. Treat
    its verdict as evidence about one frequency band only.

Judge specifically:
  - Roads, kerbs, paths: hard aliased edges, or transitions?
  - Do the five worlds' grounds read as five different places?
  - Water, sand, snow, flagstone — which ones are convincing and which are paint?
  - Contact: do props sit ON the ground or float above a blob shadow?` },

  { key: 'light', name: 'TEAM LIGHT',
    images: ['qa/out/shippedlook/maple_look.png', 'qa/out/shippedlook/lantern_look.png', 'qa/out/shippedlook/powder_look.png', 'qa/out/shippedlook/gameday_look.png'],
    brief: `YOU OWN LIGHT AND COLOUR: the rigs, sky, fog, exposure, the grade, and each
world's palette.

Files: WORLD_LIGHT and the hand-authored ACES + toe + split-tone grade in
src/prototype3d.ts (around lines 236-278 and 636), the sky in island.ts, and
src/proto3d/palette.ts.

THE ONE PIECE OF ENGINE BEHAVIOUR THAT GOVERNS YOUR WHOLE SURFACE, from
AAA-BRIEF §4.1 and worth re-verifying: three.js forces toneMapping =
NoToneMapping whenever currentRenderTarget !== null, which is exactly what
RenderPass does — so routing through EffectComposer silently deletes the graded
tone map and everything goes flat and desaturated. The team measured that, and
correctly removed the composer rather than ship the washed pipeline. That is why
ZERO post-processing ships today: no bloom, no SSAO, no vignette, no DoF, no
grain, on any device. Whether that is still the right trade is your call to make,
with a proposal.

Also recorded: Lantern Night was crushing 26% of pixels below 25/255 and was
lifted. Game Day measured 0.357 mean scene luminance against Maple's 0.626 and
its parking asphalt albedo was the cause, not the light.

Judge specifically:
  - Does each world have its own light, or one rig recoloured?
  - Shadows: resolution, softness, contact, and the aliased edges visible in the
    frames. What is the cheapest change with the largest effect?
  - Is there any ambient occlusion anywhere? Should there be, given the budget?
  - Colour: does the palette hold together, or is the green half of the frame six
    values of one hue?
  - The hero is 0x9a5cff. Does it separate from every world's ground at every
    size, or does it disappear against something?` },

  { key: 'hero', name: 'TEAM HERO',
    images: ['qa/out/shippedlook/maple_look.png', 'qa/out/person/maple_front.png', 'qa/out/shippedlook/lantern_look.png'],
    brief: `YOU OWN THE VOID. It is on screen for every second of every match and it is
the thing a child is.

Files: src/proto3d/void3d.ts (body, face rig, moods, rings, skins).

The face is widely agreed to be the best thing in the game — big eyes, brows,
blush, a mouth, a starfield interior, an orbit ring. Your job is NOT to
relitigate it. Your job is everything around it:
  - Does it read at EVERY size? It spans radius 0.9 to 12 across a match. The
    face is enormous at spawn and the ring is large; at radius 12 what happens?
  - Does it read against every world's ground — including Lantern Night, which is
    dark, and Powder Pass, which is near-white?
  - Growth: does getting bigger FEEL like getting bigger, or does the camera pull
    back and cancel it out?
  - Moods: how many are there, when do they fire, and is the child ever shown a
    face that does not match what just happened?
  - Skins and hats: do they degrade the read? Does a hat sit correctly at r=12?
  - The eaten-prop moment: what does the void itself do when it swallows
    something? Is the hero part of the feedback, or a spectator to it?` },

  { key: 'ui', name: 'TEAM UI',
    images: ['qa/out/shippedlook/maple_look.png', 'qa/out/shippedlook/powder_look.png'],
    brief: `YOU OWN EVERY PIXEL THAT IS NOT THE WORLD: HUD, menus, type, layout, safe
areas, taps, and the flow between screens.

Files: index.html (ALL the HUD markup and CSS), plus HUD painted from TypeScript
in src/prototype3d.ts — grep both, because a previous pass found dead font
weights alive only in the TS-painted layer.

An earlier audit found, unverified by you: the iOS status bar draws over the
game; the final-ten countdown is the least legible element in the game; score
popups have a hairline outline that fails on bright ground; four backdrop-filter
layers composite over the live WebGL canvas every frame of every match; the 3D
scene renders at full rate behind every opaque full-screen overlay including the
pause sheet; the world picker's SOLO toggle sits inside the home-indicator inset;
the scrapbook's tab bar is about 31px tall against Apple's 44px minimum; four
glyphs fall outside every Fredoka subset and render in SF Pro; and the declared
"clay system" is applied to zero elements. Verify what you can and say which you
could not.

Judge specifically:
  - Legibility over a moving 3D scene at arm's length, on a phone, by a
    six-year-old who may not read well.
  - Safe areas on a notched device: env(safe-area-inset-*) usage, and anything
    pinned to top:0 or bottom:0 without it.
  - Tap targets under 44x44 CSS px.
  - Does the HUD look like it belongs to the same game as the world behind it?
  - The seams: boot, the first frame, TIME!, the results screen, the walk back to
    the menu. Those are where a verdict forms.` },

  { key: 'choreography', name: 'TEAM CHOREOGRAPHY',
    images: ['qa/out/shippedlook/maple_look.png'],
    brief: `YOU OWN TIME. Not what things look like — WHEN they happen.

Files: the match loop, fx and the eat path in src/prototype3d.ts.

The lens is AAA-BRIEF §2's absences 1, 2 and 3: one response per action; no
anticipation and no settle; transitions are cuts.

NOT YOURS, by absolute owner order: camera shake is ZERO. fx.kick, fx.shake and
camPunch are deliberate no-ops and restoring them is forbidden. hitStop — a time
freeze, which moves nothing — IS alive and IS yours.

An earlier audit found, unverified by you: the hit-stop freezes the world 130ms
BEFORE the mouth opens; nothing the size of a building anticipates anything
because lean, drift and the hungry face all die on the same guard; hit-stop fires
from exactly one call site so the two biggest moments in a match have no time
channel at all; the evolution "celebratory pop" is a 12% shrink and a 4.5% swell;
particles do not honour hit-stop despite two comments saying they do; the pause
sheet is the one modal that hard-cuts; and the intro does not disable the
controls, it taxes them 31% while a comment claims 99.8%.

Judge specifically:
  - THE BITE. Count every channel that answers one swallow and say which fire on
    the same frame. A cheap game answers once; a polished one answers in layers a
    few frames apart on different curves.
  - Every state change in the game — boot to menu, menu to picker, picker to
    match, match to TIME! to results, results to menu, world switch, pause and
    shop open/close. Choreographed, or a cut?
  - Anticipation and settle: what winds up before it happens, and what overshoots
    and settles after?
  - Name the shipped game whose game feel you are measuring against, and what it
    does that we do not.` },

  { key: 'audio', name: 'TEAM AUDIO',
    images: [],
    brief: `YOU OWN WHAT THE GAME SOUNDS LIKE: the scores, SFX, the mix, the cover pad.

Files: src/proto3d/audio3d.ts (4.2k lines — five synth scores, the recorded-track
player, channels, crossfades, the cover pad).

YOU HAVE NO IMAGES, and you cannot hear the game. Say so plainly and reason from
structure, from the code, and from what the briefs record. Do not invent a
listening impression — this project has a documented history of an audio probe
printing "RECORDING" for four rounds while the owner heard silence.

What is recorded: six recorded tracks ship (menu + five worlds), all mastered to
-16 LUFS +/-1 and <= -1 dBTP. The presence of public/assets/music/<world>.mp3 is
the entire switch; absent means that world plays its synth score. While a track
decodes, a DRUMLESS cover pad bridges — the full synth score used to be the
cover, and the owner heard that as unsynced drums. Three SFX are still missing
and the owner has not picked replacements: eaten_deep.wav, evolve_epic.wav,
win_warm.wav; synth fallbacks play, and the swallow fallback is now a soft whoosh
rather than a thud that read as a drum hit.

An earlier audit found: two decoded tracks stay resident for the whole session
and stopMusic() never releases either — roughly 50-80 MB each.

Judge specifically:
  - The mix: how many things can sound at once at peak, and what masks what?
  - Does a swallow sound different at radius 1 and radius 10? Should it?
  - The seams again: menu to match, TIME!, results, the walk back.
  - What is the single highest-value audio change, and what would it cost?` },

  // ── THE NINTH TEAM ──────────────────────────────────────────────────────
  // The owner, after playing a build: "Get a team also on quality."
  //
  // The eight above own SURFACES, and the evidence that this is not enough is
  // unambiguous. The owner's own list of six — the white face, who can eat
  // him, the edge that launches you, the rings behind you, the news calling
  // him "the hole", space not looking like space — is five parts behaviour and
  // words to one part art. NOT ONE of the six was found by a surface team, and
  // several had been in the game for weeks under a studio with veto power.
  //
  // A team that reviews pictures cannot find a collision response that
  // accelerates, an effect firing 186 times a minute, or a newsroom calling
  // the protagonist by the wrong noun 74 times.
  { key: 'play', name: 'TEAM PLAY',
    images: ['qa/out/shippedlook/maple_look.png', 'qa/out/shippedlook/powder_look.png'],
    brief: `YOU OWN WHAT IT IS LIKE TO PLAY THIS, not what it looks like. You are the
only team here that is not allowed to file an art finding, and the only one
required to file behaviour.

Files: src/prototype3d.ts (the match loop, input, collision, fx firing rates),
src/proto3d/rivals.ts (the family), src/proto3d/newsroom*.ts (every word a child
reads), src/proto3d/fx.ts.

YOUR BAR IS A SIX-YEAR-OLD'S PATIENCE, and the titles that respect it: hole.io
for the swallow loop's honesty, Donut County for never punishing curiosity,
Animal Crossing for text that is always kind and never repeats itself into
noise.

WHY YOU EXIST, stated so you do not drift into art. The owner played a build
and reported six things. Five were behaviour or words: a face that reads as a
colour change, a rival system where only one void is ever hostile, an island
edge that ACCELERATES you on contact, rings appearing behind the player 140
times a minute, and a newsroom calling the protagonist "the hole" 74 times.
Eight surface teams with veto power had passed all of it. That is the gap you
close.

Judge specifically, and MEASURE rather than read where a probe exists:
  - RATES. How many times a minute does anything fire at the player — rings,
    banners, voice lines, screen flashes, buzzes? qa/ringcount.mjs counts rings
    per match-minute and reports how many land AWAY from the void, which is
    the owner's actual complaint. Anything above a couple a minute that is not
    a milestone is noise.
  - REPETITION. A child plays the same world ten times. What do they hear or
    read twice in one match? Three times? The newsroom pools, the rival taunts,
    the banner copy.
  - PUNISHMENT. What happens when a child does the wrong thing — walks into a
    wall, gets bitten, runs out of time? Is any of it silent, unexplained, or
    worse than the mistake deserved?
  - THE THING THAT CANNOT BE UNSEEN. One sentence: after ten minutes of play,
    what would a child's parent complain about?

Do not file "the trees look flat". That is TEAM STATIC's and it is not yours.` },
]

phase('Review')
log(`The studio: ${TEAMS.length} teams, each with a veto on its own surface.`)

const reviewed = await pipeline(
  TEAMS,
  (t) => agent(`${CHARTER}

═══════════════════════════════════════════════════════════════════
YOU ARE ${t.name}
═══════════════════════════════════════════════════════════════════

${t.brief}

IMAGES YOU MUST READ BEFORE WRITING ANYTHING (absolute paths):
${t.images.length ? t.images.map((i) => `  ${ROOT}/${i}`).join('\n') : '  (none — say so in COVERAGE and reason from code)'}

Read them with the Read tool. They are renders of the shipped canvas. If one is
missing, say which and continue with the rest.`,
    { label: `review:${t.key}`, phase: 'Review', effort: 'high' })
    .then((text) => ({ key: t.key, name: t.name, text: text || '' })),

  (r) => {
    if (!r || !r.text.trim()) return { ...r, verdict: '' }
    return agent(`${CHARTER}

═══════════════════════════════════════════════════════════════════
YOU ARE THE SKEPTIC ASSIGNED TO ${r.name}
═══════════════════════════════════════════════════════════════════

Your job is to KILL findings that do not survive contact with the code. This
project has shipped six documented retractions because a confident wrong finding
was persuasive, and two shipped visual failures because nobody checked.

Open every cited file at every cited line yourself. Read the same images. Default
to NOT REAL when uncertain.

A finding is NOT REAL if:
  - the cited line does not say what the reviewer claims it says
  - the behaviour is deliberate and recorded in AAA-BRIEF §7 or HANDOFF
  - other code the reviewer did not read already handles it
  - it is taste with no consequence a child or a reviewer would meet
  - it cannot happen from any reachable state
  - the proposed FIX would break determinism (a new seeded draw), blow the draw
    call budget, or violate an owner order

Judge the VERDICT too. A team that said SHIP while its own findings include a
blocker is wrong, and so is a team that said NO-SHIP over a polish item.

THE REVIEW:

${r.text}

Output:

## VERDICT ON THE VERDICT
Was SHIP/NO-SHIP the right call? One sentence.

## PER FINDING
### <the same title>
REAL: yes | no
WHAT I FOUND: what you saw when you opened it yourself, quoted
FIX SOUND: yes | no — and if no, what it would break
CORRECTION: if a detail is wrong, the correct version

## WHAT THE TEAM MISSED
The reviewer owns this surface. Looking at the same images, what did they not
mention that you would have? Be specific.

End with: SURVIVED: <n> of <m>.`,
      { label: `refute:${r.key}`, phase: 'Refute', effort: 'high' })
      .then((v) => ({ ...r, verdict: v || '' }))
  }
)

const teams = reviewed.filter(Boolean).filter((r) => r.text.trim())
log(`${teams.length} of ${TEAMS.length} teams reported.`)

phase('Direct')
const board = teams.map((t) => `
═══════════════════════════════════════════════════════════════════
${t.name}
═══════════════════════════════════════════════════════════════════
--- THE TEAM'S REVIEW ---
${t.text}

--- THE SKEPTIC ---
${t.verdict}
`).join('\n')

const director = await agent(`${CHARTER}

═══════════════════════════════════════════════════════════════════
YOU ARE ART DIRECTION
═══════════════════════════════════════════════════════════════════

You have ONE question, and it belongs to nobody else in the studio:

    DOES THIS READ AS ONE GAME?

Every team below judged its own surface in isolation. That is how a beautiful
tree ends up in a world lit for a different palette, how a crowd gets drawn to a
different chart than the hero it is eaten by, and how a HUD ends up belonging to
a different product than the world behind it. Those defects are invisible from
inside any single team and they are yours.

Read the play frames for all five worlds yourself before you answer:
${['maple', 'pirate', 'gameday', 'lantern', 'powder'].map((w) => `  ${ROOT}/qa/out/shippedlook/${w}_look.png`).join('\n')}
and the character sheet front: ${ROOT}/qa/out/person/maple_front.png

THE BOARD:

${board}

Output:

## DOES IT READ AS ONE GAME?
Yes or no, and the honest reason.

## THE STYLE, STATED
Nobody has ever written down what this game's visual language IS. Do it: form
language, palette discipline, level of detail, how light behaves, what is
stylised and what is literal. One paragraph a new artist could work from. Then
name the shipped titles it sits between.

## WHERE IT BREAKS
The specific places the language is violated, with the file and the image you
saw it in. Rank by how much they cost the read.

## CROSS-TEAM CONFLICTS
Where two teams' proposals fight each other, or where a fix on one surface would
expose a weakness on another. Name the trade and recommend.

## THE SINGLE HIGHEST-VALUE VISUAL CHANGE IN THE GAME
One thing. Argue it in a paragraph, against a named shipped title.`,
  { label: 'art-direction', phase: 'Direct', effort: 'max' })

phase('Govern')
const plan = await agent(`${CHARTER}

═══════════════════════════════════════════════════════════════════
YOU ARE WRITING THE GOVERNOR'S ORDER OF WORK
═══════════════════════════════════════════════════════════════════

Eight teams reviewed their own surface, a skeptic tried to kill every finding,
and art direction judged whether it reads as one game. Turn it into work.

The engineer has roughly two days, NO MAC (no Xcode, no device build, no
archive), and an owner who has twice caught visual failures that passed every
gate and who said "this is not AAA quality and I have no idea how that was
accepted".

DISCARD anything the skeptic marked NOT REAL. Do not smuggle it back in.
DISCARD any fix the skeptic marked FIX NOT SOUND unless you replace the fix.

THE BOARD:

${board}

═══════════════════════════════════════════════════════════════════
ART DIRECTION
═══════════════════════════════════════════════════════════════════

${director}

Output:

## WHAT BLOCKS
Every surviving blocker, and which team vetoed. Nothing ships while these stand.

## THE ORDER OF WORK
Ranked. Rank by (visual value to a child's first thirty seconds) divided by (risk
of breaking something that already works). Group anything sharing a code path so
it is one job. For each: the files, the smallest change, the cost in draw calls
and triangles, whether it touches the seeded draw stream, and the gate that fails
before and passes after.

## WHAT I AM NOT DOING, AND WHY
The findings that are real but not worth the two days. Say so out loud rather
than letting them rot silently — a silent backlog reads as "done".

## NEW INSTRUMENTS NEEDED
What could not be judged because no probe or render shows it. Each one is a
deliverable before the work it gates.

## THE ONE THING
If only one change lands, which, and what it buys.`,
  { label: 'governor:order-of-work', phase: 'Govern', effort: 'max' })

return { teams: teams.length, director, plan, board }
