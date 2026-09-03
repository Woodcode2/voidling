export const meta = {
  name: 'firstframe-studio',
  description: 'Stream D — the studio on the first frame: five establishing-shot cinematographers, the splash UI, choreography and the hero, each refuted by a skeptic; art direction; the governor\'s order of work',
  phases: [
    { title: 'Review', detail: 'eight surfaces of the first frame, each judged against a named shipped opening' },
    { title: 'Refute', detail: 'an independent skeptic tries to kill every finding' },
    { title: 'Direct', detail: 'does the first frame promise this game — across five worlds and the splash' },
    { title: 'Govern', detail: 'the order of work: exact patches, gates, what not to do' },
  ],
}

const ROOT = '/home/user/voidling/artifacts/3d-game'
const SHOTS = `${ROOT}/docs/crews/round-5/shots/firstframe`
const DATA = `${ROOT}/docs/crews/round-5/firstframe-data`
const REPORTS = `${ROOT}/docs/crews/round-5/firstframe`
const WORLDS = ['maple', 'pirate', 'gameday', 'lantern', 'powder']
const NAMES = { maple: 'MAPLE FALLS', pirate: 'PIRATE BAY', gameday: 'GAME DAY', lantern: 'LANTERN NIGHT', powder: 'POWDER' }

const CHARTER = `THE STUDIO, ON THE FIRST FRAME (Stream D of docs/FABLE-LAUNCH-BRIEF.md §2D).
The charter is ${ROOT}/docs/STUDIO.md; the governor's standing rules are ${ROOT}/docs/GOVERNOR.md.

THE GAME: "THE CUTE WORLD ENDER", a hole.io-style 3D game for children aged 6-11.
You are a small purple void with a face; you roll around a town swallowing
everything smaller than you; in three minutes you eat a whole world while an
in-world newsroom reports on you and five family-member rivals race you.
Three.js 0.185 + TypeScript + Vite, no engine. Ships to iOS via Capacitor and web.

THE OWNER'S MANDATE: "I want a full billion-dollar team that can do its due
diligence, vet, and fix. Nothing sub-par passes them." His standard is a top-10
App Store game; he playtests on a real iPhone with his young daughter, in Safari.

THE BRIEF'S WORDS FOR THIS STREAM (§2D): "Nobody has ever art-directed the
establishing shot, because everyone believed it used the gameplay camera. It
does not. It is the first thing a player sees, the frame an ad opens on, and it
is currently unreviewed. Shoot it in all five worlds across its swing and judge
it. Also: the splash screen's 'THE CUTE' line is low-contrast against the
artwork behind it, and the title appears twice in that frame."

HOW THE ESTABLISHING SHOT WORKS (src/prototype3d.ts, search "THE ESTABLISHING
SHOT" and "ease-in dive from orbit"): for COPY.introLen match-seconds (Maple
2.2, Pirate 2.2, Game Day 3.4, Lantern 3.6, Powder 3.5) the camera dives from
camDist 300 to 38 (camDist = 38 + 262·k², k = introT/introLen) while its subject
slides from the world's hero landmark (COPY.hero, null on Maple → opens on the
void) to the void: held on the landmark for the first quarter, handed over
across the middle half (smoothstep), settled on the void for the last quarter.
Controls are damped for the whole intro; the DRAG hint is withheld until it
ends; the title card (LEVEL n / WORLD NAME / tagline) animates for 4.2 s over
it. WORLD_COPY is at src/prototype3d.ts ~1216-1470 (hero, introLen, names,
taglines); the intro tick is ~9430-9490; the title card and HUD markup is in
index.html.

THE EVIDENCE PACK — you MUST Read the images named for you before writing a
word (STUDIO rule 1). qa/firstframe.mjs shot every world at SEED=7 on a
430x932@2 phone: six moments across the swing — u100 (t≈0.4 s, the first frame
the player sees), u75, u50, u25, u0 (the intro's end), settled (one second
later) — each as the PAGE (what the player sees, title card and HUD included)
and as the CANVAS alone (the shot itself). Contact sheets put the six in a row.
Every number in ${DATA}/<world>.json was run. The splash pack is the boot loader
(boot0 = the literal first paint, boot = with the loader's name line filled),
the menu, the picker and the world loader, at seven viewports, with the "THE
CUTE" line's contrast measured against the real pixels behind its glyphs, and
the owner's own iPhone screenshot at ${ROOT}/docs/owner-2026-08-29-splash.png
measured the same way (${DATA}/owner-splash.txt).

THE FOUR RULES (STUDIO.md):
  1. LOOK AT THE PIXELS. Read the images. Two shipped failures came from reading
     code and never looking.
  2. NAME THE BAR. "It looks cheap" is not a finding. Cite a SHIPPED title's
     opening or splash and what it does mechanically, then measure us against it.
  3. THE FIX, OR THE PATH TO IT. NO-SHIP owes the smallest change that closes
     it, or the experiment that would find out.
  4. A GATE, OR IT COMES BACK. Every fix names a check in qa/ (qa/firstframe.mjs
     is the instrument; say what it should assert) that fails on today's build
     and passes after.

HARD CONSTRAINTS — a proposal that breaks one is worthless:
  - DO NOT EDIT ANY SOURCE FILE. You review; the governor implements. The ONE
    file you write is your own report (below).
  - DO NOT run Playwright, start a browser, or build: 4 CPUs and the governor's
    measurements share them. You MAY Read .png and .json files — you must.
  - DETERMINISM: the town is identical every load. mrnd()/mr()/mpick() are ONE
    seeded stream on Maple; a proposal that adds a seeded draw must say so.
  - OWNER ORDERS, not defects: camera shake is ZERO (fx.kick/shake/camPunch are
    no-ops on purpose); the splash KEY ART and the world-picker POSTERS are
    APPROVED and must not be changed — the text and layout over them may; the
    void's purple identity is approved; the tap gate on the world card is NOT
    vestigial (a world switch is a full page reload and the tap unlocks audio).
  - The match clock under the software renderer runs 14-40× slow, so every
    moment is stamped in MATCH seconds (tPage/tCanvas in the JSON); a page shot
    and its canvas twin are ~0.25 match-s apart. Do not read that gap as a cut.
  - Nothing you say is a fact until it is measured; say "I saw" for pictures,
    "the code says" for code, and quote the line.

RECORD AS YOU GO. Crews die with the container and a restart reverts the
checkout; the remote branch is the only durable copy. Write your full report
with the Write tool to the path given below, then run, from ${ROOT}:
    bash qa/_record.sh <your report path relative to the repo> "<one-line message>"
which commits and pushes just that file under a lock. Do this BEFORE you return.
Then return the same report as your final text.

OUTPUT — plain markdown:

## VERDICT: SHIP or NO-SHIP
One sentence on why.

## THE BAR
The shipped title you measured against, what its opening/splash does
mechanically (hold, dolly, reveal, card timing, type over art), and where we sit.

## FINDINGS
### <short title>
SEVERITY: blocker | major | minor | polish
AT: <path>:<line>
SAW: what you saw in which image, by filename.
EVIDENCE: the actual line(s), quoted, or the number from the JSON
FIX: the smallest change that closes it — exact values, exact lines
GATE: what qa/firstframe.mjs (or another probe) should assert; fails before, passes after

## IS THIS THE BEST THIS CAN BE?
If no: what is between here and there, ranked. If yes: why, against the bar.

## COVERAGE
The files you read and the images you looked at.`

const swingImages = (w) => [
  `${SHOTS}/sheets/${w}_swing.png`, `${SHOTS}/sheets/${w}_swing_canvas.png`,
  ...['u100', 'u75', 'u50', 'u25', 'u0', 'settled'].map((m) => `${SHOTS}/${w}_${m}.png`),
  `${SHOTS}/${w}_u100_canvas.png`, `${SHOTS}/${w}_u0_canvas.png`,
]

const SURFACES = [
  ...WORLDS.map((w) => ({ key: `swing-${w}`, name: `THE CINEMATOGRAPHER FOR ${NAMES[w]}'S ESTABLISHING SHOT`,
    images: swingImages(w), data: [`${DATA}/${w}.json`],
    brief: `YOU OWN ${NAMES[w]}'S FIRST FRAME AND THE SWING THAT FOLLOWS IT — the shot an ad
would open on, and the two to four seconds that carry a child from the world's
name to their own hands on the controls.

Judge, moment by moment (u100 → settled), on the CANVAS frames for the shot
and on the PAGE frames for what the child actually sees:
  - THE SUBJECT. What is the first frame OF? (COPY.hero for this world in
    src/prototype3d.ts WORLD_COPY — read it — or the void when null.) Is the
    landmark in frame, readable, and worth opening on? Is the void findable at
    camDist 300?
  - THE MOVE. Hold, then travel, then settle: does the dive read as a reveal or
    as a camera falling? Where does the eye go at each moment? Is there a frame
    in the swing you would put in the App Store?
  - THE CARD OVER THE SHOT. LEVEL n / ${NAMES[w]} / the tagline sit on the
    picture for 4.2 s while the shot lasts ${'{introLen}'} s. Do they sit on the
    composition or fight it (over the landmark, over the void, over the busiest
    part)? Type size, letter-spacing, the glow, the tagline's words.
  - FRAME ONE'S CLUTTER. The HUD (timer, home, coin chip, the rank bar) is live
    from the first frame; at u0 the DRAG hint and speech bubbles land. Name
    what is on screen at u100 and at u0 and whether a shipped title would allow it.
  - COMPOSITION. Horizon, thirds, scale of the landmark, what is cut by the
    frame edge, the ground's share of the frame, the sky's.
  - THE WORLD'S PROMISE. Does frame one say what ${NAMES[w]} is (its landmark,
    its palette, its crowd) — or could it be any world?
Name the bar: a shipped mobile title's level opening and what it does
mechanically, frame by frame. Then say where ${NAMES[w]} sits.` })),
  { key: 'splash', name: 'TEAM UI — THE TWO SCREENS BEFORE THE GAME',
    images: [
      `${SHOTS}/maple_boot0.png`, `${SHOTS}/maple_boot.png`, `${SHOTS}/maple_menu.png`, `${SHOTS}/maple_picker.png`,
      `${SHOTS}/sheets/splash_viewports.png`, `${SHOTS}/sheets/splash_safari.png`,
      `${SHOTS}/maple_boot_440x814.png`, `${SHOTS}/maple_boot_430x740.png`, `${SHOTS}/maple_boot_375x667.png`,
      `${ROOT}/docs/owner-2026-08-29-splash.png`,
    ],
    data: [`${DATA}/maple.json`, `${DATA}/maple_440x956.json`, `${DATA}/maple_440x814.json`, `${DATA}/maple_430x740.json`, `${DATA}/maple_393x700.json`, `${DATA}/maple_375x667.json`, `${DATA}/owner-splash.txt`],
    brief: `YOU OWN THE BOOT LOADER, THE MENU SPLASH AND THE PICKER — every pixel of type
and layout over the approved key art, at every phone the owner might hold.

The owner's two complaints, in his words: the splash's "THE CUTE" line is
low-contrast against the artwork behind it, and the title appears twice in
that frame. His screenshot is docs/owner-2026-08-29-splash.png: an iPhone in
Safari, so the content area is shorter than the screen and the key art lands
differently — the logo sits on the hero's face. Our renders at 430x932 and
440x956 put the same logo over dark sky and measure 7:1; at his viewport the
same line measures 3.46:1 median and 1.72:1 against the face's highlights
(owner-splash.txt), against a 4.5:1 bar for 12px text. Read the Safari-sized
renders (440x814, 430x740, 393x700) and their JSON to see whether our build
reproduces his frame, and say so with the numbers.

The doubled title: index.html:1935 paints <div class="lLogo"><i>THE CUTE</i>WORLD ENDER</div>
and src/prototype3d.ts:1464 fills .lName with 'THE CUTE WORLD ENDER' whenever
the app is not going straight into a world — read both lines and the CSS at
index.html:1182-1189 (.lLogo 26px, .lLogo i 12px letter-spacing 7px #ffd9f2,
.lName 14px #ffd23f). The menu's .tag is now STARRING THE VOIDLINGS
(index.html:1753) — the loader was never given the same thought.

Judge: the doubled name; the 12px "THE CUTE" line (contrast, size, tracking, its
glow) at every viewport, and what a fix that survives every viewport looks like
(a scrim? a position that never meets the face? a size? — the key art cannot
move, the text can); the loader's copy ("Raking the park…", the tip line, 0%);
the progress bar; the menu's logo block and PLAY; the picker's shelf. Name the
bar: a shipped title's loader and splash, what its type does over its art.` },
  { key: 'choreo', name: 'TEAM CHOREOGRAPHY, CARRYING PLAY\'S QUESTION',
    images: WORLDS.flatMap((w) => [`${SHOTS}/sheets/${w}_swing.png`, `${SHOTS}/${w}_u0.png`, `${SHOTS}/${w}_settled.png`]),
    data: WORLDS.map((w) => `${DATA}/${w}.json`),
    brief: `YOU OWN THE TIMING OF THE FIRST FOUR SECONDS IN EVERY WORLD — anticipation,
hold, hand-over, settle — and how many channels speak at once. PLAY's question
rides with you: what does a six-year-old understand, and what can she DO, at
each moment?

From the JSON (tPage per moment, introLen per world) and the frames:
  - the title card's 4.2 s against introLens of 2.2-3.6 s: the card outlives the
    shot on every world; where is the child's eye when the controls go live?
  - at u0: the DRAG hint (showGuide, prototype3d.ts ~9448), the infinity
    gesture, speech bubbles, announce('🍽️ eat everything SMALLER…') at 3000 ms
    — count the channels that land in the same second and name a shipped title's
    equivalent moment.
  - the HUD is live from frame one (timer at 3:00, home, coins, the rank bar):
    should it be?
  - controls are damped for the whole intro (velX *= 0.9^(dt·60)); qa/_introdrag.mjs's
    header says a child's first drag does nothing. Is the withheld DRAG hint the
    right answer, or should the intro end on the first touch?
  - the words: "LEVEL 1", each world's tagline (WORLD_COPY), the loader tip. Do
    they read at 6? Do they say what to do?
Propose the timing, in seconds, per world, and the smallest code change that
makes it so. Name the bar mechanically (a shipped title's card-in, card-out,
control-live timings).` },
  { key: 'hero', name: 'TEAM HERO — THE VOID IN THE FIRST FRAME',
    images: WORLDS.flatMap((w) => [`${SHOTS}/${w}_u100_canvas.png`, `${SHOTS}/${w}_u0_canvas.png`, `${SHOTS}/${w}_settled_canvas.png`]),
    data: WORLDS.map((w) => `${DATA}/${w}.json`),
    brief: `YOU OWN THE VOID: body, face, how he reads against every world. In the first
frame he is at camDist 300, a few pixels wide; by u0 the camera has arrived on
him and the DRAG infinity is drawn over him.

Judge, per world: can a child find him at u100 (and should she — or is the
landmark the subject and he the payoff)? At u0 and settled, does his face read,
does his purple hold against the ground (Powder's white, Lantern's dark,
Game Day's crimson, Maple's green), is the drag hint covering the one thing that
is his? Is his arrival the settle of the shot or an afterthought? Files:
src/proto3d/void3d.ts, the intro block in src/prototype3d.ts. Name the bar: a
shipped title's hero reveal in its opening, mechanically.` },
]

phase('Review')
log(`The studio on the first frame: ${SURFACES.length} surfaces, each with a veto.`)

const reviewed = await pipeline(
  SURFACES,
  (s) => agent(`${CHARTER}

═══════════════════════════════════════════════════════════════════
YOU ARE ${s.name}
═══════════════════════════════════════════════════════════════════

${s.brief}

IMAGES YOU MUST READ BEFORE WRITING ANYTHING (absolute paths):
${s.images.map((i) => `  ${i}`).join('\n')}

NUMBERS YOU MUST READ:
${s.data.map((d) => `  ${d}`).join('\n')}

If an image is missing, say which and continue with the rest.

YOUR REPORT PATH: ${REPORTS}/review-${s.key}.md  (repo-relative: artifacts/3d-game/docs/crews/round-5/firstframe/review-${s.key}.md)
Record it with qa/_record.sh before you return.`,
    { label: `review:${s.key}`, phase: 'Review', effort: 'high' })
    .then((text) => ({ key: s.key, name: s.name, images: s.images, text: text || '' })),

  (r) => {
    if (!r || !r.text.trim()) return { ...r, verdict: '' }
    return agent(`${CHARTER}

═══════════════════════════════════════════════════════════════════
YOU ARE THE SKEPTIC ASSIGNED TO ${r.name}
═══════════════════════════════════════════════════════════════════

Your job is to KILL findings that do not survive contact with the code and the
pixels. This project has shipped six documented retractions because a
confident wrong finding was persuasive, and two shipped visual failures
because nobody checked.

Open every cited file at every cited line yourself. Read the same images:
${r.images.map((i) => `  ${i}`).join('\n')}
Default to NOT REAL when uncertain.

A finding is NOT REAL if:
  - the cited line does not say what the reviewer claims it says
  - the behaviour is a recorded owner order or a deliberate decision in
    docs/GOVERNOR.md "HANDS OFF" or docs/AAA-BRIEF.md §7
  - other code the reviewer did not read already handles it
  - it is taste with no consequence a child or a store reviewer would meet
  - the picture does not show what the reviewer says it shows
  - the proposed FIX would break determinism, blow the budget, change the
    approved key art or posters, or violate an owner order
  - the number cited is not in the JSON, or is misread (match seconds vs wall)

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
Looking at the same images, what did they not mention that you would have?

End with: SURVIVED: <n> of <m>.

YOUR REPORT PATH: ${REPORTS}/refute-${r.key}.md  (repo-relative: artifacts/3d-game/docs/crews/round-5/firstframe/refute-${r.key}.md)
Record it with qa/_record.sh before you return.`,
      { label: `refute:${r.key}`, phase: 'Refute', effort: 'high' })
      .then((v) => ({ ...r, verdict: v || '' }))
  }
)

const teams = reviewed.filter(Boolean).filter((r) => r.text.trim())
log(`${teams.length} of ${SURFACES.length} surfaces reviewed and refuted.`)

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

    DOES THE FIRST FRAME PROMISE THIS GAME — AND THE SAME GAME IN ALL FIVE WORLDS?

Five cinematographers judged one world each; UI judged the screens before it;
choreography the timing; the hero his own read. The defects only visible across
them are yours: five openings that belong to five products, a splash whose type
belongs to a different game than the world behind it, a card that fights the
shot in one world and sits in another.

Read these yourself before you answer:
${WORLDS.map((w) => `  ${SHOTS}/sheets/${w}_swing.png\n  ${SHOTS}/sheets/${w}_swing_canvas.png`).join('\n')}
  ${SHOTS}/maple_boot.png
  ${SHOTS}/maple_menu.png
  ${ROOT}/docs/owner-2026-08-29-splash.png

THE BOARD:

${board}

Output:

## DOES THE FIRST FRAME PROMISE THIS GAME?
Yes or no, per world and for the splash, and the honest reason.

## THE OPENING, STATED
Nobody has written down what this game's opening IS. Do it: the subject, the
move, the card, the hand-over, the type over the art — one paragraph a new
cinematographer could shoot from. Then name the shipped titles it sits between.

## WHERE IT BREAKS
The specific places the opening is violated, with the file and the image you
saw it in. Rank by how much they cost the first thirty seconds.

## CROSS-TEAM CONFLICTS
Where two teams' proposals fight each other. Name the trade and recommend.

## THE SINGLE HIGHEST-VALUE CHANGE TO THE FIRST FRAME
One thing. Argue it in a paragraph, against a named shipped title.

YOUR REPORT PATH: ${REPORTS}/direction.md  (repo-relative: artifacts/3d-game/docs/crews/round-5/firstframe/direction.md)
Record it with qa/_record.sh before you return.`,
  { label: 'art-direction', phase: 'Direct', effort: 'max' })

phase('Govern')
const plan = await agent(`${CHARTER}

═══════════════════════════════════════════════════════════════════
YOU ARE WRITING THE GOVERNOR'S ORDER OF WORK
═══════════════════════════════════════════════════════════════════

Eight surfaces reviewed, a skeptic tried to kill every finding, art direction
judged whether the first frame promises the game. Turn it into work the
governor can land tonight: exact patches, each with a gate.

The governor has NO MAC (no Xcode, no device), a software renderer 14-40× slow,
a container that restarts without warning, and an owner who catches what the
gates miss. Every change lands on a branch, passes \`node qa/gate.mjs
--profile=push\` (16 steps), and only then fast-forwards main.

DISCARD anything the skeptic marked NOT REAL. Do not smuggle it back in.
DISCARD any fix the skeptic marked FIX NOT SOUND unless you replace the fix.
The key art and the posters are approved and unchangeable; the tap gate stays;
camera shake stays at zero; Maple's seeded stream is not touched.

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
Ranked by (value to a child's first thirty seconds) / (risk of breaking what
works). Group anything sharing a code path into one job. For each: the files
and lines, the exact change (values, copy, CSS), whether it touches the seeded
stream, and the gate — what qa/firstframe.mjs must assert (fails before, passes
after), or another probe.

## THE SPLASH, SPECIFICALLY
The doubled title and the "THE CUTE" line: the one fix that survives every
viewport in the pack and the owner's Safari frame, with the contrast number it
must reach (4.5:1 for 12px; 3:1 for ≥18.66px bold), and the probe assertion.

## WHAT I AM NOT DOING, AND WHY
Real findings not worth tonight. Say so out loud.

## NEW INSTRUMENTS NEEDED
What could not be judged because no probe or render shows it.

## THE ONE THING
If only one change lands, which, and what it buys.

YOUR REPORT PATH: ${REPORTS}/order-of-work.md  (repo-relative: artifacts/3d-game/docs/crews/round-5/firstframe/order-of-work.md)
Record it with qa/_record.sh before you return.`,
  { label: 'governor:order-of-work', phase: 'Govern', effort: 'max' })

return { surfaces: teams.length, director, plan, board }
