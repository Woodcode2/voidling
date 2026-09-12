// THE LADDER'S STATE — does the game agree with itself about where she is?
//
// Day 3 of the menu stream (docs/MENU-BRIEF.md §5.2, §6). This is the probe for
// src/game/levels.ts, and it is written before that file exists so it can be
// seen failing on a build that has no ladder at all.
//
// THE SPINE IS THE OWNER'S, AND IT IS A WIN GATE. He decided §8.1 on
// 2026-09-10: "they should be hitting the goals to move on. Maple starts easy.
// As you tick up maple and other levels it gets harder." So goal k+1 opens when
// goal k is 'done' — the goal MET inside the clock — and not merely attempted.
// The governor recommended the other way and the kill that recommendation rests
// on is real (§9.1 #1), so the safety net is elsewhere and this probe holds
// both halves of it:
//
//   · within a world the gate is a win, and bar (a) asserts exactly that;
//   · BETWEEN worlds the ladder stays finish-gated — unlocks.ts is untouched —
//     so a child stalled on Maple dot 3 can still travel to Pirate. Bar (f)
//     asserts that migration never takes a world away from anyone.
//
// WHAT EACH PART COVERS (day 3 landed a, e, f, g, i; day 4 adds b and c; d and
// h arrive with the end card on days 5-6 and are not stubbed here — a probe
// that pretends to cover something is worse than one that says it does not):
//
//   (a) state machine   the 30 rows, the five states, exactly one current per
//                       world, and current() following a WIN rather than a
//                       finish
//   (b) goal card       the card carries THIS level's line, is raised once
//                       inside its authored window, and never shares the
//                       screen with the ghost hand
//   (c) HUD presence    at three points on the MATCH's clock: the timer running
//                       down, the goal chip there with a number moving the
//                       right way, the retired board gone — and, with the goal
//                       unmet, an ending that is gold rather than a red
//                       countdown to losing
//   (f) migration       monotone, never re-locks, maple/1 always at least open
//   (g) telemetry       the level_* events fire once with the right payload
//   (e) winnable        every one of the thirty goals can be met on the island
//                       that actually exists — the bar that makes a win gate safe
//   (i) goal-free       a harness match with no ladder seeded touches nothing
//
// A MISSING HOOK THROWS, it does not skip. qa/_zgrade.mjs modelled a tone curve
// that had been replaced hours earlier and qa/_headcover.mjs reported scalp
// coverage after the hair was raised; both passed. GOVERNOR.md rule 4: parse
// the real thing and throw if the call site has moved.
//
//   node qa/levels.mjs [port] [--only=a,b,c,d,e,f,g,h,i,j]
import { chromium } from 'playwright';
import { ALL_WORLDS, UNLOCK_ALL } from './worlds.mjs';

const flag = (n, d) => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const PORT = process.argv.slice(2).filter((a) => !a.startsWith('--'))[0] || '4177';
const ONLY = flag('only', 'a,b,c,d,e,f,g,h,i,j').split(',');

const fails = [];
const bad = (m) => { fails.push(m); console.log(`  BAD  ${m}`); };
const ok = (m) => console.log(`  ok   ${m}`);
const t0 = Date.now();
process.on('uncaughtException', (e) => { console.log(`\nFAIL — levels threw: ${e.message.split('\n')[0]}`); process.exit(1); });
process.on('unhandledRejection', (e) => { console.log(`\nFAIL — levels rejected: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

/** A page with localStorage seeded by `seed` (a plain object written verbatim). */
const open = async (seed = {}, query = '?w=maple') => {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript((s) => {
    try {
      localStorage.clear();
      localStorage.setItem('voidPlayed', '1');
      localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    } catch { }
  }, seed);
  await p.goto(`http://127.0.0.1:${PORT}/${query}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 420000 });
  return p;
};

/** The hooks day 3 must land. Absent = this build has no ladder. */
const REQUIRED = ['__levels', '__levelCurrent', '__recordLevel', '__events'];
{
  const p = await open({ voidUnlocked: UNLOCK_ALL });
  const missing = await p.evaluate((req) => req.filter((k) => !(k in window)), REQUIRED);
  await p.close();
  if (missing.length) {
    console.log(`\n  LEVELS — the ladder's state`);
    console.log(`  BAD  this build has no ${missing.join(', ')}`);
    console.log(`\nFAIL — this build has no ladder: ${missing.join(', ')} are missing, so none of `
      + `(a) the state machine, (f) migration, (g) telemetry or (i) goal-free harness matches can be measured`);
    process.exit(1);
  }
}

console.log(`\n  LEVELS — the ladder's state @ :${PORT}`);
console.log(`  The gate is a WIN (owner, §8.1): goal k+1 opens on 'done', never on 'fin'.\n`);

// ── (a) THE STATE MACHINE ──────────────────────────────────────────────────
if (ONLY.includes('a')) {
  const seed = JSON.stringify({ v: 1, w: {
    maple:  { 1: { st: 'done', best: 42000, pct: 30, first: 'Wed Sep 10 2026', n: 3 },
              2: { st: 'fin',  best: 0,     pct: 12, first: 'Wed Sep 10 2026', n: 2 } },
    pirate: { 1: { st: 'clear', best: 90000, pct: 61, first: 'Wed Sep 10 2026', n: 1 },
              2: { st: 'done',  best: 4,     pct: 20, first: 'Wed Sep 10 2026', n: 1 },
              3: { st: 'open',  best: 0,     pct: 0,  first: '', n: 0 } },
  } });
  const p = await open({ voidLevels: seed, voidUnlocked: UNLOCK_ALL });
  const rows = await p.evaluate(() => window.__levels());
  const cur = await p.evaluate((ws) => Object.fromEntries(ws.map((w) => [w, window.__levelCurrent(w)])), ALL_WORLDS);
  await p.close();

  if (rows.length !== ALL_WORLDS.length * 5) bad(`(a) __levels() returned ${rows.length} rows, not ${ALL_WORLDS.length * 5} — the ladder is 5 goals x ${ALL_WORLDS.length} worlds`);
  else ok(`(a) __levels() has all ${rows.length} rows`);

  const st = (w, g) => (rows.find((r) => r.world === w && r.goal === g) || {}).st;
  const expect = [
    ['maple', 1, 'done'], ['maple', 2, 'fin'], ['maple', 3, 'locked'],
    ['pirate', 1, 'clear'], ['pirate', 2, 'done'], ['pirate', 3, 'open'], ['pirate', 4, 'locked'],
    // every world is seeded unlocked here, so every world's DOT 1 is reachable
    // — that is the between-worlds ladder staying finish-gated, which is the
    // release valve the win gate depends on. Dot 5 is locked because dot 4 has
    // not been passed.
    ['gameday', 1, 'open'], ['skylark', 1, 'open'], ['skylark', 5, 'locked'],
  ];
  for (const [w, g, want] of expect) {
    if (st(w, g) !== want) bad(`(a) ${w}/${g} reads '${st(w, g)}', seeded/derived as '${want}'`);
  }
  if (!expect.some(([w, g, want]) => st(w, g) !== want)) ok(`(a) every seeded and derived state reads back`);

  // EXACTLY ONE CURRENT PER WORLD, and a 'fin' dot is still the current one —
  // under a win gate she has not passed it, so the green ring has not moved.
  for (const w of ALL_WORLDS) {
    const mine = rows.filter((r) => r.world === w);
    const live = mine.filter((r) => r.st === 'open' || r.st === 'fin');
    if (live.length > 1) bad(`(a) ${w} has ${live.length} live dots (${live.map((r) => `${r.goal}:${r.st}`).join(',')}) — there can be exactly one green ring`);
    const c = cur[w];
    if (!(c >= 1 && c <= 5)) bad(`(a) current(${w}) is ${c}, not a goal 1-5`);
    else if (live.length && c !== live[0].goal) bad(`(a) current(${w}) is ${c} but the live dot is ${live[0].goal}`);
  }
  if (cur.maple !== 2) bad(`(a) current(maple) is ${cur.maple}, not 2 — dot 2 is 'fin' (attempted, not met) and under a WIN gate that is still where she is`);
  else ok(`(a) a 'fin' dot stays current — the win gate does not move the ring on a miss`);
  if (cur.pirate !== 3) bad(`(a) current(pirate) is ${cur.pirate}, not 3`);
  if (cur.gameday !== 1) bad(`(a) current(gameday) is ${cur.gameday}, not 1 — an untouched world starts at dot 1`);
}

// ── (f) MIGRATION ──────────────────────────────────────────────────────────
if (ONLY.includes('f')) {
  const seeds = [
    ['fresh profile', {}],
    ['played pirate, nothing else', { voidUnlocked: 'maple,pirate', voidBest_pirate: '8420' }],
    ['every world unlocked', { voidUnlocked: UNLOCK_ALL }],
  ];
  const RANK = { locked: 0, open: 1, fin: 2, done: 3, clear: 4 };
  for (const [label, seed] of seeds) {
    const p = await open(seed);
    const rows = await p.evaluate(() => window.__levels());
    const again = await p.evaluate(() => window.__levels());   // reading must not mutate
    await p.close();
    const m1 = rows.find((r) => r.world === 'maple' && r.goal === 1);
    if (!m1 || RANK[m1.st] < RANK.open) bad(`(f) ${label}: maple/1 is '${m1 && m1.st}' — world 1 dot 1 is never locked (unlocks.ts's own invariant)`);
    for (let i = 0; i < rows.length; i++) {
      if (RANK[again[i].st] < RANK[rows[i].st]) bad(`(f) ${label}: ${rows[i].world}/${rows[i].goal} FELL from '${rows[i].st}' to '${again[i].st}' on a second read — states only ever rise`);
    }
    if (label.startsWith('played pirate')) {
      const p1 = rows.find((r) => r.world === 'pirate' && r.goal === 1);
      if (RANK[p1.st] < RANK.fin) bad(`(f) ${label}: pirate/1 is '${p1.st}' — a recorded voidBest_pirate means a match was finished there`);
      const p2 = rows.find((r) => r.world === 'pirate' && r.goal === 2);
      if (p2.st !== 'locked') bad(`(f) ${label}: pirate/2 is '${p2.st}' — a FINISHED match is not a MET goal, and under the owner's win gate it opens nothing`);
    }
    ok(`(f) ${label}: monotone, maple/1 open, nothing re-locked`);
  }
}

// ── (g) TELEMETRY ──────────────────────────────────────────────────────────
if (ONLY.includes('g')) {
  const p = await open({ voidUnlocked: UNLOCK_ALL });
  const evs = await p.evaluate(() => {
    window.__events(true);   // clear
    window.__recordLevel({ world: 'maple', goal: 1, kind: 'eat', result: 'win', score: 31000, pct: 22, rank: 2, secs: 91 });
    window.__recordLevel({ world: 'maple', goal: 2, kind: 'set', result: 'time', score: 12000, pct: 9, rank: 4, secs: 180 });
    return window.__events();
  });
  const lv = evs.filter((e) => String(e.event).startsWith('level_'));
  await p.close();
  const win = lv.filter((e) => e.event === 'level_win');
  const fin = lv.filter((e) => e.event === 'level_fin');
  if (win.length !== 1) bad(`(g) level_win fired ${win.length} times, expected once`);
  if (fin.length !== 1) bad(`(g) level_fin fired ${fin.length} times, expected once`);
  if (win[0]) {
    for (const k of ['world', 'goal', 'kind', 'secs', 'attempt', 'score', 'pct', 'rank']) {
      if (!(k in win[0].props)) bad(`(g) level_win carries no "${k}" — §3.1 names it, and a funnel without it cannot answer "where do they stop"`);
    }
    if (win[0].props.world !== 'maple' || win[0].props.goal !== 1) bad(`(g) level_win names ${win[0].props.world}/${win[0].props.goal}, not maple/1`);
  }
  if (!fails.length) ok(`(g) level_win and level_fin each fire once, with the full payload`);

  // RANK IS A MINIMUM, AND ONLY ON DOT 4. The first version of recordLevelResult
  // read `best ?? score` on every dot, so a RIVALS result carrying rank 2 and a
  // score of 31,000 recorded 31,000 as the best RANK — and being a minimum it
  // then refused every real rank for ever. Nothing in (a), (f) or (g) touched
  // dot 4, which is why this bar exists.
  const p2 = await open({ voidUnlocked: UNLOCK_ALL });
  const rank = await p2.evaluate(() => {
    window.__recordLevel({ world: 'maple', goal: 4, result: 'time', rank: 4, score: 31000, pct: 10, secs: 180 });
    const a = window.__levels().find((r) => r.world === 'maple' && r.goal === 4).best;
    window.__recordLevel({ world: 'maple', goal: 4, result: 'win', rank: 2, score: 12000, pct: 12, secs: 120 });
    const bnew = window.__levels().find((r) => r.world === 'maple' && r.goal === 4).best;
    window.__recordLevel({ world: 'maple', goal: 4, result: 'time', rank: 5, score: 99000, pct: 40, secs: 180 });
    const c = window.__levels().find((r) => r.world === 'maple' && r.goal === 4).best;
    return { a, b: bnew, c };
  });
  await p2.close();
  if (rank.a !== 4) bad(`(g) dot 4 recorded best ${rank.a} for a rank of 4 — RIVALS' measure is the RANK, not the score`);
  else if (rank.b !== 2) bad(`(g) dot 4 best went ${rank.a} -> ${rank.b} on a better rank of 2 — rank is a MINIMUM`);
  else if (rank.c !== 2) bad(`(g) dot 4 best went ${rank.b} -> ${rank.c} on a WORSE rank of 5 — a worse finish must not overwrite a better one`);
  else ok(`(g) dot 4 keeps the best RANK (4 -> 2, and 5 does not overwrite it)`);
}

// ── (g2) THE GOAL CHANNEL ──────────────────────────────────────────────────
// A world change is a page reload, so the dot she tapped has to survive it.
// voidPlayGoal is that channel (beside voidWorld and voidAutoPlay) and ?g=
// mirrors it for probes. It is one of exactly three things §3.1 allows to set
// `playing` — and it must be consumed once, or every later match on that
// profile would silently be a level attempt.
if (ONLY.includes('g')) {
  const p = await open({ voidUnlocked: UNLOCK_ALL }, '?w=maple&g=3');
  const playing = await p.evaluate(() => window.__levelPlaying());
  const leftover = await p.evaluate(() => { try { return localStorage.getItem('voidPlayGoal'); } catch { return 'threw'; } });
  await p.close();
  if (playing !== 3) bad(`(g) ?g=3 set playing to ${JSON.stringify(playing)} — a goal asked for by name is a human choosing a level`);
  else ok(`(g) ?g= and voidPlayGoal set the played goal`);
  if (leftover !== null) bad(`(g) voidPlayGoal survived as ${JSON.stringify(leftover)} — it is a one-shot and every later match would inherit it`);
  else ok(`(g) the goal channel is consumed once`);
}

// ── (e) EVERY GOAL IS WINNABLE ON THE ISLAND THAT EXISTS ───────────────────
// The bar that makes the owner's win gate safe. Under it a goal that cannot be
// met is not a hard level, it is where a child's game ends — so "is dot 3
// winnable" has to be answerable from the island rather than arguable from the
// table. Each world is loaded and its own spec is checked against its own
// supply, with the eat handler's rules and the client's HOUSE_LIKE.
//
// It would have caught every one of day 2's findings before they shipped: the
// Skylark landmark resolving to a whale needing R 16.2, a SET kind asking for
// more than the island carries, and a landmarkR that does not match the prop
// actually tagged.
if (ONLY.includes('e')) {
  for (const world of ALL_WORLDS) {
    const p = await open({ voidUnlocked: UNLOCK_ALL }, `?w=${world}`);
    await p.waitForFunction(() => {
      const n = window.__edibles.length;
      if (window.__lastN !== n) { window.__lastN = n; window.__stableSince = performance.now(); return false; }
      return performance.now() - (window.__stableSince || 0) > 2000;
    }, null, { timeout: 300000, polling: 250 }).catch(() => { });
    const g = await p.evaluate(() => window.__goalPools());
    await p.close();

    // dot 3 — the tagged prop must EXIST, and landmarkR must be what the game
    // will actually test against (the prop's radius over EAT_RATIO), not a
    // number typed beside it that drifted.
    if (!g.landmark) bad(`(e) ${world}: no prop carries a landmark tag — dot 3 has nothing to point at`);
    else {
      if (g.landmark.name !== g.spec.landmark) bad(`(e) ${world}: the tagged landmark is "${g.landmark.name}" but the spec names "${g.spec.landmark}"`);
      if (Math.abs(g.landmark.needR - g.spec.landmarkR) > 0.02) bad(`(e) ${world}: landmarkR is ${g.spec.landmarkR} but "${g.landmark.name}" (r ${g.landmark.radius}) needs R ${g.landmark.needR} — the spec and the island disagree`);
      if (g.landmark.needR > g.lawTop) bad(`(e) ${world}: "${g.landmark.name}" needs R ${g.landmark.needR}, above LAW_TOP ${g.lawTop} — the clock alone can never buy it`);
      else ok(`(e) ${world}: dot 3 is "${g.landmark.name}" (r ${g.landmark.radius}, needs R ${g.landmark.needR} of LAW_TOP ${g.lawTop})`);
    }

    // dot 2 — 3N of every kind, and 6N for cars and houses because the family
    // eats 40-50% of the board and a goal racing them for the last one is a
    // goal decided by the rubber band.
    for (const { kind, n, label } of g.spec.set) {
      // gild is MADE per match by gildTreasure(), not placed on the island, so
      // its supply on a pre-match page is zero on every world. The count a
      // match will have is the constant the game publishes.
      const have = kind === 'gild' ? g.gildPerMatch : (g.supply[kind] ?? 0);
      const need = (kind === 'car' || kind === 'house') ? n * 6 : n * 3;
      if (have < need) bad(`(e) ${world}: dot 2 asks ${n} ${label} (${kind}) and the island carries ${have} — under the ${need} this kind needs`);
    }
    if (!fails.some((f) => f.startsWith(`(e) ${world}: dot 2`))) ok(`(e) ${world}: dot 2's three kinds all clear their supply rule`);

    // dot 4 — a rank the rubber band can actually deliver.
    if (!(g.spec.rank >= 1 && g.spec.rank <= 3)) bad(`(e) ${world}: dot 4 wants rank ${g.spec.rank} — the family is floored at "never below 3rd", so only 1-3 is meetable`);
    // dot 5 — a share of the world, never the 100% the brief assumed.
    if (!(g.spec.clear > 0 && g.spec.clear <= 60)) bad(`(e) ${world}: dot 5 wants ${g.spec.clear}% of the world — measured p10 at 70% of the clock is 29-48%`);
    if (!(g.spec.eat > 0)) bad(`(e) ${world}: dot 1 has no score`);
  }
}

// ── THE CLOCK, TAKEN ───────────────────────────────────────────────────────
// Both parts below run the match on a VIRTUALISED rAF at exactly 16.667 ms a
// frame — qa/ladder.mjs's technique, mandated for the level probe by §5.2, and
// the one qa/goalcurve.mjs measured the need for: under swiftshader the sandbox
// hands the page between 0.4 and 2.9 animation frames a SECOND, and dt is
// clamped to 0.05, so the game's own clock runs about twenty times slower than
// the wall. A probe that waits in wall time for "match second 5" waits four
// minutes and then reports whatever it finds.
//
// A QUEUE, not a single pending slot: there can be two consumers (animate and,
// on a driven run, the autopilot) and a single slot silently drops one.
//
// AND THE PAINT IS TURNED OFF. Measured: with the renderer live, a fifteen
// second match was still cranking after NINE MINUTES of wall clock and was
// killed there — upwards of 25 s of wall per cranked match-second under
// swiftshader, and part (c) needs six of those matches. Nothing below looks at a pixel: every bar reads the DOM and
// __matchState(). So renderer.render and the bloom composer's render are
// stubbed for the duration of the crank, which leaves animate() — the sim, the
// eat loop, the rivals, the HUD writes, the goal chip — running exactly as it
// does with a screen attached. (This is a PROBE-ONLY stub, installed from the
// harness and never from the game; qa/menuframe.mjs, whose whole subject is
// what a frame costs to draw, must never use it.)
const VIRTUALISE = async (p, noPaint = true) => {
  if (noPaint) await p.evaluate(() => {
    const r = window.__renderer;
    if (r) r.render = () => { };
    try { const c = window.__composer?.(); if (c) c.render = () => { }; } catch { /* no composer on this rung */ }
  });
  await p.evaluate(() => {
    const raw = window.requestAnimationFrame.bind(window);
    const rawNow = performance.now.bind(performance);
    window.__virt = rawNow();
    performance.now = () => window.__virt;
    window.__q = [];
    window.requestAnimationFrame = (cb) => { window.__q.push(cb); return window.__q.length; };
    // the callbacks already in flight registered with the REAL rAF and know
    // nothing about the queue; one more real frame lets them re-register
    raw(() => { });
  });
  await p.waitForFunction(() => (window.__q || []).length >= 1, null, { timeout: 120000 }).catch(() => { });
  return p.evaluate(() => (window.__q || []).length);
};

// ── (b) THE GOAL CARD ──────────────────────────────────────────────────────
// §4.7 bar 2, in three clauses: the card's .sub is THIS LEVEL's line; it is
// shown once, inside GOAL_CARD_AT .. +GOAL_CARD_LEN of arming, and never again;
// and it is not shown at all while the ghost hand is up.
//
// The third clause is the child skeptic's, and it is about the first session:
// that one auto-plays Maple with no menu, so a five-digit target unrolling over
// the wordless drag lesson is not a first level, it is two teachers talking at
// once.
//
// MEASURED ON THE CLASS, NOT ON OPACITY. #titlecard.show carries a 600 ms CSS
// animation, and CSS animations run on the WALL clock — under a cranked page
// the wall barely moves, so computed opacity would read 0 for a card that is
// unmistakably "shown" as far as the game is concerned. The class add is the
// game's own act and it is what the bar is really about.
if (ONLY.includes('b')) {
  // The cross-reload channel, which is the path PLAY will use: voidWorld +
  // voidAutoPlay + voidPlayGoal, consumed once at boot (§3.1). ?manual=1 opts
  // out of the automated-browser auto-start — this is the one probe that needs
  // the ARMED IDLE, because the card's timer only runs there.
  const p = await open({ voidUnlocked: UNLOCK_ALL, voidWorld: 'maple',
    voidAutoPlay: '1', voidPlayGoal: '1' }, '?manual=1');
  await p.waitForFunction(() => window.__matchState?.().armed === true, null, { timeout: 600000 })
    .catch(() => { });
  const armedOk = await p.evaluate(() => !!window.__matchState?.().armed);
  if (!armedOk) bad('(b) the world never armed on the voidAutoPlay path — the card cannot be timed');
  const consumers = await VIRTUALISE(p);
  if (consumers < 1) bad('(b) no rAF consumer re-registered — the render loop is not on the virtual clock');
  const pre = await p.evaluate(() => {
    const ms = window.__matchState();
    return { goalCardT: ms.goalCardT, at: ms.cardAt, len: ms.cardLen, t: ms.t,
      shown: document.getElementById('titlecard')?.classList.contains('show') ?? null,
      goal: window.__goalState ? window.__goalState() : 'hook missing' };
  });
  if (pre.at === undefined) bad('(b) __matchState() does not publish cardAt/cardLen — the window cannot be read off the game');
  if (pre.goal === 'hook missing') bad('(b) __goalState() is missing — the level line cannot be read off the game');
  else if (!pre.goal) bad('(b) voidPlayGoal did not make this a level match — __goalState() is null');
  if (pre.goalCardT < 0 && !pre.shown) bad(`(b) the card timer was already spent (goalCardT ${pre.goalCardT}) before the probe took the clock`);

  // Crank frame by frame and watch both classes. 5 game-seconds is eight times
  // the card's whole window, so "never again" has somewhere to be false.
  const film = await p.evaluate(([n, step]) => {
    const tc = document.getElementById('titlecard'), hd = document.getElementById('hand');
    const rows = [];
    let last = null, prevGct = -1;
    for (let i = 0; i < n; i++) {
      const due = window.__q; window.__q = [];
      if (!due.length) return { broke: true, rows };
      window.__virt += step;
      for (const cb of due) cb(window.__virt);
      const ms = window.__matchState();
      // THE CLASS IS THE RAISE, NOT THE WINDOW. #titlecard.show is never
      // removed — the animation is `forwards` and the class only goes at a
      // match reset — so `card` below is "the card has been raised" and
      // `cardUp` is "the card is on screen now", off the game's own titleUntil.
      const card = !!tc?.classList.contains('show'), hand = !!hd?.classList.contains('show');
      const cardUp = card && ms.titleUntil > ms.tClock;
      // one row per CHANGE, plus the first frame — a 300-row film of an
      // unchanging screen says nothing and costs a serialisation
      const sig = `${card}|${cardUp}|${hand}`;
      if (sig !== last) {
        last = sig;
        rows.push({ i, card, cardUp, hand, t: +ms.t.toFixed(2),
          // the value the frame BEFORE this one was holding: goalCardT is -1
          // from the fire frame on, so the fire frame itself cannot report the
          // elapsed-since-arm it fired at, and the previous CHANGE row can be
          // hundreds of frames back
          prevGoalCardT: +prevGct.toFixed(3),
          sub: tc?.querySelector('.sub')?.textContent ?? '',
          lvl: tc?.querySelector('.lvl')?.textContent ?? '' });
      }
      prevGct = ms.goalCardT;
    }
    return { rows, at: window.__matchState().cardAt, len: window.__matchState().cardLen,
      line: window.__goalState?.()?.line ?? null };
  }, [300, 1000 / 60]);
  await p.close();

  if (film.broke) bad('(b) the rAF chain broke mid-crank — animate() threw');
  const shows = (film.rows || []).filter((r) => r.card);
  const first = shows[0];   // the frame the class was added: the raise
  if (!first) {
    bad(`(b) the goal card was never shown in 5 game-seconds of the armed idle — a child is never told what this dot wants (film: ${JSON.stringify((film.rows || []).slice(0, 4))})`);
  } else {
    ok(`(b) the goal card unrolled at frame ${first.i} (${(first.i / 60).toFixed(2)} game-s after the probe took the clock)`);
    // shown ONCE: one contiguous run of card=true, i.e. exactly one transition into it
    const ins = (film.rows || []).filter((r, k) => r.card && !(k > 0 && film.rows[k - 1].card));
    if (ins.length !== 1) bad(`(b) the goal card was raised ${ins.length} times in one match — it is a once-per-match card`);
    else ok('(b) the goal card was raised exactly once');
    // the window: goalCardT is the elapsed-since-arm the game itself was
    // holding when it fired, and it is -1 from the fire frame on, so the row
    // BEFORE the first show carries it
    const prev = first.prevGoalCardT;
    // one cranked frame short of the authored mark, and never past it
    if (!(prev >= film.at - 0.05 && prev <= film.at)) bad(`(b) the card fired one frame after goalCardT ${prev}s — the authored mark is ${film.at}s`);
    else ok(`(b) the card fired at ${film.at}s after arming, on the authored mark (last frame before: ${prev}s)`);
    if (film.line === null) bad('(b) __goalState() is null on an armed level match');
    else if (first.sub !== film.line) bad(`(b) the card reads "${first.sub}" but this level's line is "${film.line}" — the card is still the world's copy`);
    else ok(`(b) the card carries this level's own line: "${film.line}"`);
    if (!/^LEVEL [1-5]$/.test(first.lvl)) bad(`(b) the card's .lvl reads "${first.lvl}" — it is the dot inside this world, 1-5`);
    else ok(`(b) the card names the dot: ${first.lvl}`);
    const ups = (film.rows || []).filter((r) => r.cardUp);
    const clash = ups.filter((r) => r.hand);
    // A CLASH BAR THAT NEVER SAW THE CARD UP IS A BAR THAT PASSED ITSELF. That
    // is exactly what happened on the first run against the shipped build:
    // cardUp reads the game's titleUntil, the build did not publish it, and
    // `undefined > tClock` is false on every frame — so "never up while the
    // hand is" was true because the card was never up at all.
    if (!ups.length) bad('(b) the card was raised but never read as ON SCREEN — __matchState() is not publishing titleUntil, so the clash bar below has nothing to test');
    if (clash.length) bad(`(b) the goal card and the ghost hand shared the screen for ${clash.length} of ${ups.length} sampled states — the lesson and the target are two teachers talking at once`);
    else ok(`(b) the goal card is never up while the ghost hand is (${ups.length} card-up state(s) sampled)`);
  }
}

// ── (b), THE OTHER HALF: A GOAL MET ENDS THE MATCH ─────────────────────────
// §4.7 bar 2's last clause and §4.3. Day 4 could only test the unmet side,
// because nothing could end a match early. Now: drive the counter over the
// line with the §3.1 hooks and the match has to STOP — with clock left on it,
// with the cheer rather than the loss sting, and with the ladder moved.
//
// The ladder assertions ride along here rather than waiting for (d) because
// day 5 is the commit that writes them: recordLevelResult would otherwise land
// with nothing watching it. (d) covers how the END CARD presents this on day 6.
if (ONLY.includes('b')) {
  const p = await open({ voidUnlocked: UNLOCK_ALL }, '?w=maple&g=1&len=60');
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0, null, { timeout: 600000 })
    .catch(() => { });
  await VIRTUALISE(p);
  const before = await p.evaluate(() => ({
    levels: window.__levels().filter((r) => r.world === 'maple').map((r) => ({ n: r.goal, st: r.st, tries: r.n })),
    clock: window.__matchState().clock, spec: window.__levelSpec(),
  }));
  // cross the line on the spot, then keep cranking: the match must end itself
  const r = await p.evaluate(([n, step]) => {
    const cEl = document.getElementById('count')?.firstElementChild;
    const bEl = document.getElementById('banner');
    window.__setScore(window.__levelSpec().eat + 1);
    let hot = 0, banner = null, endedAt = null, framesAfter = 0;
    for (let i = 0; i < n; i++) {
      const due = window.__q; window.__q = [];
      if (!due.length) return { broke: true, i };
      window.__virt += step;
      for (const cb of due) cb(window.__virt);
      if (cEl?.classList.contains('hot')) hot++;
      const bt = bEl?.textContent ?? '';
      if (/FASTER|SECONDS/.test(bt) && banner === null) banner = bt;
      const ms = window.__matchState();
      // the score is held over the line: the hunters can steal it back, and a
      // win that un-wins itself is the exact thing the latch exists to stop
      if (!endedAt) window.__setScore(window.__levelSpec().eat + 1);
      if (document.getElementById('end')?.classList.contains('show') && !endedAt) {
        endedAt = { clock: +ms.clock.toFixed(2), t: +ms.t.toFixed(2), frame: i };
      } else if (endedAt) framesAfter++;
      if (framesAfter > 120) break;
    }
    const ms = window.__matchState();
    return { hot, banner, endedAt, timer: document.getElementById('timer')?.textContent ?? '',
      goal: window.__goalState ? window.__goalState() : 'hook missing',
      clock: +ms.clock.toFixed(2),
      levels: window.__levels().filter((x) => x.world === 'maple').map((x) => ({ n: x.goal, st: x.st, tries: x.n })),
      ev: (window.__events ? window.__events(false) : []).map((e) => e.event),
      endHd: document.getElementById('endHd')?.textContent ?? '' };
  }, [60 * 90, 1000 / 60]);
  await p.close();

  if (r.broke) bad(`(b) met: the rAF chain broke at frame ${r.i}`);
  else if (!r.endedAt) {
    bad(`(b) met: the goal was met and the match did not end — she did the thing and the game kept going (clock ${r.clock}, goal ${JSON.stringify(r.goal)})`);
  } else {
    // THE POINT OF THE WHOLE DAY: clock still on it.
    if (!(r.endedAt.clock > 0)) bad(`(b) met: the match ended at clock ${r.endedAt.clock} — that is the buzzer, not a win on the spot`);
    else ok(`(b) met: the match ended with ${r.endedAt.clock}s still on the clock (t=${r.endedAt.t})`);
    if (r.hot) bad(`(b) met: #count went hot on ${r.hot} frames of a match she WON`);
    else ok('(b) met: no hot countdown on a won match');
    if (r.banner !== null) bad(`(b) met: the banner read "${r.banner}" on a match she WON`);
    else ok('(b) met: no EAT FASTER banner on a won match');
    if (!r.goal || r.goal === 'hook missing' || r.goal.result !== 'win') bad(`(b) met: the match resolved as ${JSON.stringify(r.goal && r.goal.result)} — a met goal is a win`);
    else ok('(b) met: the match resolved as a win');
  }
  // ── AND THE LADDER MOVED, ONCE ─────────────────────────────────────────
  const row = (rows, n) => (rows || []).find((x) => x.n === n) || {};
  const b1 = row(before.levels, 1), a1 = row(r.levels, 1), a2 = row(r.levels, 2);
  if (!['done', 'clear'].includes(a1.st)) bad(`(b) met: maple dot 1 is "${a1.st}" after a win — a met goal raises it to done (or clear with the CLEAR number)`);
  else ok(`(b) met: maple dot 1 rose ${b1.st} → ${a1.st}`);
  if (a2.st !== 'open') bad(`(b) met: maple dot 2 is "${a2.st}" after dot 1 was won — a pass opens the next dot`);
  else ok('(b) met: maple dot 2 opened');
  if (a1.tries !== (Number(b1.tries) || 0) + 1) bad(`(b) met: attempts went ${b1.tries} → ${a1.tries} — one match is one attempt`);
  else ok(`(b) met: one match counted as one attempt (${a1.tries})`);
  const wins = (r.ev || []).filter((e) => String(e).includes('level_win'));
  if (wins.length !== 1) bad(`(b) met: level_win fired ${wins.length} time(s) — the funnel counts matches, not frames`);
  else ok('(b) met: level_win fired exactly once');
}

// ── (h) THE FAMILY MAY NOT TAKE HER LANDMARK ───────────────────────────────
// §4.2: "The landmark prop is excluded from the rivals' eat rule on goal 3";
// there is no 'stolen' state and there must not be one — a goal a child can
// lose through no act of her own teaches her the game is unfair.
//
// THE BAR DRAFT 1 PROPOSED COULD NOT FAIL. "After 60 match-seconds of autopilot
// the landmark is uneaten" is green on a build with no exclusion at all,
// because non-hunter rivals are capped at softCap and never reach the radius a
// landmark needs inside a minute. So this MAKES a rival capable — oversized,
// joined, standing on the prop — and watches the rule decide: refused on dot 3,
// taken on dot 1. Both halves, because a rule that refuses everything is not an
// exclusion, it is a bug.
if (ONLY.includes('h')) {
  // ?r=8 IS LOAD-BEARING, and the first version of this bar did not have it.
  // The family's size law is `softCap = max(min(START_R + 0.02t, 1.6), pr*0.80)`
  // (rivals.ts:990) and it runs every frame BEFORE the swallow loop — so a hook
  // that writes rv.r = 5.63 has it clawed straight back to 1.3 while the player
  // is small, and MEASURED it was: r 5.63 in, r 1.30 out, the barn untouched on
  // BOTH dots. The dot-3 half then "passed" for the wrong reason entirely — the
  // rival was never capable, so the exclusion was never tested. Exactly the
  // trap §5.2 (h) records against draft 1's version of this bar.
  //
  // ?r=8 starts the void at radius 8 and turns the clock-bound growth law off
  // (prototype3d.ts:4348, :10583, :11893), which lifts softCap to 6.4 through
  // the game's OWN law rather than exempting anyone from it. And it is the real
  // scenario: late in a match the player IS r 8, the family is at 0.80x, and a
  // 5.0 barn is squarely on their menu. That is when this exclusion matters.
  const run = async (g) => {
    const p = await open({ voidUnlocked: UNLOCK_ALL }, `?w=maple&g=${g}&len=60&r=8`);
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0, null, { timeout: 600000 })
      .catch(() => { });
    await VIRTUALISE(p);
    const setup = await p.evaluate(() => (window.__rivalOnLandmark ? window.__rivalOnLandmark() : 'hook missing'));
    const out = await p.evaluate(([n, step]) => {
      for (let i = 0; i < n; i++) {
        const due = window.__q; window.__q = [];
        if (!due.length) return { broke: true, i };
        window.__virt += step;
        for (const cb of due) cb(window.__virt);
        // hold the rival on the prop: their steering will walk them off it
        // otherwise, and "it wandered away" is not the same finding as
        // "the rule refused it"
        if (i % 10 === 0 && typeof window.__rivalOnLandmark === 'function') window.__rivalOnLandmark();
      }
      const ms = window.__matchState();
      const rv = ms.rivals[0] || {};
      return { state: window.__landmarkState ? window.__landmarkState() : 'hook missing',
        t: +ms.t.toFixed(1),
        // what the rival ACTUALLY is by the end, not what the hook asked for:
        // the family's own size law runs every frame and may have taken the
        // radius straight back off it
        rival: { r: +(rv.r ?? 0).toFixed(2), joined: !!rv.joined,
          d: Math.round(Math.hypot((rv.x ?? 0) - (window.__landmarkState?.()?.x ?? rv.x ?? 0),
            (rv.z ?? 0) - (window.__landmarkState?.()?.z ?? rv.z ?? 0))) } };
    }, [60 * 20, 1000 / 60]);
    await p.close();
    return { setup, ...out };
  };

  const dot3 = await run(3);
  if (dot3.setup === 'hook missing' || dot3.state === 'hook missing') {
    bad('(h) the landmark hooks are missing — __rivalOnLandmark / __landmarkState');
  } else if (!dot3.setup) {
    bad('(h) maple has no tagged landmark, so dot 3 has nothing to ask for');
  } else {
    // the rival really was capable — otherwise the bar below proves nothing
    if (!dot3.setup.canEatByTheirRule) bad(`(h) the planted rival (r ${dot3.setup.rivalR}) could not eat the ${dot3.setup.landmark} (r ${dot3.setup.landmarkR}) by the family's own rule — the test never applied pressure`);
    else ok(`(h) a rival at r ${dot3.setup.rivalR} is over the family's eat line for the ${dot3.setup.landmark} (needs ${dot3.setup.needR})`);
    if (!dot3.setup.reserved) bad('(h) the landmark is not reserved on dot 3 — nothing is stopping the family');
    else ok('(h) dot 3 reserves the landmark');
    if (dot3.state.eaten) bad(`(h) the family ate the ${dot3.setup.landmark} on dot 3 after ${dot3.t}s — the child is now playing for a prop that is not there`);
    else if (dot3.rival.r < dot3.setup.needR) bad(`(h) the ${dot3.setup.landmark} survived dot 3, but the rival ended at r ${dot3.rival.r} — under the ${dot3.setup.needR} it needed, so the world's own size law refused it and this bar proved nothing about the exclusion`);
    else ok(`(h) the ${dot3.setup.landmark} is still standing on dot 3 after ${dot3.t}s with a rival at r ${dot3.rival.r} on top of it (it needed ${dot3.setup.needR})`);
  }

  const dot1 = await run(1);
  if (dot1.setup && dot1.state !== 'hook missing') {
    if (dot1.setup.reserved) bad('(h) the landmark is reserved on dot 1 — the exclusion belongs to dot 3 only, or the world grows an immortal prop');
    else ok('(h) dot 1 leaves the landmark on the family\'s menu');
    if (!dot1.state.eaten) bad(`(h) the same oversized rival did NOT take the ${dot1.setup.landmark} on dot 1 after ${dot1.t}s — a rule that refuses everything is not an exclusion. The rival ended at r ${dot1.rival.r} against the ${dot1.setup.landmarkR} it had to swallow (needed ${dot1.setup.needR}); the hook set it to ${dot1.setup.rivalR}`);
    else if (dot1.state.byPlayer) bad('(h) the landmark went to the PLAYER on dot 1 — the run measured the wrong eater');
    else ok(`(h) the family took the ${dot1.setup.landmark} on dot 1, which is what makes dot 3's refusal mean something`);
  }
}

// ── (c) THE HUD, WHILE SHE IS PLAYING ──────────────────────────────────────
// §4.7 bar 3. At three points on the MATCH's own clock — never the wall — the
// screen has to be telling her the truth: the timer is running down, the goal
// chip is there with a number moving the right way, the retired quest board is
// gone, and (the child skeptic's must-fix) the ending is not a red countdown to
// losing while the goal is still unmet.
//
// One page per goal kind, because playingGoal is fixed at boot. ?len=15 shortens
// the match to fifteen seconds — read back from the game, never assumed — so
// three samples and a buzzer cost 900 cranked frames instead of 10,800.
if (ONLY.includes('c')) {
  // what each kind's chip must look like, and which way its number may move
  const KIND = {
    1: { label: 'EAT', re: /^([\d,]+) \/ ([\d,]+)$/, dir: 'up',
      num: (m) => Number(m[1].replace(/,/g, '')) },
    2: { label: 'COLLECT', re: /^(.+)$/, dir: 'down',
      // the remaining counts, summed; a ticked line contributes 0
      num: (m) => m[1].split(/\s{2,}/).reduce((s, t) => s + (/✓/.test(t) ? 0 : Number((t.match(/^(\d+)/) || [0, 0])[1])), 0) },
    3: { label: 'the landmark name', re: /^(\d+)%$|^(EAT IT NOW)$/, dir: 'up',
      num: (m) => (m[2] ? 100 : Number(m[1])) },
    4: { label: 'PLACE', re: /^#(\d|-) OF (\d+)$/, dir: 'rank',
      num: (m) => (m[1] === '-' ? 0 : Number(m[1])) },
    5: { label: 'WORLD', re: /^(\d+)% \/ (\d+)%$/, dir: 'up',
      num: (m) => Number(m[1]) },
  };
  // Drive the goal PART of the way between samples, with the hooks of §3.1, and
  // never across the line: the last bar below is about what the last ten
  // seconds look like with the goal UNMET, so meeting it would erase the thing
  // being measured.
  const DRIVE = {
    1: (f) => `window.__setScore(window.__levelSpec().eat * ${f})`,
    2: (f) => `window.__eatKind(window.__levelSpec().set.slice().sort((a,b)=>a.n-b.n)[0].kind, Math.max(1, Math.round(window.__levelSpec().set.slice().sort((a,b)=>a.n-b.n)[0].n * ${f})))`,
    3: () => 'window.__eatKind("snack", 40)',   // grows the void; never eats the landmark
    // DELIBERATELY OUT OF REACH. The last bar of this part is what the ending
    // looks like with the goal UNMET, and RIVALS is the one kind where the
    // brief keeps today's hot countdown — at rank 1 it is the bell to a win.
    // So the family is put far ahead and stays there: rank 6, goal unmet, gold.
    4: (f) => `window.__setRivalScores([6,5,4,3,2].map((k)=>Math.round(k * 200000 * ${1 + f})))`,
    5: (f) => `window.__devourAll(Math.min(${Math.round(40 * f)}, window.__levelSpec().clear - 8))`,
  };

  for (const g of [1, 2, 3, 4, 5]) {
    const gT0 = Date.now();
    const p = await open({ voidUnlocked: UNLOCK_ALL }, `?w=maple&g=${g}&len=15`);
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0, null, { timeout: 600000 })
      .catch(() => { });
    const consumers = await VIRTUALISE(p);
    if (consumers < 1) bad(`(c) goal ${g}: no rAF consumer on the virtual clock`);
    const setup = await p.evaluate(() => ({
      goal: window.__goalState ? window.__goalState() : 'hook missing',
      spec: window.__levelSpec(),
      clock: window.__matchState().clock, t: window.__matchState().t,
      hooks: ['__setScore', '__eatKind', '__eatLandmark', '__setRivalScores', '__devourAll']
        .filter((k) => typeof window[k] !== 'function'),
    }));
    if (setup.hooks.length) bad(`(c) goal ${g}: the §3.1 goal hooks are missing: ${setup.hooks.join(', ')}`);
    if (setup.goal === 'hook missing') bad(`(c) goal ${g}: __goalState() is missing`);
    else if (!setup.goal) bad(`(c) goal ${g}: ?g=${g} did not make this a level match`);
    // matchLen off the game: solo runs 120, ?len= runs what it was given, and a
    // probe that assumed 180 would sample past the buzzer on both
    const matchLen = setup.clock > 0 ? Math.round(setup.clock + setup.t) : 0;
    const marks = [5, matchLen * 0.49, matchLen * 0.9];

    // crank a second at a time, sampling the whole HUD every frame
    const film = [];
    let mark = 0, hot = 0, banner = null, broke = false, quests = 0;
    for (let sec = 0; sec < matchLen + 6 && !broke; sec++) {
      const r = await p.evaluate(([n, step]) => {
        const out = { rows: [], hot: 0, banner: null, quests: 0 };
        const tEl = document.getElementById('timer'), gEl = document.getElementById('goal');
        const cEl = document.getElementById('count')?.firstElementChild;
        const bEl = document.getElementById('banner'), qEl = document.getElementById('quests');
        for (let i = 0; i < n; i++) {
          const due = window.__q; window.__q = [];
          if (!due.length) return { ...out, broke: true };
          window.__virt += step;
          for (const cb of due) cb(window.__virt);
          // the two that must NEVER be true on any frame, not just at the marks
          if (cEl?.classList.contains('hot')) out.hot++;
          const bt = bEl?.textContent ?? '';
          if (/FASTER|SECONDS/.test(bt) && out.banner === null) out.banner = bt;
          if (qEl && getComputedStyle(qEl).display !== 'none') out.quests++;
        }
        const ms = window.__matchState();
        out.s = { t: +ms.t.toFixed(2), clock: +ms.clock.toFixed(2),
          timer: tEl?.textContent ?? '', timerVis: !!tEl && getComputedStyle(tEl).display !== 'none',
          goalVis: !!gEl && getComputedStyle(gEl).display !== 'none',
          label: gEl?.querySelector('.gLabel')?.textContent ?? '',
          val: gEl?.querySelector('.gVal')?.textContent ?? '',
          ended: !!document.getElementById('end')?.classList.contains('show'),
          met: !!window.__goalState?.()?.met };
        return out;
      }, [60, 1000 / 60]);
      if (r.broke) { broke = true; bad(`(c) goal ${g}: the rAF chain broke mid-crank`); break; }
      hot += r.hot; quests += r.quests;
      if (banner === null) banner = r.banner;
      film.push(r.s);
      if (r.s.ended) break;
      // drive the goal partway, between the first and second marks and again
      // after the second — never across the line
      if (mark < marks.length && r.s.t >= marks[mark]) {
        const frac = [0.25, 0.55, 0.55][mark];
        await p.evaluate(`(() => { try { return ${DRIVE[g](frac)}; } catch (e) { return 'threw: ' + e.message; } })()`);
        mark++;
      }
    }
    await p.close();

    // the three marks, taken off __matchState().t and nothing else
    const at = (want) => film.find((s) => s.t >= want) ?? null;
    const K = KIND[g];
    const seen = [];
    for (const want of marks) {
      const s = at(want);
      if (!s) { bad(`(c) goal ${g}: the match never reached t=${want.toFixed(1)}s of a ${matchLen}s clock`); continue; }
      if (!s.timerVis) bad(`(c) goal ${g} @t${s.t}: #timer is not visible`);
      if (!s.goalVis) bad(`(c) goal ${g} @t${s.t}: #goal is not visible — she cannot see what this dot wants`);
      const wantLabel = g === 3 ? String(setup.spec.landmark).toUpperCase() : K.label;
      if (s.label !== wantLabel) bad(`(c) goal ${g} @t${s.t}: #goal reads label "${s.label}", expected "${wantLabel}"`);
      const m = K.re.exec(s.val);
      if (!m) { bad(`(c) goal ${g} @t${s.t}: #goal value "${s.val}" does not parse as a ${K.dir} reading for this kind`); continue; }
      seen.push({ t: s.t, n: K.num(m), val: s.val, clock: s.clock });
    }
    if (seen.length === marks.length) {
      const ts = seen.map((x) => x.clock);
      if (!(ts[0] > ts[1] && ts[1] > ts[2])) bad(`(c) goal ${g}: the clock did not fall across the three marks: ${ts.join(' → ')}`);
      else ok(`(c) goal ${g}: #timer ran down ${ts.join(' → ')}`);
      const ns = seen.map((x) => x.n);
      const mono = K.dir === 'up' ? ns[0] <= ns[1] && ns[1] <= ns[2]
        : K.dir === 'down' ? ns[0] >= ns[1] && ns[1] >= ns[2]
          : ns.every((n) => n >= 1 && n <= 6);
      if (!mono) bad(`(c) goal ${g}: #goal went the wrong way (${K.dir}): ${seen.map((x) => `"${x.val}"`).join(' → ')}`);
      else ok(`(c) goal ${g}: #goal ${K.dir}: ${seen.map((x) => `"${x.val}"`).join(' → ')}`);
    }
    if (quests) bad(`(c) goal ${g}: the retired quest board was visible on ${quests} frames`);
    console.log(`       goal ${g}: ${film.length} cranked match-second(s) in ${((Date.now() - gT0) / 1000).toFixed(0)}s of wall clock`);
    // ── THE LAST TEN SECONDS, WITH THE GOAL UNMET ──────────────────────────
    const met = film.length ? film[film.length - 1].met : false;
    if (met) bad(`(c) goal ${g}: the drive met the goal — the unmet-ending bar below measures nothing`);
    else {
      if (hot) bad(`(c) goal ${g}: #count went hot on ${hot} frames with the goal unmet — a red 3-2-1 counting down to the green dot not moving`);
      else ok('(c) goal ' + g + ': the countdown stayed gold with the goal unmet');
      if (banner !== null) bad(`(c) goal ${g}: the banner read "${banner}" with the goal unmet`);
      else ok(`(c) goal ${g}: no EAT FASTER banner with the goal unmet`);
    }
  }

  // ── AND THE HALF THE RULE KEEPS ─────────────────────────────────────────
  // §4.2: "RIVALS with myRank === 1 at 10 s → today's hot countdown, because
  // there it is the bell to a win." Without this bar the five above would pass
  // on a build that had simply deleted the hot countdown for every level, which
  // is not the ask — the ask is that the ending stops NAGGING, not that it
  // stops celebrating. The family is zeroed so the player leads outright.
  {
    const p = await open({ voidUnlocked: UNLOCK_ALL }, '?w=maple&g=4&len=15');
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0, null, { timeout: 600000 })
      .catch(() => { });
    await VIRTUALISE(p);
    const r = await p.evaluate(([n, step]) => {
      const cEl = document.getElementById('count')?.firstElementChild;
      const bEl = document.getElementById('banner');
      let hot = 0, banner = null, rank1 = 0;
      window.__setRivalScores([0, 0, 0, 0, 0]);
      for (let i = 0; i < n; i++) {
        const due = window.__q; window.__q = [];
        if (!due.length) return { broke: true, hot, banner, rank1, i };
        window.__virt += step;
        for (const cb of due) cb(window.__virt);
        // the family never scores, so the lead is held rather than assumed
        window.__setRivalScores([0, 0, 0, 0, 0]);
        if (window.__matchState().rank === 1) rank1++;
        if (cEl?.classList.contains('hot')) hot++;
        const bt = bEl?.textContent ?? '';
        if (/FASTER|SECONDS/.test(bt) && banner === null) banner = bt;
      }
      return { hot, banner, rank1, n };
    }, [16 * 60, 1000 / 60]);
    await p.close();
    if (r.broke) bad(`(c) rivals@1: the rAF chain broke at frame ${r.i}`);
    if (!r.rank1) bad('(c) rivals@1: the player never held rank 1 — the exemption below was not exercised');
    else if (!r.hot) bad(`(c) rivals@1: #count never went hot while leading a RIVALS level on ${r.rank1} frames — the bell to a win was removed, not keyed`);
    else ok(`(c) rivals@1: leading a RIVALS level keeps the hot countdown (${r.hot} frames hot, rank 1 on ${r.rank1})`);
    // …and it is still the celebration, not the nag: no hurry-up banner
    if (r.banner !== null) bad(`(c) rivals@1: the banner read "${r.banner}" — the hot countdown is the bell, not a hurry-up`);
    else ok('(c) rivals@1: no EAT FASTER banner even while leading');
  }

  // ── THE CONTROL ─────────────────────────────────────────────────────────
  // …and the ritual is not removed, it is keyed. A match with no level is the
  // game that shipped, and it must STILL close with the red timer, the banner
  // and the hot numerals — otherwise the bar above would pass on a build that
  // had simply deleted the ending.
  {
    const p = await open({ voidUnlocked: UNLOCK_ALL }, '?w=maple&len=15');
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0, null, { timeout: 600000 })
      .catch(() => { });
    await VIRTUALISE(p);
    const r = await p.evaluate(([n, step]) => {
      const cEl = document.getElementById('count')?.firstElementChild;
      const bEl = document.getElementById('banner'), gEl = document.getElementById('goal');
      let hot = 0, banner = null, goalVis = 0;
      for (let i = 0; i < n; i++) {
        const due = window.__q; window.__q = [];
        if (!due.length) return { broke: true, hot, banner, goalVis, i };
        window.__virt += step;
        for (const cb of due) cb(window.__virt);
        if (cEl?.classList.contains('hot')) hot++;
        const bt = bEl?.textContent ?? '';
        if (/FASTER|SECONDS/.test(bt) && banner === null) banner = bt;
        if (gEl && getComputedStyle(gEl).display !== 'none') goalVis++;
      }
      return { hot, banner, goalVis, playing: typeof window.__levelPlaying === 'function' ? window.__levelPlaying() : 'hook missing' };
    }, [16 * 60, 1000 / 60]);
    await p.close();
    if (r.broke) bad(`(c) control: the rAF chain broke at frame ${r.i}`);
    if (r.playing !== null) bad(`(c) control: a harness match with no ?g= reads playing=${JSON.stringify(r.playing)}`);
    if (r.goalVis) bad(`(c) control: #goal was visible on ${r.goalVis} frames of a goal-free match — a HUD element nobody asked for`);
    else ok('(c) control: #goal stays hidden on a goal-free match');
    if (!r.hot) bad('(c) control: #count never went hot on a goal-free match — the ending was removed, not keyed');
    else ok(`(c) control: the shipped ending is intact — #count hot on ${r.hot} frames`);
    if (r.banner === null) bad('(c) control: the 35-second banner never fired on a goal-free match — the ending was removed, not keyed');
    else ok(`(c) control: the shipped banner is intact — "${r.banner}"`);
  }
}

// ── (d) THE END CARD SAYS WHERE SHE IS ─────────────────────────────────────
// §4.7 bars 4 and 6. The end card is the one screen in the game whose whole job
// is progression, and the child skeptic's rule governs it: the PICTURE first,
// the word second, and on a miss nothing that reads as punishment.
//
// Four runs, because four things can only be told apart by playing them out:
//   win     the goal met -> the tick pip, clock still on it, CONTINUE
//   miss    the buzzer with the goal unmet -> the come-back pip, NOT YET, the
//           next dot STILL LOCKED, the green ring still on this one
//   race    the counter driven over the line one second INTO the TIME outro ->
//           still NOT YET. This is the first-writer guard, and it is the one
//           bar here that cannot be reasoned about from the source: during the
//           outro the eat loop and the score keep running at dtw = dt x 0.3.
//   rivals  never ends before the buzzer, whatever the rank does
if (ONLY.includes('d')) {
  // what the pip's own markup must say, per state. Reading the GLYPH rather
  // than a colour or a label: the glyph is the thing a child who cannot read
  // actually receives, so it is the thing worth asserting.
  const GLYPH = { locked: 'ic-lock', open: null, fin: 'ic-again', done: 'ic-tick', clear: 'ic-star' };
  const readCard = () => ({
    shown: !!document.getElementById('end')?.classList.contains('show'),
    clock: +(window.__matchState().clock).toFixed(2),
    hdIsPip: !!document.querySelector('#endHd .pip'),
    hdState: (document.querySelector('#endHd .pip')?.className.match(/s-(\w+)/) || [])[1] ?? '',
    hdGlyph: (document.querySelector('#endHd .pip use')?.getAttribute('href') || '').replace('#', ''),
    hdWord: document.querySelector('#endHd .pipHW')?.textContent ?? '',
    pips: [...document.querySelectorAll('#endPips .pip')].map((e) => (e.className.match(/s-(\w+)/) || [])[1] ?? ''),
    here: [...document.querySelectorAll('#endPips .pip')].map((e) => e.classList.contains('here')),
    cap: document.getElementById('endPipsCap')?.textContent ?? '',
    again: document.getElementById('btnAgain')?.textContent ?? '',
    // what the ONE footer button says. There is no second TRY AGAIN: under the
    // win gate current(world) after a miss is this dot, so a second button
    // would launch the identical match (see paintLevelEnd).
    // ── HOW MANY THINGS ARE ON THIS SCREEN? ───────────────────────────────
    // The end card grew one honest block at a time until qa/_endshot.mjs showed
    // TWELVE of them stacked for a six-year-old. On a level it answers four
    // questions; this counts the blocks that are actually drawn, so the next
    // honest addition has to argue with a number instead of slipping in.
    blocks: [...(document.getElementById('endScroll')?.children ?? [])]
      .filter((e) => e.getBoundingClientRect().height > 2)
      .map((e) => e.id || e.className || e.tagName.toLowerCase()),
    statsOpen: !!document.getElementById('endStats')?.classList.contains('open'),
    listShown: (document.getElementById('endList')?.getBoundingClientRect().height ?? 0) > 2,
    nextHtml: document.getElementById('endNext')?.innerHTML ?? '',
    nextState: (document.querySelector('#endNext .pip')?.className.match(/s-(\w+)/) || [])[1] ?? '',
    nextText: document.querySelector('#endNext .unlockCard b')?.textContent ?? '',
    // painted BEFORE the coin count-up, so the pips must already be there on
    // the frame the card appears
    pipsAtShow: window.__pipsAtShow ?? -1,   // set synchronously on the frame #end gains .show
    levels: window.__levels().filter((r) => r.world === 'maple').map((r) => ({ n: r.goal, st: r.st, tries: r.n })),
  });

  // ── (d1) A WIN ──────────────────────────────────────────────────────────
  {
    const p = await open({ voidUnlocked: UNLOCK_ALL }, '?w=maple&g=1&len=60');
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0, null, { timeout: 600000 }).catch(() => { });
    await VIRTUALISE(p);
    await p.evaluate(`window.READ = ${readCard.toString()}`);
    const r = await p.evaluate(([n, step]) => {
      window.__setScore(window.__levelSpec().eat + 1);
      for (let i = 0; i < n; i++) {
        const due = window.__q; window.__q = [];
        if (!due.length) return { broke: true, i };
        window.__virt += step;
        for (const cb of due) cb(window.__virt);
        window.__setScore(window.__levelSpec().eat + 1);
        if (document.getElementById('end')?.classList.contains('show')) {
          // COUNTED ON THIS FRAME, synchronously. A MutationObserver cannot do
          // this job: the whole crank is one task, so its callbacks do not run
          // until the evaluate returns, and the first version of this bar read
          // -1 on a build that paints the pips perfectly well. Reading the DOM
          // on the frame the class lands is both correct and stricter.
          window.__pipsAtShow = document.querySelectorAll('#endPips .pip').length;
          for (let k = 0; k < 12; k++) { const d2 = window.__q; window.__q = []; window.__virt += step; for (const cb of d2) cb(window.__virt); }
          return window.READ();
        }
      }
      return { timeout: true, ...window.READ() };
    }, [60 * 90, 1000 / 60]);
    await p.close();
    if (r.broke || r.timeout) bad(`(d) win: the card never opened (${r.broke ? 'rAF broke' : 'timed out'})`);
    else {
      if (!(r.clock > 0)) bad(`(d) win: the card opened at clock ${r.clock} — a win on the spot leaves time on it`);
      else ok(`(d) win: the card opened with ${r.clock}s left`);
      if (!r.hdIsPip) bad('(d) win: #endHd is not a pip — the headline must be the picture, not a word');
      else if (!['done', 'clear'].includes(r.hdState)) bad(`(d) win: the headline pip is "${r.hdState}" after a win`);
      else if (r.hdGlyph !== GLYPH[r.hdState]) bad(`(d) win: the headline pip wears "${r.hdGlyph}", expected "${GLYPH[r.hdState]}"`);
      else ok(`(d) win: the headline is the ${r.hdState} pip wearing ${r.hdGlyph}, captioned "${r.hdWord}"`);
      if (r.pips.length !== 5) bad(`(d) win: #endPips has ${r.pips.length} pips, not 5`);
      else ok(`(d) win: the five dots read ${r.pips.join(' · ')}`);
      if (r.pipsAtShow !== 5) bad(`(d) win: ${r.pipsAtShow} pips existed on the frame the card appeared — they must be painted BEFORE the coin count-up, or the money lands first`);
      else ok('(d) win: the pips were already painted when the card appeared');
      if (!/^LEVEL \d+ OF 30$/.test(r.cap)) bad(`(d) win: the ordinal caption reads "${r.cap}"`);
      else ok(`(d) win: "${r.cap}"`);
      if (!/CONTINUE/.test(r.again)) bad(`(d) win: the primary button reads "${r.again}" after a win`);
      else ok(`(d) win: the footer says "${r.again}"`);
      if (/TRY AGAIN/.test(r.again)) bad('(d) win: the footer offers TRY AGAIN on a match she won');
      if (r.nextState !== 'open') bad(`(d) win: #endNext shows "${r.nextText || r.nextHtml.slice(0, 60)}" — after a win the slot belongs to the dot she just opened, not to a shop door`);
      else ok(`(d) win: #endNext is the next dot, "${r.nextText}"`);
      // FOUR QUESTIONS. A ceiling, not a target — and a deliberately loud one,
      // because every block on this card was added for a good reason and the
      // twelfth will be too.
      if (r.blocks.length > 7) bad(`(d) win: ${r.blocks.length} blocks on a level end card — ${r.blocks.join(', ')}. A six-year-old is answering "did I do it", not reading a dashboard`);
      else ok(`(d) win: ${r.blocks.length} blocks on the card — ${r.blocks.join(', ')}`);
      if (r.statsOpen) bad('(d) win: the stat tiles are open by default — they are the grown-up\'s numbers and start closed on a level');
      if (r.listShown) bad('(d) win: the standings are shown on an EAT dot — they belong to RIVALS, where they are the goal');
      else ok('(d) win: no standings on an EAT dot');
    }
  }

  // ── (d2) A MISS, and (d3) THE RACE ──────────────────────────────────────
  for (const race of [false, true]) {
    const tag = race ? 'race' : 'miss';
    const p = await open({ voidUnlocked: UNLOCK_ALL }, '?w=maple&g=1&len=10');
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0, null, { timeout: 600000 }).catch(() => { });
    await VIRTUALISE(p);
    const before = await p.evaluate(() => window.__levels().filter((x) => x.world === 'maple').map((x) => ({ n: x.goal, st: x.st, tries: x.n })));
    await p.evaluate(`window.READ = ${readCard.toString()}`);
    const r = await p.evaluate(([n, step, doRace]) => {
      let injected = false;
      for (let i = 0; i < n; i++) {
        const due = window.__q; window.__q = [];
        if (!due.length) return { broke: true, i };
        window.__virt += step;
        for (const cb of due) cb(window.__virt);
        const ms = window.__matchState();
        // THE RACE: one second into the TIME outro, shove the counter over the
        // line. TIME got there first, so the result must stay TIME.
        if (doRace && !injected && ms.clock <= -0.05
          && !document.getElementById('end')?.classList.contains('show')) {
          injected = true; window.__setScore(window.__levelSpec().eat + 5000);
        }
        if (document.getElementById('end')?.classList.contains('show')) {
          for (let k = 0; k < 12; k++) { const d2 = window.__q; window.__q = []; window.__virt += step; for (const cb of d2) cb(window.__virt); }
          return { ...window.READ(), injected };
        }
      }
      return { timeout: true, ...window.READ(), injected };
    }, [60 * 40, 1000 / 60, race]);
    await p.close();
    if (r.broke || r.timeout) { bad(`(d) ${tag}: the card never opened`); continue; }
    if (race && !r.injected) { bad('(d) race: the outro window was never caught, so the first-writer guard was not exercised'); continue; }
    if (r.hdState !== 'fin') bad(`(d) ${tag}: the headline pip is "${r.hdState}" after the buzzer with the goal unmet — it must be the come-back dot${race ? ', and a counter crossing DURING the outro must not steal the result' : ''}`);
    else ok(`(d) ${tag}: the headline is the fin pip${race ? ' even with the counter driven over the line inside the outro' : ''}`);
    if (r.hdGlyph !== 'ic-again') bad(`(d) ${tag}: the miss pip wears "${r.hdGlyph}" — a miss shows a come-back arrow, never a cross`);
    else ok(`(d) ${tag}: the miss wears the come-back arrow, captioned "${r.hdWord}"`);
    if (r.hdWord !== 'NOT YET') bad(`(d) ${tag}: the miss reads "${r.hdWord}"`);
    const d2 = (r.levels || []).find((x) => x.n === 2) || {};
    if (d2.st !== 'locked') bad(`(d) ${tag}: dot 2 is "${d2.st}" after a miss — only a WIN opens the next dot (§8.1)`);
    else ok(`(d) ${tag}: dot 2 stayed locked`);
    if (!(r.here || [])[0]) bad(`(d) ${tag}: the green here-ring is not on dot 1 — after a miss the ring has not moved`);
    else ok(`(d) ${tag}: the here-ring is still on dot 1`);
    const b1 = (before || []).find((x) => x.n === 1) || {};
    const a1 = (r.levels || []).find((x) => x.n === 1) || {};
    if (a1.tries !== (Number(b1.tries) || 0) + 1) bad(`(d) ${tag}: attempts went ${b1.tries} → ${a1.tries}`);
    else ok(`(d) ${tag}: the attempt was counted (${a1.tries})`);
    if (!/TRY AGAIN/.test(r.again)) bad(`(d) ${tag}: the footer reads "${r.again}" after a miss — it must say what it does, and what it does is replay this dot`);
    else ok(`(d) ${tag}: the footer says "${r.again}"`);
    if (r.nextState !== 'fin') bad(`(d) ${tag}: #endNext shows "${r.nextText || r.nextHtml.slice(0, 60)}" — after a miss the slot is this dot again, which is where the ring still is`);
    else ok(`(d) ${tag}: #endNext is this dot again, "${r.nextText}"`);
  }

  // ── (d4) RIVALS NEVER ENDS EARLY ────────────────────────────────────────
  {
    const p = await open({ voidUnlocked: UNLOCK_ALL }, '?w=maple&g=4&len=12');
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0, null, { timeout: 600000 }).catch(() => { });
    await VIRTUALISE(p);
    const r = await p.evaluate(([n, step]) => {
      // hand her rank 1 from the first frame: a rank is only true at the
      // buzzer, so this must NOT end the match
      window.__setRivalScores([0, 0, 0, 0, 0]);
      let early = null;
      for (let i = 0; i < n; i++) {
        const due = window.__q; window.__q = [];
        if (!due.length) return { broke: true, i };
        window.__virt += step;
        for (const cb of due) cb(window.__virt);
        window.__setRivalScores([0, 0, 0, 0, 0]);
        const ms = window.__matchState();
        if (document.getElementById('end')?.classList.contains('show')) {
          if (ms.clock > 0.2 && !early) early = +ms.clock.toFixed(2);
          return { early, clock: +ms.clock.toFixed(2), rank: ms.rank,
            hdState: (document.querySelector('#endHd .pip')?.className.match(/s-(\w+)/) || [])[1] ?? '' };
        }
      }
      return { timeout: true };
    }, [60 * 40, 1000 / 60]);
    await p.close();
    if (r.broke || r.timeout) bad('(d) rivals: the card never opened');
    else if (r.early !== null) bad(`(d) rivals: the match ended at clock ${r.early} while leading — a rank is only true at the buzzer, so RIVALS may never end early`);
    else {
      ok(`(d) rivals: leading from the first frame, the match still ran to the buzzer (clock ${r.clock})`);
      if (!['done', 'clear'].includes(r.hdState)) bad(`(d) rivals: rank ${r.rank} at the buzzer gave the "${r.hdState}" pip — first place is a win`);
      else ok(`(d) rivals: rank ${r.rank} at the buzzer resolved as ${r.hdState}`);
    }
  }

  // ── (d5) THE ORDINAL IS FOR THE END CARD, NOT THE MENU ──────────────────
  {
    const p = await open({ voidUnlocked: UNLOCK_ALL }, '?w=maple');
    const inMenu = await p.evaluate(() => {
      const m = document.getElementById('menu');
      return m ? /\d+\s+OF\s+30/.test(m.textContent || '') : null;
    });
    await p.close();
    if (inMenu === null) bad('(d) there is no #menu to check');
    else if (inMenu) bad('(d) "N OF 30" appears in #menu — the 1-30 ordinal is the grown-up\'s number and belongs on the end card only (§4.7 bar 6)');
    else ok('(d) the 1-30 ordinal stays off the menu');
  }
}

// ── (j) THE LADDER ON THE MENU ─────────────────────────────────────────────
// The owner's ask, in his words: "like hole.io we see them right but they're
// locked and as we progress they unlock like angry birds as well."
//
// Two surfaces. The MENU shows the world she is on — her five dots, the ring on
// hers, the line saying what this one wants, and a PLAY that launches exactly
// the dot the ring is on. The PICKER shows all thirty at once, so the shape of
// the whole game is visible from one screen.
//
// The bars that matter are the ones a screenshot cannot check: that the dots
// AGREE with the ladder's own state, that PLAY and the ring can never point at
// different dots, and that a locked dot refuses without punishing.
if (ONLY.includes('j')) {
  // a profile part-way through Maple and part-way through Pirate, so the row
  // has every state in it at once and a pass cannot be a pass on all-locked
  const SEED = JSON.stringify({ v: 1, w: {
    maple: { 1: { st: 'clear', best: 24100, pct: 31, n: 3 },
      2: { st: 'done', best: 3, pct: 22, n: 2 },
      3: { st: 'fin', best: 0, pct: 18, n: 4 } },
    pirate: { 1: { st: 'clear', n: 1 } },
  } });
  const SQUARE = `[...document.querySelectorAll('.pip')].map((e) => {
    const b = e.getBoundingClientRect();
    return { w: Math.round(b.width), h: Math.round(b.height) };
  }).filter((b) => b.w !== b.h)`;

  // ── the menu's own row ──────────────────────────────────────────────────
  {
    const p = await open({ voidUnlocked: UNLOCK_ALL, voidLevels: SEED }, '?w=maple&manual=1');
    const r = await p.evaluate(`(() => {
      const rows = window.__levels().filter((x) => x.world === 'maple');
      const pips = [...document.querySelectorAll('#mlPips .pip')];
      return {
        truth: rows.map((x) => x.st),
        drawn: pips.map((e) => (e.className.match(/s-(\\w+)/) || [])[1] ?? ''),
        here: pips.map((e, i) => (e.classList.contains('here') ? i + 1 : 0)).filter(Boolean),
        cur: window.__levelCurrent('maple'),
        world: document.getElementById('mlWorld')?.textContent ?? '',
        goal: document.getElementById('mlGoal')?.textContent ?? '',
        play: (document.getElementById('btnPlay')?.textContent ?? '').trim(),
        skew: ${SQUARE},
        menuVisible: getComputedStyle(document.getElementById('menuLadder')).display !== 'none',
      };
    })()`);
    await p.close();
    if (!r.menuVisible) bad('(j) #menuLadder is not visible on the menu');
    if (r.drawn.length !== 5) bad(`(j) the menu shows ${r.drawn.length} dots, not 5`);
    else if (r.drawn.join(',') !== r.truth.join(',')) bad(`(j) the menu draws ${r.drawn.join('·')} but the ladder says ${r.truth.join('·')} — the pips must never disagree with the rule that lifts them`);
    else ok(`(j) the menu's five dots match the ladder: ${r.drawn.join(' · ')}`);
    if (r.here.length !== 1) bad(`(j) ${r.here.length} dots wear the here-ring — there is exactly one current dot per world by construction`);
    else if (r.here[0] !== r.cur) bad(`(j) the here-ring is on dot ${r.here[0]} but current() says ${r.cur}`);
    else ok(`(j) the here-ring is on dot ${r.cur}, where current() says she is`);
    if (!/MAPLE/i.test(r.world)) bad(`(j) the ladder names the world "${r.world}"`);
    else ok(`(j) the ladder names her world: ${r.world}`);
    if (!r.goal || r.goal.length < 4) bad(`(j) the goal line reads "${r.goal}"`);
    else ok(`(j) the line under the dots says what this one wants: "${r.goal}"`);
    if (r.skew.length) bad(`(j) ${r.skew.length} pip(s) are not square — ${JSON.stringify(r.skew.slice(0, 3))}. A host's own text rules can reach a pip; it has to keep its shape anyway`);
    else ok('(j) every pip on the menu is square');
  }

  // ── PLAY launches the dot the ring is on, with no navigation ────────────
  {
    const p = await open({ voidUnlocked: UNLOCK_ALL, voidLevels: SEED }, '?w=maple&manual=1');
    await p.evaluate(() => { window.__marker = 'here'; });
    const cur = await p.evaluate(() => window.__levelCurrent('maple'));
    await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
      if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
    await p.click('#btnPlay');
    await p.waitForFunction(() => window.__matchState?.().armed === true, null, { timeout: 120000 })
      .catch(() => { });
    const r = await p.evaluate(() => ({
      armed: !!window.__matchState?.().armed,
      started: (window.__matchState?.().t ?? 0) > 0,
      playing: typeof window.__levelPlaying === 'function' ? window.__levelPlaying() : 'hook missing',
      survived: window.__marker === 'here',
      worlds: !!document.getElementById('worlds')?.classList.contains('show'),
      menuHidden: getComputedStyle(document.getElementById('menu')).display === 'none',
    }));
    await p.close();
    if (!r.survived) bad('(j) PLAY navigated — the page reloaded to start a match on the world already built');
    else ok('(j) PLAY did not reload the page');
    if (r.worlds) bad('(j) PLAY opened the world picker — she has a world and a dot on it, and the ring above the button is pointing at it');
    else ok('(j) PLAY did not stop to ask which world');
    if (!r.armed) bad('(j) one tap on PLAY did not arm a match');
    else ok('(j) one tap on PLAY armed a match');
    if (r.playing !== cur) bad(`(j) PLAY launched dot ${JSON.stringify(r.playing)} but the ring is on ${cur} — the button and the ring must never point at different dots`);
    else ok(`(j) PLAY launched dot ${cur}, the dot the ring is on`);
    if (!r.menuHidden) bad('(j) the menu is still up after PLAY');
    if (r.started) bad('(j) the match STARTED on the PLAY tap — the clock waits for her first touch (?manual=1)');
  }

  // ── a dot she can reach plays; a dot she cannot refuses, and says why ───
  {
    const p = await open({ voidUnlocked: UNLOCK_ALL, voidLevels: SEED }, '?w=maple&manual=1');
    await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
      if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
    // dot 5 is locked on this profile
    await p.evaluate(() => document.querySelectorAll('#mlPips .pip')[4]?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await p.waitForTimeout(400);
    const locked = await p.evaluate(() => ({
      armed: !!window.__matchState?.().armed,
      playing: typeof window.__levelPlaying === 'function' ? window.__levelPlaying() : 'hook missing',
      said: document.getElementById('mlGoal')?.textContent ?? '',
      shook: !!document.querySelectorAll('#mlPips .pip')[4]?.classList.contains('shake'),
    }));
    if (locked.armed) bad('(j) tapping a LOCKED dot started a match on it — the padlock has to mean something');
    else ok('(j) a locked dot does not start');
    if (!locked.shook) bad('(j) a locked dot was tapped and nothing moved — a padlock with no answer is a broken button');
    else ok('(j) a locked dot shakes when tapped');
    if (!/FINISH LEVEL/i.test(locked.said)) bad(`(j) the locked dot said "${locked.said}" — it must say what opens it`);
    else ok(`(j) it says what opens it: "${locked.said}"`);
    // …and dot 2, which she has already done, replays
    await p.evaluate(() => document.querySelectorAll('#mlPips .pip')[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await p.waitForFunction(() => window.__matchState?.().armed === true, null, { timeout: 120000 })
      .catch(() => { });
    const open2 = await p.evaluate(() => ({
      armed: !!window.__matchState?.().armed,
      playing: typeof window.__levelPlaying === 'function' ? window.__levelPlaying() : 'hook missing',
    }));
    await p.close();
    if (!open2.armed || open2.playing !== 2) bad(`(j) tapping dot 2 (already done) gave playing=${JSON.stringify(open2.playing)} armed=${open2.armed} — an earned dot is replayable`);
    else ok('(j) tapping a dot she has already done replays it');
  }

  // ── all thirty, in the picker ───────────────────────────────────────────
  {
    const p = await open({ voidUnlocked: UNLOCK_ALL, voidLevels: SEED }, '?w=maple&manual=1');
    await p.evaluate(() => document.getElementById('worlds')?.classList.add('show'));
    await p.waitForTimeout(600);
    const r = await p.evaluate(`(() => {
      const truth = {};
      for (const x of window.__levels()) (truth[x.world] ??= []).push(x.st);
      const cards = [...document.querySelectorAll('#worldRow .wCard[data-world]')].map((c) => ({
        w: c.dataset.world,
        drawn: [...c.querySelectorAll('.wPips .pip')].map((e) => (e.className.match(/s-(\\w+)/) || [])[1] ?? ''),
      }));
      return { truth, cards, total: document.querySelectorAll('#worldRow .wPips .pip').length,
        skew: ${SQUARE} };
    })()`);
    await p.close();
    if (r.total !== 30) bad(`(j) the picker shows ${r.total} dots — the game is thirty, and seeing all of them is the point`);
    else ok('(j) all thirty dots are on the picker at once');
    for (const c of r.cards) {
      const t = (r.truth[c.w] || []).join(',');
      if (c.drawn.join(',') !== t) bad(`(j) ${c.w}'s card draws ${c.drawn.join('·')} but the ladder says ${t}`);
    }
    if (r.cards.every((c) => c.drawn.join(',') === (r.truth[c.w] || []).join(','))) ok('(j) every world card agrees with the ladder');
    if (r.skew.length) bad(`(j) ${r.skew.length} pip(s) in the picker are not square — ${JSON.stringify(r.skew.slice(0, 3))}`);
    else ok('(j) every pip in the picker is square');
  }
}

// ── (i) A HARNESS MATCH IS GOAL-FREE ───────────────────────────────────────
if (ONLY.includes('i')) {
  // ?len= turns on DEBUG_HARNESS and AUTO_START (prototype3d.ts:3787, :3799):
  // the browser starts its own match with nobody behind it. If such a match
  // counted as a level attempt, every existing match probe would silently
  // become a level-1 run on day 5 — and newsfeed, faceparity and econ pair
  // their runs, so their baselines would un-pair without anything looking
  // broken. §3.1: `playing` is set only by PLAY, a pip tap or voidPlayGoal.
  const p = await open({ voidUnlocked: UNLOCK_ALL }, '?w=maple&len=8');
  const before = await p.evaluate(() => window.__levels());
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2, null, { timeout: 600000 }).catch(() => { });
  const playing = await p.evaluate(() => window.__levelPlaying ? window.__levelPlaying() : 'hook missing');
  const after = await p.evaluate(() => window.__levels());
  await p.close();
  if (playing !== null) bad(`(i) an AUTO_START harness match set playing=${JSON.stringify(playing)} — a match nobody chose is not a level attempt`);
  else ok(`(i) an AUTO_START harness match runs goal-free`);
  if (JSON.stringify(before) !== JSON.stringify(after)) bad(`(i) the harness match changed __levels() — every existing match probe would become a level run`);
  else ok(`(i) __levels() is untouched by a harness match`);
}

await b.close();
const secs = ((Date.now() - t0) / 1000).toFixed(0);
if (fails.length) {
  for (const f of fails) console.log(`  · ${f}`);
  console.log(`\nFAIL — the ladder does not hold its own state (${fails.length} finding(s)) [${secs}s]`);
  process.exit(1);
}
console.log(`\nPASS — the ladder holds: ${ONLY.join('/')} green, the win gate moves the ring only on 'done' [${secs}s]`);
