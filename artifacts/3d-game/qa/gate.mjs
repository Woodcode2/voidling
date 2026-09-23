// THE RELEASE GATE — the one command that decides whether this build may go live.
//
// WHY THIS EXISTS, AND WHY IT IS NOT JUST A SHELL SCRIPT.
//
// Every probe in this directory prints a verdict and then exits 0. All of them.
// `node qa/smoke.mjs` on a build that cannot boot prints a connection-refused
// stack and still exits 0, which is why FABLE-BRIEF's rule 3 has to say "READ
// the output for the word PASS" — a human is the gate. That works right up until
// the moment somebody is tired, or pipes it through `tail`, or runs it in a
// chain where `&&` sees a zero and carries on. The brief records that exact
// failure: "`| tail -2` in an `&&` chain prints a connection-refused stack and
// still lets the push through, because `tail` exits 0."
//
// So this file does the reading. It runs each probe, matches its stdout against
// a verdict rule declared HERE (next to the probe's name, where it can be
// audited), and turns that into an exit code. The rules are per-probe because
// the probes genuinely disagree about how to say "good": most print
// "  PASS — ...", trackprofile prints "every track in spec", newsstyle prints
// "clean", and postpipe/newsarc already set an exit code.
//
// THE RULE THAT MATTERS MOST: **no verdict found is a FAIL.** A probe that
// crashed, timed out, or was pointed at a dead server prints no verdict line,
// and the single most dangerous thing this file could do is read that silence
// as consent. Silence is failure here. That is the whole reason it exists.
//
//   node qa/gate.mjs                      # the LIVE profile — everything, all five worlds
//   node qa/gate.mjs --profile=push       # the fast pre-push subset
//   node qa/gate.mjs --profile=art        # the look-and-feel subset
//   node qa/gate.mjs --only=smoke,econ    # named steps only
//   node qa/gate.mjs --list               # what would run, and why each is in
//   node qa/gate.mjs --port=4177          # default 4177
//
// Exit 0 only if every required step passed. Anything else is non-zero, and the
// report says which step and what it printed.
import { spawn } from 'node:child_process';
import os from 'node:os';
import { mkdirSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_WORLDS } from './worlds.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const PORT = flag('port', '4177');
const PROFILE = flag('profile', 'live');
const ONLY = flag('only', '').split(',').filter(Boolean);
const LIST = args.includes('--list');
// ── THE GATE'S OWN WORLD LIST WAS HAND-TYPED ────────────────────────────────
// It said five worlds. SKYLARK FIELD is the sixth, and every per-world step the
// gate fans out below — smoke, traverse, vary, faceparity, questable, postpipe,
// switch, newsarc, hero — reads this line. So the gate would have run thirty-odd
// green steps, none of which had ever loaded world 6, and reported PASS on it.
// A gate that does not know how many worlds the game has is not a gate.
//
// Derived from island.ts's WorldId union now: the union the renderer switches
// on, which tsc forces every dispatch in island.ts to handle, so it cannot
// drift from what the game can actually draw. qa/worldlists.mjs guards the
// remaining hand-typed copies scattered through the other probes.
const WORLDS = ALL_WORLDS;

// ── VERDICT RULES ────────────────────────────────────────────────────────────
// pf     the house convention: a line of "  PASS — ..." and no "  FAIL — ..."
// exit   the probe already sets its own exit code; trust it
// re     an explicit pass/fail pair, for the probes that speak their own dialect
// ── PICKING A VERDICT IS PART OF REGISTERING A STEP ────────────────────────
// pf matches /^\s*(PASS|FAIL)\s*[—-]/ and nothing else, and a probe that prints
// neither is reported as silence — correctly, because a probe that says nothing
// did not run. Three steps were registered pf whose probes speak exit codes and
// print a table of their own: `opening`, `joyedge` and `joyrelease`. All three
// were therefore incapable of passing, and `opening` sat FAIL in the push gate
// with 18 of 18 bars green underneath it. Audited across all 41 pf steps; these
// were the only three. If you add a step, grep the probe for "PASS —" before
// choosing pf.
const pf = { kind: 'pf' };
const exitCode = { kind: 'exit' };
const re = (pass, fail) => ({ kind: 're', pass, fail });

// ── THE SUITE ────────────────────────────────────────────────────────────────
// `why` is not decoration. A gate nobody understands gets deleted the first time
// it is inconvenient, so every step says what it is protecting.
const SUITE = [
  { id: 'typecheck', tier: 'build', profiles: ['push', 'live'], timeout: 300,
    cmd: ['npx', 'tsc', '--noEmit', '-p', 'tsconfig.json'], verdict: exitCode,
    why: 'the build compiles' },

  { id: 'build', tier: 'build', profiles: ['live'], timeout: 600,
    cmd: ['npx', 'vite', 'build'], verdict: exitCode,
    why: 'dist/ is producible from this source, not left over from an older one' },

  ...WORLDS.map(w => ({ id: `smoke:${w}`, tier: 'runs', profiles: w === 'maple' ? ['push', 'live', 'art'] : ['live'],
    timeout: 420, cmd: ['node', 'qa/smoke.mjs', w, PORT], verdict: pf,
    why: `${w} boots, loads every same-origin asset, grows, eats, and makes a sound` })),

  { id: 'traverse', tier: 'runs', profiles: ['live'], timeout: 1300,
    cmd: ['node', 'qa/traverse.mjs', PORT, ...WORLDS], verdict: pf,
    why: 'every size of void can still cross every island — growing never severs the map' },

  { id: 'vary', tier: 'runs', profiles: ['live'], timeout: 1300,
    cmd: ['node', 'qa/vary.mjs', PORT, ...WORLDS], verdict: pf,
    why: 'match 2 is not a replay of match 1, and match 1 is the tuned baseline' },

  { id: 'econ', tier: 'money', profiles: ['push', 'live'], timeout: 420,
    cmd: ['node', 'qa/econ.mjs', PORT], verdict: pf,
    why: 'the streak cliff stays dead, bounties pay once, and a gem spend never touches the parental gate' },

  { id: 'iapdoc', tier: 'money', profiles: ['push', 'live'], timeout: 60,
    cmd: ['node', 'qa/iapdoc.mjs'], verdict: re(/APPSTORE\.md and the client agree on every/, /^FAIL \(\d+\)|NOT IN THE DOC|NOT REGISTERED/m),
    why: 'APPSTORE.md and the client agree on every product id, price, world count and asset path — the doc is pasted into App Store Connect' },

  { id: 'normals', tier: 'art', profiles: ['push', 'live', 'art'], timeout: 60,
    cmd: ['node', 'qa/normals.mjs'], verdict: pf,
    why: 'every geometry type is classified round or flat, and no unreviewed faceted form has appeared' },

  // The hero's face is the strongest identity asset in the product and the one
  // element that must not vary by level. It varied by 65 points of grin-share
  // before qa/faceparity.mjs existed, and nothing in this gate could see it —
  // because a mood table entry, not face code, was what deleted the smile.
  // push profile runs two worlds (the measured best and worst); live runs all
  // five. See docs/STUDIO-ROUND-2.md.
  { id: 'faceparity', tier: 'art', profiles: ['push', 'art'], timeout: 1800,
    cmd: ['node', 'qa/faceparity.mjs', PORT, 'pirate', 'powder'], verdict: pf,
    why: 'the hero wears the same face in every world, and no mood deletes his grin' },

  { id: 'faceparity:all', tier: 'art', profiles: ['live'], timeout: 4200,
    cmd: ['node', 'qa/faceparity.mjs', PORT, ...WORLDS], verdict: pf,
    why: 'the hero wears the same face in all five worlds, and no mood deletes his grin' },

  // The screen the owner asked about by name — "when people first pick a level,
  // how does the level look at first glance?" — and the one where a single
  // overlooked min-height made every world's name unreadable. Measures rendered
  // ink contrast, so it can see a text halo; a backdrop-only bar could only ever
  // be satisfied by darkening posters that are APPROVED.
  { id: 'pickerfit', tier: 'ui', profiles: ['push', 'live', 'art'], timeout: 300,
    cmd: ['node', 'qa/pickerfit.mjs', PORT], verdict: pf,
    why: 'a six-year-old can read every world name and tagline on the picker, whatever poster is behind it' },

  // The one event the whole difficulty curve is built around. A hunter's bite
  // used to be followed about a second later by the EVOLVED card, the sound,
  // the buzz and a newsroom headline congratulating the child on growing —
  // punishment dressed as a reward, and it inflated every evolve number the
  // game reported about itself. Plays a real match, takes a real bite through
  // the real handler, and checks the form comes back while the ceremony does
  // not. live only: it needs a genuine two-form climb, which is minutes.
  { id: 'evolveonce', tier: 'feel', profiles: ['live'], timeout: 1200,
    cmd: ['node', 'qa/evolveonce.mjs', PORT, 'maple'], verdict: pf,
    why: 'a child who is eaten and climbs back is not congratulated for it, and still gets their form back' },

  // The moment a child plays for. The gesture was a SHRINK for the whole of
  // this game's life — -12.3% at 0.15s against +4.6% at 0.47s — while the HUD
  // card scaled UP. Pure maths on the live expression, so it costs nothing and
  // cannot be fooled by which frame a slow renderer happened to sample.
  { id: 'evolvepop', tier: 'feel', profiles: ['push', 'live', 'art'], timeout: 30,
    cmd: ['node', 'qa/evolvepop.mjs'], verdict: pf,
    why: 'evolving reads as getting BIGGER — the pop dominates the wind-up and lands with the sound' },

  // THE VOID IS ALIVE AT SPAWN (studio round 4, Job 8). Three maths probes on
  // the live expressions, same reasoning as evolvepop: each is a pure function
  // of numbers the source already writes down, so evaluating it costs nothing
  // and no slow frame can sample around it. Before the job: full stick read as
  // 0.359 of moving at spawn size and 0.304 at the tail of the descent; hurt
  // squinted with its eyes open at lid 0.30; the bite's wind-up drew nothing
  // (the jaw peaks at 0.119 against a draw threshold of 0.25). The live halves
  // (qa/heromotion.mjs, and moodrule/mouthwind given a port) read the rig.
  { id: 'motionlaw', tier: 'feel', profiles: ['push', 'live', 'art'], timeout: 30,
    cmd: ['node', 'qa/motionlaw.mjs'], verdict: pf,
    why: 'full stick reads as moving at every size, the descent included — the motion law divides by his own top speed' },
  { id: 'moodrule', tier: 'feel', profiles: ['push', 'live', 'art'], timeout: 30,
    cmd: ['node', 'qa/moodrule.mjs'], verdict: pf,
    why: 'no mood squints with its eyes open: an open eye stays at lid 0.6 or above, a shut one is a line' },
  { id: 'mouthwind', tier: 'feel', profiles: ['push', 'live', 'art'], timeout: 30,
    cmd: ['node', 'qa/mouthwind.mjs'], verdict: pf,
    why: 'a bite winds up where a child can see it — the body gathers past his own breath, and is whole as the jaw appears' },

  // THE OPENING BELONGS TO THE PLAYER. Eighteen bars measured against HOLE.IO's own
  // recording: the clock must not move before the first touch, the descent runs
  // ~1.2 s on an ease-in-out with the controls live throughout, the first point
  // lands inside it, the goal card runs on its own timer without blocking input,
  // and the joystick anchors under the thumb rather than jumping to it. Round 7
  // stream A; docs/crews/round-7/streamA.verdict.md carries the numbers.
  //
  // MAPLE ON PUSH, EVERY WORLD ON LIVE — deliberately. Maple is the one world that
  // does not reload on selection, and for most of this stream it was the only world
  // tested: it hid a TAP TO PLAY gate that ate the first touch on the other five,
  // and a first-bite ring whose geometry only worked where the props happened to be
  // large. One world is not evidence about six.
  // EXIT CODE, NOT pf, AND THIS STEP HAS NEVER BEEN ABLE TO PASS. pf wants a
  // line matching /^\s*PASS\s*[—-]/ — "PASS — something". qa/opening.mjs prints
  // a table, one "PASS  A5   descent duration..." row per bar, and then sets its
  // own exit code from the failure count. So the regex never matched, neither
  // verdict was found, and the gate correctly called it silence: "no verdict
  // printed". Registered that way in b0a2f75 and never caught, because the full
  // push gate was not run again until now — 18 of 18 bars green underneath a
  // step reported as FAIL. A probe that sets its own exit code is exactly what
  // `exitCode` is for.
  { id: 'opening', tier: 'feel', profiles: ['push', 'live'], timeout: 900,
    cmd: ['node', 'qa/opening.mjs', 'maple'], verdict: exitCode,
    why: 'the match starts on the first touch, and the player is playing through the camera move' },
  ...WORLDS.map(w => ({ id: `opening:${w}`, tier: 'feel', profiles: ['live'], timeout: 900,
    cmd: ['node', 'qa/opening.mjs', w], verdict: exitCode,
    why: `the opening holds up on ${w}, not just on the world that never reloads` })),

  // unlocks.ts calls the locked art "the advertisement for the next one", and
  // the filter was running that advertisement at a fifth of its colour. Opens
  // the picker in the state a real new player is in — two unlocked, three
  // locked — because every other probe here seeds all five and cannot see it.
  { id: 'lockedcards', tier: 'ui', profiles: ['push', 'live', 'art'], timeout: 300,
    cmd: ['node', 'qa/lockedcards.mjs', PORT], verdict: pf,
    why: 'a child can still tell the locked worlds apart — the art keeps selling the next one' },

  // ── THE QUALITY TIER ─────────────────────────────────────────────────────
  // The owner, after playing a build: "Get a team also on quality."
  //
  // The eight studio teams review SURFACES — is this drawn well. Every one of
  // the six things he reported that day was BEHAVIOUR instead: a collision
  // response that accelerates, an effect that fires too often, a word in a
  // string, a family that never reacts to you. Nothing in the gate could see
  // any of them, which is why he found them and it did not.
  //
  // So the ninth team is not a review meeting, it is this tier. Each step is an
  // instrument with a band at BOTH ends, because every one of these can fail in
  // two directions and the owner named both directions himself: too little and
  // nothing changed, too much and it is a shit show for a six-year-old.
  //
  // It runs as its own profile until each instrument has a green reading, then
  // its steps join push and live. A gate step that has never passed is not
  // protection, it is a blocked pipeline — so they are promoted on evidence,
  // one at a time, and this comment records which are still on probation:
  //   · edgespeed    FIRST GREEN 2026-09-23 — Pirate 1.35x, Maple 0.99x, timed
  //                  on tClock (it had been timing the void on the match clock,
  //                  which hitStop() slows and the void ignores); one more green
  //                  reading and it joins push
  //   · rivalnotice  ON PROBATION — last read 0.0/min in maple, gate open 0%
  //   · ringcount    not a gate step yet; it is a census with no bar, and the
  //                  bar has to come from a measured normal minute, not a guess
  //   · skypop       not a gate step yet; same reason
  { id: 'edgespeed', tier: 'quality', profiles: ['quality'], timeout: 2400,
    cmd: ['node', 'qa/edgespeed.mjs', PORT, 'pirate', 'maple'], verdict: pf,
    why: 'the shore stops, turns or bleeds you off — it never launches you (owner item 3)' },

  { id: 'skyfit', tier: 'quality', profiles: ['push', 'live', 'quality'], timeout: 30,
    cmd: ['node', 'qa/skyfit.mjs'], verdict: pf,
    why: 'the planet, its ring and its glow all fit the sprite canvas — the half-cut planet (round 5)' },
  // TIMEOUTS ON A PER-WORLD SWEEP ARE A FUNCTION OF THE WORLD COUNT, and these
  // were all sized when the sweep was FIVE worlds. Deriving WORLDS from the
  // WorldId union made every one of them 20% longer overnight, which is a step
  // failing on the CLOCK rather than on quality — the least useful red there
  // is. Raised with headroom, because swiftshader in this container runs the
  // match clock at roughly a ninth of real time and the margin is what stops a
  // slow box being reported as a broken game.
  { id: 'purpose', tier: 'quality', profiles: ['push', 'live', 'quality'], timeout: 3600,
    cmd: ['node', 'qa/purpose.mjs', String(PORT), '--secs=30'],
    verdict: pf,
    why: 'the crowd has somewhere to be — a third of every world\'s moving people complete a journey (leave, arrive, stay) in thirty seconds, and the median person walks toward something rather than in circles (round 5, the owner\'s "every person moving, there\'s got to be a purpose behind that")' },
  // TIMEOUT SIZED FROM TWO RUNS, NOT ONE. Six viewports of real-pixel contrast under
  // swiftshader took 611 s on the host that ran the 2026-09-09 green gate and
  // over 900 s on the 2026-09-10 host at the gate's own load of ~3.6 on 4 cores
  // (every step that run was ~1.55x slower, purpose 1515 -> 2294 s). A 900 s
  // ceiling read a slower machine as a red splash; 1800 s is 3x the fast host
  // and ~1.9x the slow one, and is still a SIGKILL if the probe ever hangs.
  { id: 'splash', tier: 'quality', profiles: ['push', 'live', 'quality'], timeout: 1800,
    cmd: ['node', 'qa/firstframe.mjs', String(PORT), 'maple', '--splash',
          '--views=430x932@2,440x956@3,440x814@3,430x740@3,393x700@3,375x667@2'],
    verdict: pf,
    why: 'every line of type on the two screens before the game clears its WCAG bar against the REAL pixels behind its glyphs, on six phones, and the loader neither prints the game\'s name twice nor shows one value on its bar (round 5, the owner\'s own screenshot)' },
  { id: 'albedo', tier: 'quality', profiles: ['push', 'live', 'quality'], timeout: 30,
    cmd: ['node', 'qa/albedo.mjs'], verdict: pf,
    why: 'no saturated albedo on a lit surface under the 0.08 second/dominant bar — the Game Day crimson rule, by search (round 5)' },
  { id: 'ringmeaning', tier: 'quality', profiles: ['quality'], timeout: 900,
    cmd: ['node', 'qa/ringmeaning.mjs', PORT], verdict: pf,
    why: 'the ground ring under a void tells the truth — no sibling\'s own colour can be mistaken for "green = you can eat them, red = RUN", the only danger channel a pre-reader can use' },
  { id: 'rivalnotice', tier: 'quality', profiles: ['quality'], timeout: 2400,
    cmd: ['node', 'qa/rivalnotice.mjs', PORT, 'maple', 'pirate'], verdict: pf,
    why: 'a bigger void reacts to you often enough to notice and rarely enough not to swarm (owner item 1)' },

  { id: 'gamutzero', tier: 'art', profiles: ['art'], timeout: 30,
    cmd: ['node', 'qa/gamutzero.mjs'], verdict: pf,
    why: 'no chromatic surface loses colour channels to the grade — Game Day rendered rgb(168,0,0) out of 0xc4342f' },

  // A COLOUR NOBODY READS IS A LANDMINE. Three times this project has spent a
  // round on a measured, reasoned, committed colour fix that reached no pixel,
  // and every one had the same shape — an authoritative-looking table nothing
  // paints from (biomeColor live for one world of six; GD_FLOOR.lot; the
  // ground desaturation in palette.ts, overpainted by sixty CSS literals). The
  // cost is not the wasted round; it is that the next person to edit the entry
  // gets no pixels and no error and has to find the whole story again.
  // Zero seconds, no browser, no port, no build.
  { id: 'deadpaint', tier: 'art', profiles: ['push', 'live', 'art'], timeout: 30,
    cmd: ['node', 'qa/deadpaint.mjs'], verdict: pf,
    why: 'every colour in the palette is read by something that paints — an entry nothing reads is a comment that lies to whoever edits it next' },

  { id: 'packfresh', tier: 'art', profiles: ['art'], timeout: 30,
    cmd: ['node', 'qa/packfresh.mjs'], verdict: pf,
    why: 'the studio pack is a photograph of THIS source — two rounds were spent on a build that no longer existed' },

  // y = 0 IS THE GROUND PLANE, and until 2026-09-04 nothing checked it. It is
  // the first house rule every prop kit in this game states, and the only proof
  // was qa/placement.mjs — which needs a browser, only sees props that actually
  // got placed, and reports a COORDINATE, so ONE bad factory shows up as
  // hundreds of offences in hundreds of places. SKYLARK FIELD's kit filed 2,477
  // 'sunk' and 43 'float' rows that way; this named the six factories at fault
  // in one static run with no browser and no port.
  { id: 'kitfit', tier: 'art', profiles: ['push', 'live', 'art'], timeout: 180,
    cmd: ['node', 'qa/kitfit.mjs'], verdict: pf,
    why: 'every prop in the newest kit sits on y=0 and is a single merged mesh — nothing floats, nothing is buried, nothing splits into pieces the occlusion fade would ghost separately' },

  // A SEASON IS A WORLD-SHAPED TABLE KEYED BY AN IF-CHAIN, which is the exact
  // shape the world 6 contract counts ~140 of and a compiler catches twelve.
  // This one shipped: Powder Pass wore Lantern Night's moon lanterns for
  // eighteen days a year because nobody wrote a snow-day branch when the fifth
  // world arrived. Zero seconds, no browser, no port.
  // THE OWNER'S SHARPEST COMPLAINT, FINALLY WIRED IN. "Sometimes in certain
  // levels the items may be misplaced — you have trees on roads, the road may
  // not be finished, item placement isn't dialled in." Stream A1 built the
  // auditor for exactly that, measured the game, fixed the bulk of it — and
  // nobody ever registered it. `grep -c placement qa/gate.mjs` was 0 for a
  // week, so the residue A1 recorded has been sitting unguarded with nothing
  // anywhere to notice it growing back.
  //
  // It runs against a FROZEN CEILING (qa/placement.baseline.json), not against
  // zero: clearing 434 offenders across five shipped worlds is a stream of its
  // own. The debt can shrink and can never grow. And a world with no entry in
  // that file has a ceiling of ZERO on every category, which is how SKYLARK
  // FIELD is held to being born perfect.
  //
  // SEED IS PINNED AND IT IS STILL NOT ENOUGH: two SEED=7 runs of this audit on
  // one build gave maple overlap 113 and 116, pirate offisland 5 and 4. The
  // four categories that drift carry +3 of headroom in the baseline and the
  // file says so in its own header. A real regression is bigger than three.
  { id: 'placement', tier: 'quality', profiles: ['push', 'live', 'quality'], timeout: 1800,
    cmd: ['node', 'qa/placement.mjs', 'all', PORT, '--ceiling=qa/placement.baseline.json'],
    env: { SEED: '7' }, verdict: pf,
    why: 'every prop earns the spot it stands on — no tree on a road, no road ending in nothing, nothing inside a building or standing in the sea, measured against a frozen ceiling that can only go down' },

  // THE SCATTER GETS WHAT IT ASKED FOR. This is in PUSH from the day it was
  // written, because the fault it catches shipped silently in five worlds: the
  // repo's LCG multiplied past 2^53, its period collapsed to 10,466 states, and
  // pirate and skylark took 181,318 and 169,139 draws through it. A lapped
  // stream re-proposes ground it has already claimed, so the scatter gives up
  // short — skylark's launchfield asked for 620 props and placed 133, and every
  // screenshot of that world still looked fine.
  // SEED IS PINNED HERE FOR THE REASON IT IS PINNED ON `placement` DIRECTLY
  // ABOVE, and it was not, which is my own miss: this step went into push
  // without it while its three siblings had it. An unpinned bar is a lottery —
  // it came up red on `pirate/beach 0/6` on one roll and green on the next, and
  // neither run could be argued with. Pinning does NOT make the level robust,
  // because a child's device runs unseeded; it makes a failure reproducible so
  // the level can be fixed. The beach ordering fix in island.ts is that fix.
  { id: 'rng', tier: 'quality', profiles: ['push', 'live', 'quality'], timeout: 1800,
    cmd: ['node', 'qa/rng.mjs', 'all', PORT], env: { SEED: '7' }, verdict: exitCode,
    why: 'every prop the level design authored is actually on the island — asked against placed, per district, read off the live page' },

  // THE BOOT SWEEP MUST BE IDEMPOTENT. settleFootprints() runs once and retires
  // every prop that has vanished inside another; run it again over the world it
  // just finished and it must take nothing, because it has already seen every
  // pair and retiring props only ever removes CONTAINERS — which un-buries
  // things rather than burying them. Anything a second pass finds is proof the
  // first walked past that exact pair.
  //
  // IN PUSH NOW, BECAUSE THE SHELL IS GONE. This was registered reporting-only
  // while it failed on one prop — Pirate's shell at (57.5,230.5), inside a
  // tower — rather than given a ceiling to fit the defect. The cause turned out
  // to be an ORDERING bug worth the trouble of finding: the spawn-corridor pass
  // shoved that tower 3.5 units sideways AFTER the burial sweep had run, and it
  // checks only that the destination is on land, never that anything is
  // standing there. Clearing the corridor before the sweep fixed it, and all
  // six worlds now retire nothing on a second pass. It blocks from here.
  { id: 'settle', tier: 'quality', profiles: ['push', 'live', 'quality'], timeout: 1200,
    cmd: ['node', 'qa/settle.mjs', 'all', PORT], env: { SEED: '7' }, verdict: exitCode,
    why: 'the sweep that retires buried props leaves nothing behind for a second pass to find — a prop standing inside a wall is not something a child should be able to meet' },

  // HOW MUCH OF THE SCREEN IS FOOD. Registered in QUALITY and not yet in push,
  // and that is a statement rather than a dodge: three worlds fail F2 today
  // (lantern 1.83 s, gameday 2.11, pirate 3.00 against a 1.5 s bar) and one
  // fails F1 (powder at 11.5% of frame against 20%). Putting it in push now
  // would block every commit on a debt that takes a level-design pass to
  // clear. It runs, it is measured, and the number is visible — which is the
  // difference between a debt and a blind spot. It moves to push the day the
  // six worlds are green.
  { id: 'food', tier: 'quality', profiles: ['quality'], timeout: 2400,
    cmd: ['node', 'qa/food.mjs', PORT], verdict: exitCode,
    why: 'there is enough to eat on screen at spawn, and the twentieth mouthful is not a hike — measured by hiding every edible and rendering the same frame twice' },

  { id: 'seasonprop', tier: 'art', profiles: ['push', 'live', 'art'], timeout: 30,
    cmd: ['node', 'qa/seasonprop.mjs'], verdict: pf,
    why: 'every limited-time season dresses its own world — no world wears another world\'s seasonal props' },

  { id: 'worldlists', tier: 'build', profiles: ['push', 'live', 'art'], timeout: 30,
    cmd: ['node', 'qa/worldlists.mjs'], verdict: pf,
    why: 'no probe in qa/ believes in a game with fewer worlds than exist — the gate itself had a five-world list on the day world 6 shipped, and twenty-three probes were still frozen at world 4' },

  // THE LADDER'S STATE, now complete. Day 3 registered (a)(e)(f)(g)(i); day 4
  // added (b) the goal card and (c) the HUD; day 5 (h) the landmark exclusion
  // and (b)'s win half; day 6 (d) the end card; day 7 (j) the menu's ladder and
  // the picker's thirty dots. Measured legs: the day-3 set 394s, (c) 264s,
  // (d) 150s, (j) 101s, (h) 80s, (b) ~60s — about 1,050s in total. 2400 leaves
  // room for a box under load without hiding a probe that has actually hung.
  { id: 'levels', tier: 'feel', profiles: ['push', 'live'], timeout: 2400,
    cmd: ['node', 'qa/levels.mjs', String(PORT), '--only=a,b,c,d,e,f,g,h,i,j,k,l'], verdict: pf,
    why: 'the ladder agrees with itself about where a child is — thirty dots, one green ring per world, a dot opened only by a goal MET rather than a match merely finished, and a goal the child can actually see on screen while she plays for it' },

  // ── HOW MANY TAPS FROM OPENING THE APP TO PLAYING, ON BOTH SIDES OF MIDNIGHT
  // The bar is ONE, and it was one on the day any probe ran and not on the day
  // after: 383 files in this directory seed voidDailyLast to today, so the
  // daily calendar was a screen this suite did not have. MEASURED on the build
  // before the fix — with the date one day stale PLAY could not be CLICKED AT
  // ALL (page.click, 60s timeout, #daily covering it), and after a full
  // finished match voidDailyLast was still yesterday's, so the day never rolled
  // without somebody pressing a word a five-year-old cannot read.
  //
  // The third bar guards the MONEY, and it is the reason this step exists at
  // all rather than a one-line assertion somewhere: the daily reward and the
  // match reward land in the same wallet, so "she still gets paid" is only
  // checkable against what the calendar itself says today owes (__dailyDue()).
  // Measured at 177s.
  { id: 'taps', tier: 'feel', profiles: ['push', 'live'], timeout: 900,
    cmd: ['node', 'qa/taps.mjs', String(PORT)], verdict: pf,
    why: 'it is ONE tap from opening the app to playing, on her second morning as much as her first — and the day she is owed is paid without her having to read the word CLAIM' },

  // ── THE LADDER'S TWO MOMENTS OF MOTION, AND ITS STILLNESS ────────────────
  // Day 10. Two of these bars could not have been written earlier and one of
  // them fails the build that shipped before it: the menu's "you are here" ring
  // carried `animation: … infinite` from day 7, which MENU-BRIEF §5.1 bar 4
  // (zero changed pixels inside the pips on a settled menu) can never pass. The
  // same class of motion had already cost a gate step once — the end card's copy
  // of the ring kept Playwright from finding two stable frames to click PLAY
  // AGAIN on (econ, 30s timeout, "element is not stable") — so this is the
  // second time an endless animation on this game's furniture has been paid for,
  // and the first time anything measures it.
  //
  // Seven bars over seven page loads, one of them a real 8-second match, and the
  // hop's own beats are sampled over a window sized for this sandbox's 0.4-2.9
  // fps rather than a phone's 60. Measured at 441 s on an idle box — of which 200 s
  // is bar 7's real 8-second match, which at this sandbox's ~14x clock is nearly
  // two wall minutes of play plus the whole end card. 1800 leaves room for a box
  // under load without hiding a probe that has actually hung.
  { id: 'reveal', tier: 'feel', profiles: ['push', 'live'], timeout: 1800,
    cmd: ['node', 'qa/reveal.mjs', String(PORT)], verdict: pf,
    why: 'the ladder moves exactly twice — the dot she played flips, then the ring hops to the one she opened — and is otherwise perfectly still, because a menu that animates forever is a menu a child never finishes reading and a button Playwright can never find stable' },

  // THE HERO ON THE SCREEN THAT SELLS THE GAME. Two bugs older than the picker
  // itself, and a third bar that is the diorama's licence to exist.
  //
  // The menu scales the void to the stage and the game derives his FORM from his
  // RADIUS, so his creature was a function of how far back each world's
  // photogenic corner happened to sit — Maple wore one animal and the other five
  // wore another. Worse, the evolution check ran on the menu with curStage at 0,
  // so every load fired a full ceremony for a form nobody played for: the sound,
  // the camera punch, the newsroom, the haptic, and track('evolve'), which means
  // the analytics counted a phantom evolution per session. Neither was visible by
  // looking, because the EVOLVED card itself is suppressed under the title card.
  //
  // Bar 3 is the one that matters going forward: it moves his menu radius to 17
  // and requires the creature not to change. That is what lets the diorama pull
  // the camera back to frame a whole block — 178 units against today's 58-95 —
  // without promoting him to WORLD ENDER on the level picker, flash, shake and
  // all. Measured 68 s; the 900 is headroom for the display-radius spring, which
  // this sandbox walks at 0.4-2.9 fps.
  { id: 'menuform', tier: 'feel', profiles: ['push', 'live'], timeout: 900,
    cmd: ['node', 'qa/menuform.mjs', String(PORT)], verdict: pf,
    why: 'a child meets the same hero every time she opens the picker, the menu never congratulates her for an evolution she did not play, and his size can change without changing him' },

  // THE GOAL CHIP MUST NOT SIT ON THE CLOCK. Day 4 added a second HUD chip to a
  // corner that already had the timer in it, and the two are sized by different
  // rules — the timer's font scales with the viewport, the chip's height does not.
  // Four viewports from a small phone to an iPad, measuring the real rendered
  // boxes. Measured 214 s.
  { id: 'chipfit', tier: 'ui', profiles: ['push', 'live', 'art'], timeout: 600,
    cmd: ['node', 'qa/chipfit.mjs', PORT], verdict: pf,
    why: 'the goal chip and the match clock never overlap on any phone or tablet — a child who cannot read the clock cannot feel the ending' },

  // THE GATE'S OWN HOUSEKEEPING, and the only step that judges the other steps.
  // Static, no browser, ~1 s. Six guards: the registry parses whole (a parser gap
  // that could not cross `env: { SEED: '7' }` once dropped four steps in silence),
  // every pf-judged probe can print BOTH verdicts (a probe that can only print
  // PASS is a probe that cannot fail), no registered probe still drives the
  // retired PLAY-to-picker ritual or waits for a modal the calendar no longer
  // raises, every probe that finishes a match and reads the wallet says which
  // side of midnight it is on, and every registered file exists.
  { id: 'idiomguard', tier: 'build', profiles: ['push', 'live', 'art'], timeout: 60,
    cmd: ['node', 'qa/idiomguard.mjs'], verdict: pf,
    why: 'the gate can still fail — a suite whose probes have quietly lost the ability to print FAIL is a suite that reports green forever' },

  // ── THE DAILY, NOW THAT IT IS OFF THE PLAY PATH ──────────────────────────
  // Three probes written against the old calendar, repointed and registered. All
  // three used to press #dailyClaim, a button that no longer exists — and
  // `?.click()` on null is a NO-OP, not a failure, so each of them went on
  // printing bars while asserting against a claim that never ran. They were
  // unregistered, which is the only reason that was not a green lie in the gate.
  // They drive __claimDaily() now, which IS claimDaily() — the same call endMatch
  // makes, not a QA re-implementation of it.
  //
  // streakunlock is the one that earns its keep: the seven-day prize (Prism) is
  // granted inside setStreak, and moving the claim from a button on the MENU to
  // the end of a MATCH moved where its unlock card has to paint. Measured 67 s,
  // and it confirms the prize still announces itself.
  { id: 'streakunlock', tier: 'feel', profiles: ['push', 'live'], timeout: 600,
    cmd: ['node', 'qa/streakunlock.mjs', String(PORT)], verdict: pf,
    why: 'a child who comes back seven mornings running is TOLD she won something — the prize used to be granted by a line inside the shop\'s own refresh(), so it arrived only if she happened to open the shop later' },

  // The streak is counted ONCE. Two pages: claim-then-play, and play-then-claim.
  // Measured 183-468 s — the spread is this sandbox's frame rate, since both
  // halves play a real match to the buzzer.
  { id: 'streakdrift', tier: 'feel', profiles: ['push', 'live'], timeout: 1200,
    cmd: ['node', 'qa/streakdrift.mjs', String(PORT)], verdict: pf,
    why: 'the streak counts a day once however she spends it — two counters advancing independently is how a child reaches day 7 on day 5, or never' },

  // INVERTED from what it used to assert. The original finding was real: an
  // unclaimed day put a full-screen card up over a match that had already
  // started, with the clock running and the load cover on top of the card. The
  // first fix made the launch WAIT for the card; that fix is gone, because a card
  // standing between a child and PLAY is a tollbooth. So the bars now say NOTHING
  // interrupts — and if the tollbooth ever comes back, this fails. Measured 51 s.
  { id: 'dailyrace', tier: 'feel', profiles: ['push', 'live'], timeout: 600,
    cmd: ['node', 'qa/dailyrace.mjs', String(PORT)], verdict: pf,
    why: 'an owed day interrupts nothing — she taps PLAY and plays, and the day is still owed at the buzzer' },

  // NOBODY TALKS ON THE LEVEL PICKER. A speech bubble is a callout and works only
  // when it points at a legible speaker; on the menu it cannot, and the shipped
  // picker was showing one anyway. Measured off the menu screenshots: five of six
  // worlds carried one, 172-258 px wide against a 430 px screen, and four of the
  // five were pinned against a clamp limit — so the tail pointed at its own box
  // rather than at anyone. The camera is 58-95 units back, which puts an adult at
  // 89 px among dozens of identical figures: even a perfectly aimed tail could not
  // say which dot is talking.
  //
  // Bar C is the one that earns its keep. A spawn gate cannot cover a bubble
  // say() has already returned for, and three paths carry one into the menu —
  // leaving a match, HOME from the end card, endShop — so the fix needs a
  // per-frame retire as well, and this reaches the menu the way a child does
  // after a match rather than only from boot. Measured 219 s.
  { id: 'menuquiet', tier: 'feel', profiles: ['push', 'live'], timeout: 900,
    cmd: ['node', 'qa/menuquiet.mjs', String(PORT)], verdict: pf,
    why: 'the first screen a child sees is not covered by a speech bubble pointing at nobody — and the town still talks everywhere else' },

  { id: 'stickerreg', tier: 'quality', profiles: ['push', 'live'], timeout: 30,
    cmd: ['node', 'qa/stickerreg.mjs'], verdict: pf,
    why: 'every world hides things worth finding and every season is something a child can hunt — a world with no stickers ships a picker card whose invitation reads "✨ 0 SECRETS"' },

  { id: 'beattruth', tier: 'feel', profiles: ['push', 'live'], timeout: 30,
    cmd: ['node', 'qa/beattruth.mjs'], verdict: pf,
    why: 'every beat that announces something makes it happen — the cue dispatch was a three-name whitelist, so POWDER PASS\'s avalanche had never fired and SKYLARK FIELD\'s whale went up over a whale that lay there' },

  { id: 'worldreg', tier: 'build', profiles: ['push', 'live', 'art'], timeout: 30,
    cmd: ['node', 'qa/worldreg.mjs'], verdict: pf,
    why: 'every per-world table knows every world the game renders — a missing row is never a crash, it is a silent `?? maple` and a world quietly running on another world\'s numbers' },

  { id: 'skyland', tier: 'quality', profiles: ['push', 'live'], timeout: 90,
    cmd: ['node', 'qa/skyland.mjs'], verdict: pf,
    why: 'SKYLARK FIELD has ground to stand on — placeable >= 56% (shipped 41%), the child spawns in arrivals (shipped: the rough), and the whale is inside the fixed camera\'s frame when controls go live (shipped: 66 degrees out of it)' },

  { id: 'airfield', tier: 'quality', profiles: ['push', 'live'], timeout: 30,
    cmd: ['node', 'qa/airfield.mjs'], verdict: pf,
    why: 'SKYLARK FIELD is a real airfield — runway designators match their headings, the perimeter closes, the launch circle sits on the true crossing, spawn is off the strips and every district has room to stand in' },

  { id: 'formsep', tier: 'art', profiles: ['push', 'live', 'art'], timeout: 60,
    cmd: ['node', 'qa/formsep.mjs'], verdict: pf,
    why: 'every palette colour can show a shape under its own world\'s key — a prop whose top and side render the same colour has no form, measured as CIE76 dE with no renderer involved' },

  { id: 'blackprops', tier: 'art', profiles: ['push', 'live', 'art'], timeout: 120,
    cmd: ['node', 'qa/blackprops.mjs'], verdict: pf,
    why: 'no prop face renders as a flat black hole — every pure-black region in a shipped frame is concave enough to be a shadow' },

  // Studio round 4, Job 3 (B1): Maple's leaf drifts and the protest's worn
  // patch land on grass only. A diff of the bake against ?qaleaves=0 with
  // Math.random seeded in both, so every changed texel is leaf paint.
  // Measured 16,866 leaf texels off the grass before, 7 after (bar 20).
  { id: 'leafsurface', tier: 'art', profiles: ['push', 'live', 'art'], timeout: 900,
    cmd: ['node', 'qa/leafsurface.mjs', PORT], verdict: pf,
    why: 'the leaves are on the grass — no drift painted onto the square\'s walks, the paving or the pond reads as a stain in the opening frame' },

  // Studio round 4, Job 5 (B7): glow means a light. The census renders the
  // frame linear, as RenderPass hands it to bloom, and counts pixels over the
  // bloom cut that are not a light. Maple failed on its white planters (75
  // cells at L 1.18 against a 1.05 cut), Pirate on lacquered blossoms (2 cells,
  // specular sparks at 2.6); 0 and 0 after the per-world cut and the petal
  // sheen. Art + live until a second green promotes it.
  { id: 'halocensus', tier: 'art', profiles: ['live', 'art'], timeout: 1500,
    cmd: ['node', 'qa/halocensus.mjs', PORT, 'maple'], verdict: pf,
    why: 'nothing but a light crosses the bloom threshold in Maple\'s opening frame — no white paint wearing a lamp\'s halo' },
  { id: 'halocensus-pirate', tier: 'art', profiles: ['live', 'art'], timeout: 1500,
    cmd: ['node', 'qa/halocensus.mjs', PORT, 'pirate'], verdict: pf,
    why: 'no flower, float or painted thing on the bay throws a specular spark past the bloom threshold' },

  { id: 'roundlod', tier: 'art', profiles: ['push', 'live', 'art'], timeout: 30,
    cmd: ['node', 'qa/roundlod.mjs'], verdict: pf,
    why: 'no NEW round thing ships under the 14x10 bar island.ts states — the debt is frozen at 153 and visible every run' },

  { id: 'wayfind', tier: 'feel', profiles: ['push', 'live'], timeout: 900,
    cmd: ['node', 'qa/wayfind.mjs', '4177', 'maple'], verdict: pf,
    why: 'the arrow points AT the landmark from every bearing, including the half of the world behind the camera where project() mirrors x and y — and it stays down until she is big enough to eat the thing (the owner: "give some form of guidance to finish the level")' },

  { id: 'formcall', tier: 'feel', profiles: ['push', 'live'], timeout: 900,
    cmd: ['node', 'qa/formcall.mjs', '4177', 'maple'], verdict: pf,
    why: 'the new form name lands ABOVE his head and never on his face, along the whole 0.8s path and not merely at one instant — swept over the ladder as pure geometry, with one live check that the box it places from is where the camera says he is (the owner: "instead of level up we use the names")' },

  { id: 'headclear', tier: 'art', profiles: ['push', 'live', 'art'], timeout: 900,
    cmd: ['node', 'qa/headclear.mjs', '4177', 'maple'], verdict: pf,
    why: 'no hand prop is drawn through its carrier\'s own face — the arm\'s vertices are transformed into the head group\'s space and tested against the skull ellipsoid, twice seconds apart, so a sign welded into a skull (the placard: 7 of 9 carriers, every frame) is told apart from an arm that swings through one for a frame' },

  { id: 'assetrefs', tier: 'build', profiles: ['push', 'live', 'quality'], timeout: 30,
    cmd: ['node', 'qa/assetrefs.mjs'], verdict: pf,
    why: 'every /assets path the game asks for resolves somewhere — 153 references expanded from the same tables the game reads, classified on-disk / rewritten / nowhere, with the ones that resolve nowhere frozen BY NAME so the debt can only shrink (the count is not written here: it was 35 in this string for a day after it became 34 — run the step) (scripts/asset-refs.mjs matches one pattern and sees 16 of them, which is how a whole world shipped with no stickers)' },

  { id: 'ladderflag', tier: 'ui', profiles: ['push', 'live'], timeout: 600,
    cmd: ['node', 'qa/ladderflag.mjs', '4177'], verdict: pf,
    why: 'the flag points at the dot she is on and clears the world switcher, and a world she has BEATEN (five passed, not four passed and one ran out of clock) drops the flag, goes gold, says PICK ANY LEVEL and keeps the ring on the dot PLAY launches (the owner: "after they beat the last level for that world that world become permanently unlocked in like a level picker")' },

  { id: 'calmcards', tier: 'ui', profiles: ['push', 'live'], timeout: 600,
    cmd: ['node', 'qa/calmcards.mjs', '4177'], verdict: pf,
    why: 'nothing a child has to read disappears when the phone asks for less motion — every card whose animation IS its visibility keeps its full run under prefers-reduced-motion (before: all four at 0ms), measured by walking the card\'s own timeline rather than watching wall-clock frames' },

  { id: 'pictograph', tier: 'ui', profiles: ['push', 'live'], timeout: 600,
    cmd: ['node', 'qa/pictograph.mjs', '4177'], verdict: pf,
    why: 'no emoji on a screen a child looks at — MENU-BRIEF 1.4 ends by naming this bar ("fails on any emoji or dingbat") and it was never built. An emoji is the PLATFORM’s art, in Apple’s colour and line weight, beside a HUD we drew ourselves, and it changes under the player when the OS updates. Walks the DOM rather than the source, because 46,075 of the first grep’s 58,495 hits were the ─ in comment headers. Unicode’s own Emoji_Presentation property draws the line, so ✦, ✓ and ★ stay legal as typography we set. Ten offenders on shop/picker/profile are frozen BY NAME and printed every run' },

  { id: 'calmlist', tier: 'ui', profiles: ['push', 'live'], timeout: 600,
    cmd: ['node', 'qa/calmlist.mjs', '4177'], verdict: pf,
    why: 'the reduced-motion contract is a hand-written list and this reads it back — every rule that STARTS an animation must have one that stops it under calm, asked of the CSSOM rather than of the file. It found the drag tutorial ignoring the setting entirely (an infinitely looping hand for a child who asked for less motion) and a locked-tap shake that named wShake against a keyframes called wshake and so had never once played. Twenty-nine further offenders are frozen BY NAME, so a fix is a deletion and a new omission is a red' },

  { id: 'navtap', tier: 'art', profiles: ['push', 'live', 'art'], timeout: 600,
    cmd: ['node', 'qa/navtap.mjs', '4177'], verdict: pf,
    why: 'every control on the front door clears 44x44, no label is cut off inside its own button at 375pt, and the door to the worlds is not smaller than the trophy shelf (the owner: "it\'s basic and over complicated for navigation")' },

  { id: 'peoplefacet', tier: 'art', profiles: ['push', 'live', 'art'], timeout: 30,
    cmd: ['node', 'qa/peoplefacet.mjs'], verdict: pf,
    why: 'the walking people are curves and not prisms — every part wide enough for a facet to read carries at least the 14 sides island.ts states, measured as the straight edge in screen pixels at the closest the camera ever settles (the owner, twice: "the people in game as like Lego")' },

  { id: 'safety', tier: 'words', profiles: ['push', 'live'], timeout: 60,
    cmd: ['node', 'scripts/safety-scan.mjs'], verdict: exitCode,
    why: 'no retired vocabulary in any string a child can read — the 4+ rating depends on it' },

  { id: 'privacy', tier: 'money', profiles: ['push', 'live'], timeout: 60,
    cmd: ['node', 'qa/privacy.mjs'], verdict: pf,
    why: 'nothing identifying leaves a six-year-old\'s phone, and the privacy manifest ships and says so' },

  { id: 'iosname', tier: 'money', profiles: ['push', 'live'], timeout: 30,
    cmd: ['node', 'qa/iosname.mjs'], verdict: pf,
    why: 'the iOS home-screen label matches capacitor.config.ts — cap sync never fixes this one' },
  // A DOOR THAT WAS SHUT, THEN REOPENED BY A TESTING HATCH. store3d.ts's header
  // says the web build must never grant a paid item; `?iapmock=1` granted every
  // one to anyone who typed it after the live URL. Measured on the build that
  // shipped before 922e090: a public hostname's legendary card read "BUY · $2.99".
  // In push because it is money and it is cheap to reopen by accident.
  { id: 'iapmockhost', tier: 'money', profiles: ['push', 'live'], timeout: 1500,
    cmd: ['node', 'qa/iapmockhost.mjs', PORT], verdict: pf,
    why: '?iapmock=1 cannot hand a paid item over on a public hostname — a tapped legendary card says ON THE APP STORE there, and still says BUY at 127.0.0.1 so the QA probes that test purchases keep working' },

  // G1 (research governor, P0): the first match a child ever plays is Maple
  // dot 1 from its first armed frame, no match turns the clock red or says EAT
  // FASTER, and dot 4 in solo still brings the family. Measured failing on the
  // pre-fix build (goal 0; timer rgb(255,138,138) + "EAT FASTER!!"; joined 0/3).
  { id: 'firstrun', tier: 'play', profiles: ['push', 'live', 'quality'], timeout: 2400,
    cmd: ['node', 'qa/firstrun.mjs', PORT], verdict: pf,
    why: 'a cold install opens on Maple dot 1, no match nags with a red clock, and solo cannot turn the dot-4 race into a free win' },

  // G6 (research governor, P1): one number stream a child can read — no
  // per-bite '+N', no decimal COMBO, flights sized against her own recent
  // average, crowns at every tenth link, one cash-in when the chain lapses,
  // the NOMS pill off his face, the beat's colour on the numbers. Measured
  // 8/8 BAD on the pre-fix build, 8/8 PASS after. Quality + live until a
  // second green reading promotes it to push.
  { id: 'nomstream', tier: 'feel', profiles: ['live', 'quality'], timeout: 3000,
    cmd: ['node', 'qa/nomstream.mjs', PORT], verdict: pf,
    why: 'one number stream a child can read, and an eating chain she can see and hear pay out' },

  // The pre-merge review and its verify pass: a pause holds the chain, the
  // reduced-motion number stays up long enough to read, and the end beat
  // belongs to the whistle — no crown on the winning bite, a pause holds the
  // outro, and leaving from inside it means leaving. Each measured failing on
  // the build before its fix. Quality + live until a second green.
  { id: 'pausechain', tier: 'feel', profiles: ['live', 'quality'], timeout: 1800,
    cmd: ['node', 'qa/pausechain.mjs', PORT], verdict: pf,
    why: 'a pause holds the eating chain — no cash-in chime under the sheet, and the chain is still there when she comes back' },
  { id: 'calmnumber', tier: 'feel', profiles: ['live', 'quality'], timeout: 1800,
    cmd: ['node', 'qa/calmnumber.mjs', PORT], verdict: pf,
    why: 'under reduced motion every points number stays up long enough to read — a still number, not a one-frame flash' },
  { id: 'endbeat', tier: 'feel', profiles: ['live', 'quality'], timeout: 3000,
    cmd: ['node', 'qa/endbeat.mjs', PORT], verdict: pf,
    why: 'the whistle owns the end: no crown on the bite that wins, a pause holds the outro, and leaving from inside it lands on the menu with no results card and no fanfare' },

  { id: 'questable', tier: 'money', profiles: ['live'], timeout: 1600,
    cmd: ['node', 'qa/questable.mjs', PORT, ...WORLDS], verdict: pf,
    why: 'over a year of draws, no world can show a daily chip a child cannot clear' },

  { id: 'juice', tier: 'feel', profiles: ['live', 'art'], timeout: 420,
    cmd: ['node', 'qa/juice.mjs', PORT], verdict: pf,
    why: 'a bite is answered on at least three channels, not one' },

  { id: 'aftermatch', tier: 'feel', profiles: ['live'], timeout: 420,
    cmd: ['node', 'qa/aftermatch.mjs', PORT], verdict: pf,
    why: 'the menu theme comes home after TIME!, by both ways out' },

  { id: 'uisystem', tier: 'ui', profiles: ['push', 'live', 'art'], timeout: 300,
    cmd: ['node', 'qa/uisystem.mjs', PORT], verdict: pf,
    why: 'every computed font weight is a face that exists and every size is readable' },

  ...WORLDS.map(w => ({ id: `postpipe:${w}`, tier: 'art', profiles: ['live', 'art'], timeout: 420,
    cmd: ['node', 'qa/postpipe.mjs', w, PORT, '--gate'], verdict: exitCode,
    why: `${w} renders through one colour pipeline: composed matches direct, the hero survives, the sky is a dome` })),

  ...WORLDS.map(w => ({ id: `switch:${w}`, tier: 'runs', profiles: ['live'], timeout: 420,
    cmd: ['node', 'qa/switch.mjs', w, PORT], verdict: pf,
    why: `switching to ${w} reloads, lands on the gate, and the tap starts a scored match` })),

  // Promoted to the push profile in round 5. It is a one-second static read of
  // five source files with no browser and no port, and on the run that added
  // POWDER PASS to its world list it immediately found seven shipped lines
  // whose worst-case token fill overruns the ticker. A check that cheap, which
  // catches that, has no business waiting for the live profile.
  { id: 'newsstyle', tier: 'words', profiles: ['push', 'live'], timeout: 120,
    cmd: ['node', 'qa/newsstyle.mjs'], verdict: re(/^clean$/m, /\d+ problem\(s\)/),
    why: 'the newsroom house style holds across every world and every beat' },

  // THE POOLS ARE NOT THE PAPER. newsstyle reads what the newsroom COULD say
  // and newsarc reads the shape of the beats; neither can see what the picker,
  // the anti-repeat memory and the tier weighting actually put on the ticker
  // one card after another, which is the only thing a child ever meets. SEED
  // is pinned so a failure is reproducible rather than a story about a seed.
  { id: 'newsfeed', tier: 'words', profiles: ['push', 'live'], timeout: 2400,
    cmd: ['node', 'qa/newsfeed.mjs', PORT], env: { SEED: '7' }, verdict: pf,
    why: 'the aired sequence holds: no headline twice inside one match, no run of four cards opening on the same word, no token reaching the child as braces' },

  ...WORLDS.map(w => ({ id: `newsarc:${w}`, tier: 'words', profiles: ['live'], timeout: 600,
    cmd: ['node', 'qa/newsarc.mjs'], env: { ARC_WORLD: w }, verdict: exitCode,
    why: `${w} tells a story in order: morning never mentions the void, nothing repeats, a landmark gets named` })),

  { id: 'fresh', tier: 'words', profiles: ['live'], timeout: 300,
    cmd: ['node', 'qa/fresh.mjs', PORT], verdict: pf,
    why: 'the crowd never repeats itself, and never buys freshness by developing favourites' },

  { id: 'joyedge', tier: 'feel', profiles: ['live'], timeout: 420,
    cmd: ['node', 'qa/joyedge.mjs', PORT], verdict: exitCode,
    why: 'a thumb near the bezel drives the void as far as a thumb in the middle' },

  { id: 'joyrelease', tier: 'feel', profiles: ['live'], timeout: 420,
    cmd: ['node', 'qa/joyrelease.mjs', PORT], verdict: exitCode,
    why: 'every way a drive can end actually stops the void — lift, backgrounded, hidden, paused' },

  ...WORLDS.map(w => ({ id: `hero:${w}`, tier: 'art', profiles: ['live', 'art'], timeout: 300,
    cmd: ['node', 'qa/hero.mjs', w, PORT], verdict: pf,
    why: `the void is legible in ${w}'s opening frame, not buried behind scenery` })),

  { id: 'trackprofile', tier: 'audio', profiles: ['live'], timeout: 300, optional: 'FFMPEG_BIN',
    cmd: ['node', 'qa/trackprofile.mjs', '--gate'], verdict: exitCode,
    why: 'every shipped track is mastered to the house spec (-16 LUFS, <=-1 dBTP)' },
];

// ── THE SELF-TEST ────────────────────────────────────────────────────────────
// A gate nobody has watched fail is not a gate, it is a green light with no bulb
// behind it. `--selftest` runs three synthetic steps whose right answers are
// known and asserts this file gets all three right — in particular the third,
// which is the one that matters: a probe that CRASHES prints no verdict, and the
// only dangerous mistake this file could make is reading that silence as consent.
const SELFTEST = [
  { id: 'selftest:says-pass', tier: 'selftest', profiles: [], timeout: 30, expect: true,
    cmd: ['node', '-e', "console.log('\\n  PASS — a probe that reached its conclusion\\n')"], verdict: pf,
    why: 'a probe that prints PASS is read as a pass' },
  { id: 'selftest:says-fail', tier: 'selftest', profiles: [], timeout: 30, expect: false,
    cmd: ['node', '-e', "console.log('\\n  FAIL — two channels answered, contract is three\\n')"], verdict: pf,
    why: 'a probe that prints FAIL is read as a fail' },
  { id: 'selftest:crashes', tier: 'selftest', profiles: [], timeout: 30, expect: false,
    cmd: ['node', '-e', "console.error('Error: connect ECONNREFUSED 127.0.0.1:4177'); process.exit(0)"], verdict: pf,
    why: 'a probe that crashes prints no verdict and exits 0 — silence must read as FAIL, never as consent' },
  { id: 'selftest:hangs', tier: 'selftest', profiles: [], timeout: 3, expect: false,
    cmd: ['node', '-e', "setTimeout(() => {}, 60000)"], verdict: pf,
    why: 'a probe that hangs is killed and read as a fail, not left to stall the gate' },
];

// ── --only NARROWS THE PROFILE. IT DOES NOT REPLACE IT. ─────────────────────
// This read `ONLY.length ? <name match> : <profile match>`, so naming a step
// dropped the profile filter entirely — and because a name also matches its
// per-world children (`opening` matches `opening:pirate`), `--only=opening` on
// the PUSH profile silently ran six LIVE-only steps the push gate has never run.
// Five of them failed, on a build where they had always failed, and it read as a
// regression in the run that pulled them in. That cost a worktree, a second build
// and a diagnosis to establish "not mine".
//
// A profile is the claim being made ("this is what has to be true to push"), and
// a filter should never widen it. `--profile=live --only=opening` is how you ask
// for the live ones.
const chosen = args.includes('--selftest') ? SELFTEST
  : SUITE.filter(s => s.profiles.includes(PROFILE)
      && (!ONLY.length || ONLY.some(o => s.id === o || s.id.startsWith(o + ':'))));

if (LIST) {
  console.log(`\n  GATE — profile "${PROFILE}", ${chosen.length} step(s)\n`);
  let tier = '';
  for (const s of chosen) {
    if (s.tier !== tier) { tier = s.tier; console.log(`  ── ${tier.toUpperCase()}`); }
    console.log(`     ${s.id.padEnd(18)} ${s.why}`);
  }
  console.log('');
  process.exit(0);
}

// ── PREFLIGHT ────────────────────────────────────────────────────────────────
// Three ways to gate a build that is not the build you think it is. Each of
// these has cost this project a session.
const pre = [];
const needsBrowser = !args.includes('--selftest') && chosen.some(s => s.cmd[0] === 'node');
if (needsBrowser) {
  const up = await fetch(`http://127.0.0.1:${PORT}/`, { signal: AbortSignal.timeout(4000) })
    .then(r => r.ok).catch(() => false);
  if (!up) pre.push(`no preview server on :${PORT} — every browser probe below would fail for the wrong reason.\n     npx vite preview --port ${PORT} --strictPort`);
}
// Is dist/ actually this source? A gate run against a stale bundle is worse than
// no gate, because it passes.
if (!args.includes('--selftest')) try {
  const newest = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((m, e) => {
    const p = join(dir, e.name);
    return Math.max(m, e.isDirectory() ? newest(p) : statSync(p).mtimeMs);
  }, 0);
  const src = Math.max(newest('src'), statSync('index.html').mtimeMs);
  const dist = statSync('dist/index.html').mtimeMs;
  if (src > dist) pre.push(`dist/ is OLDER than src/ — you would be gating a stale bundle. Run: npx vite build`);
} catch { pre.push('dist/index.html is missing — run: npx vite build'); }

if (pre.length) {
  console.log('\n  GATE ABORTED — preflight\n');
  for (const m of pre) console.log(`   ✗ ${m}`);
  console.log('\n  Nothing was measured. This is not a FAIL of the game.\n');
  process.exit(2);
}

// ── RUN ──────────────────────────────────────────────────────────────────────
// ── KILL THE STRAYS, AND THEN CHECK THAT THEY DIED ────────────────────────
// This used to be one line and it had never once worked:
//
//   pkill -f 'chrome-linux/chrome'; pkill -f 'pw-browsers/chromium'
//
// `pkill -f` matches the FULL COMMAND LINE of every process, and the `bash -c`
// carrying that string has both patterns inside its own command line. So the
// first pkill terminated the cleanup shell — status 143, SIGTERM — and the
// second, the one that kills the browser every probe in this directory
// actually launches, never ran. The evidence is qa/_day4_straytest.sh.
//
// The consequence was a step's browser surviving into the next step, which is
// trap #6 in docs/HANDOFF.md ("Zombie Chromium starves later probes into
// timeouts") written down as a hazard rather than as this live bug. It cost a
// day-4 gate run: `splash` went red on a 30-second screenshot timeout, and the
// same build passed 6/6 views the moment the stray was killed by hand.
//
// Two fixes. A bracketed character in each pattern, so a pattern can never
// match the shell that carries it. And a WAIT: pkill returns the instant it
// has signalled, not when the process is gone, so the old shape would have
// raced even if it had run. This escalates to SIGKILL and reports anything
// that outlives both.
const strays = () => new Promise(res => {
  const k = spawn('bash', ['-c',
    "alive() { pgrep -fc 'chrome-[l]inux/chrome|pw-browsers/[c]hromium' 2>/dev/null | head -1; }; "
    + "for i in 1 2 3 4 5 6 7 8 9 10; do "
    + "n=$(alive); n=${n:-0}; "
    + "[ \"$n\" -eq 0 ] 2>/dev/null && exit 0; "
    + "if [ $i -le 3 ]; then pkill -f 'chrome-[l]inux/chrome' 2>/dev/null; pkill -f 'pw-browsers/[c]hromium' 2>/dev/null; "
    + "else pkill -9 -f 'chrome-[l]inux/chrome' 2>/dev/null; pkill -9 -f 'pw-browsers/[c]hromium' 2>/dev/null; fi; "
    + "sleep 0.4; done; "
    + "n=$(alive); n=${n:-0}; "
    + "[ \"$n\" -eq 0 ] 2>/dev/null || echo \"   ! $n browser process(es) outlived SIGKILL — the next step starts on a busy box\"; "
    + "true"]);
  let out = '';
  k.stdout.on('data', (d) => { out += d; });
  k.on('close', () => { if (out.trim()) console.log(out.trimEnd()); res(); });
});

const run = (step) => new Promise(res => {
  const t0 = Date.now();
  const c = spawn(step.cmd[0], step.cmd.slice(1), {
    env: { ...process.env, ...(step.env || {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '', killed = false;
  const timer = setTimeout(() => { killed = true; c.kill('SIGKILL'); }, step.timeout * 1000);
  c.stdout.on('data', d => { out += d; });
  c.stderr.on('data', d => { out += d; });
  c.on('close', (code) => {
    clearTimeout(timer);
    const ms = Date.now() - t0;
    if (killed) {
      // ── A TIMEOUT IS NOT A FAILING PROBE, AND SAYING SO MATTERS ───────────
      // smoke:maple passes in about 325s against a 420s budget. Run the gate
      // while eighteen studio subagents are competing for four cores and it
      // crosses 420 without anything being wrong with the game — a RED that
      // means "this machine was busy", printed identically to a RED that means
      // "the game is broken". A gate whose reds cannot be told apart is a gate
      // people learn to re-run rather than read, which is the whole failure
      // mode this file exists to prevent.
      //
      // So the load at kill time is recorded next to the verdict. It stays a
      // FAIL — silence is failure, and a probe that did not finish did not
      // reach a conclusion — but the reader is told which kind of red it is
      // and what to do about it.
      let load = '';
      try {
        const [m1] = os.loadavg();
        const n = os.cpus().length || 1;
        load = ` — load ${m1.toFixed(1)} on ${n} core(s)`
          + (m1 > n * 1.5 ? `, i.e. the machine was oversubscribed; re-run this step on a quiet box before believing it` : '');
      } catch { /* loadavg is not available everywhere */ }
      return res({ ...step, ok: false, why_not: `timed out after ${step.timeout}s${load}`, out, ms });
    }
    let ok, why_not = '';
    if (step.verdict.kind === 'exit') {
      ok = code === 0;
      if (!ok) why_not = `exit ${code}`;
    } else if (step.verdict.kind === 'pf') {
      const pass = /^\s*PASS\s*[—-]/m.test(out), fail = /^\s*FAIL\s*[—-]/m.test(out);
      ok = pass && !fail;
      // Silence is failure. A probe that printed neither verdict did not run.
      if (!pass && !fail) why_not = `no verdict printed (exit ${code}) — the probe did not reach its own conclusion`;
      else if (fail) why_not = (out.match(/^\s*FAIL\s*[—-].*$/m) || [''])[0].trim();
    } else {
      const pass = step.verdict.pass.test(out), fail = step.verdict.fail.test(out);
      ok = pass && !fail;
      if (!pass && !fail) why_not = `no verdict printed (exit ${code}) — the probe did not reach its own conclusion`;
      else if (fail) why_not = (out.match(step.verdict.fail) || [''])[0].trim();
    }
    res({ ...step, ok, why_not, out, ms, code });
  });
  c.on('error', (e) => { clearTimeout(timer); res({ ...step, ok: false, why_not: `could not start: ${e.message}`, out, ms: Date.now() - t0 }); });
});

console.log(`\n  GATE — profile "${PROFILE}" — ${chosen.length} step(s) on :${PORT}\n`);
const results = [];
for (const step of chosen) {
  if (step.optional && !process.env[step.optional]) {
    console.log(`   ‑ ${step.id.padEnd(18)} SKIPPED (needs ${step.optional})`);
    results.push({ ...step, skipped: true, ok: true, out: '', ms: 0 });
    continue;
  }
  process.stdout.write(`   · ${step.id.padEnd(18)} `);
  const r = await run(step);
  results.push(r);
  const secs = (r.ms / 1000).toFixed(0).padStart(4);
  console.log(`${r.ok ? 'pass' : 'FAIL'} ${secs}s${r.ok ? '' : '  — ' + r.why_not}`);
  await strays();
}

// ── REPORT ───────────────────────────────────────────────────────────────────
if (args.includes('--selftest')) {
  const wrong = results.filter(r => r.ok !== r.expect);
  console.log('');
  for (const r of results) console.log(`   ${r.ok === r.expect ? 'correct' : 'WRONG  '}  ${r.id.padEnd(22)} expected ${r.expect ? 'pass' : 'FAIL'}, read ${r.ok ? 'pass' : 'FAIL'}`);
  console.log(`\n  ${wrong.length ? `SELFTEST FAIL — this gate misreads ${wrong.length} of ${results.length} known answers and cannot be trusted`
    : `SELFTEST PASS — the gate reads all ${results.length} known answers correctly, silence included`}\n`);
  process.exit(wrong.length ? 1 : 0);
}

const failed = results.filter(r => !r.ok);
const skipped = results.filter(r => r.skipped);
mkdirSync('qa/out/gate', { recursive: true });
const stamp = new Date().toISOString();
const md = [
  `# RELEASE GATE — ${failed.length ? 'FAIL' : 'PASS'}`,
  ``,
  `profile \`${PROFILE}\` · ${results.length} steps · ${failed.length} failed · ${skipped.length} skipped`,
  `· ${stamp}`,
  ``,
  `| step | verdict | secs | what it protects |`,
  `|---|---|---|---|`,
  ...results.map(r => `| \`${r.id}\` | ${r.skipped ? 'skipped' : r.ok ? 'pass' : '**FAIL**'} | ${(r.ms / 1000).toFixed(0)} | ${r.why} |`),
  ``,
  ...(failed.length ? [`## What failed`, ``, ...failed.flatMap(r => [
    `### \`${r.id}\` — ${r.why_not}`, ``, '```', r.out.trim().split('\n').slice(-40).join('\n'), '```', ``,
  ])] : [`Every step reached its own conclusion and that conclusion was pass.`]),
].join('\n');
writeFileSync('qa/out/gate/report.md', md);
writeFileSync('qa/out/gate/report.json', JSON.stringify(
  results.map(({ id, tier, ok, skipped: sk, why, why_not, ms }) => ({ id, tier, ok, skipped: !!sk, why, why_not, ms })), null, 2));

console.log(`\n  ${failed.length ? `GATE FAIL — ${failed.length}/${results.length} step(s): ${failed.map(f => f.id).join(', ')}`
  : `GATE PASS — ${results.length} step(s), every one reached its own conclusion`}`);
console.log(`  report: qa/out/gate/report.md\n`);
process.exit(failed.length ? 1 : 0);
