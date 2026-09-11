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
// WHAT EACH PART COVERS (day 3 lands a, f, g, i; b, c, d, e, h arrive with the
// match wiring on days 4-6 and are not stubbed here — a probe that pretends to
// cover something is worse than one that says it does not):
//
//   (a) state machine   the 30 rows, the five states, exactly one current per
//                       world, and current() following a WIN rather than a
//                       finish
//   (f) migration       monotone, never re-locks, maple/1 always at least open
//   (g) telemetry       the level_* events fire once with the right payload
//   (i) goal-free       a harness match with no ladder seeded touches nothing
//
// A MISSING HOOK THROWS, it does not skip. qa/_zgrade.mjs modelled a tone curve
// that had been replaced hours earlier and qa/_headcover.mjs reported scalp
// coverage after the hair was raised; both passed. GOVERNOR.md rule 4: parse
// the real thing and throw if the call site has moved.
//
//   node qa/levels.mjs [port] [--only=a,f,g,i]
import { chromium } from 'playwright';
import { ALL_WORLDS, UNLOCK_ALL } from './worlds.mjs';

const flag = (n, d) => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const PORT = process.argv.slice(2).filter((a) => !a.startsWith('--'))[0] || '4177';
const ONLY = flag('only', 'a,f,g,i').split(',');

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
