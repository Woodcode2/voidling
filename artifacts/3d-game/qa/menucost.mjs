// WHAT DOES THE SHIPPED MENU COST, NOW THAT IT IS A WORLD?
//
// Day 9 of the menu stream. Day 1 measured candidate stages before any of them
// existed (qa/menuframe.mjs, MENU-BRIEF §2.9); day 8 shipped one. This measures
// THE THING THAT SHIPPED — the frame a child's phone actually draws while she
// sits on the menu deciding — against the frame it draws while she plays.
//
// WHY IT MATTERS MORE THAN IT LOOKS. The menu is where a phone sits for the
// longest unbroken stretch: a child opens the app, looks at it, wanders off,
// comes back. A match is three minutes and then it stops. If the menu frame is
// dearer than the match frame, the app's battery and heat profile is set by the
// screen where NOTHING IS HAPPENING — which is the worst possible trade, and
// invisible to anyone who only ever profiles gameplay.
//
// THE ONE THING THAT MAKES THIS HARD, from day 1 and worth repeating because it
// invalidates any number taken without it: renderer.info.autoReset defaults
// TRUE and resets the counters inside every renderer.render() call. On a rung
// carrying bloom the composer makes about fifteen of those per animation frame,
// so a naive read returns the cost of the LAST post pass — usually 1 — and a
// naive frame counter reports a frame rate fifteen times too high. autoReset is
// turned off here and animFrames (animate()'s own count) is what a "frame"
// means.
//
// AND THE SHADOW PASS HAS ITS OWN PARITY. It runs on alternate frames, so a
// single sample lands on one side of a coin. Both parities are sampled and
// reported separately: the gap between them IS the shadow pass, which day 1
// measured at 72-92% of the whole menu frame.
//
//   node qa/menucost.mjs [world|all] [port]
import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';
import { enterMatch } from './_enter.mjs';

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const WORLD_ARG = positional[0] || 'all';
const PORT = positional[1] || '4177';
const worlds = WORLD_ARG === 'all' ? ALL_WORLDS : [WORLD_ARG];
const FRAMES = 24;     // animation frames per sample; enough for both parities
const DISCARD = 40;    // frames thrown away after a state change, before sampling
const REPEATS = Number((process.argv.find((a) => a.startsWith('--repeats=')) || '--repeats=3').slice(10));

const t0 = Date.now();
const rows = [];
const bad = [];
const note = (m) => { bad.push(m); console.log(`  BAD  ${m}`); };

process.on('uncaughtException', (e) => { console.log(`\nFAIL — menucost threw: ${e.message.split('\n')[0]}`); process.exit(1); });
process.on('unhandledRejection', (e) => { console.log(`\nFAIL — menucost rejected: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

/** Wait for `n` ANIMATION frames — never render calls, never wall clock. */
const waitFrames = async (p, n, capMs = 600000) => {
  const from = await p.evaluate(() => window.__frameInfo().animFrames);
  await p.waitForFunction(([f, k]) => window.__frameInfo().animFrames - f >= k,
    [from, n], { timeout: capMs, polling: 250 }).catch(() => { });
  return p.evaluate((f) => window.__frameInfo().animFrames - f, from);
};

/** THE MEAN COST OF AN ANIMATION FRAME, over a window.
 *
 *  The first version of this read the counters ONCE PER FRAME — reset, wait one
 *  animation frame, read — which is exact while every frame draws and complete
 *  nonsense the moment one does not. Day 9's half-rate menu skips the DRAW on
 *  alternate frames (never the rAF), so half the per-frame reads landed on a
 *  frame with no render in it at all, and the "mean" it produced went UP when
 *  the real cost halved. Recorded rather than quietly fixed: the numbers taken
 *  that way (519, 410) are sound against each other and NOT against anything
 *  measured after the skip landed.
 *
 *  renderer.info accumulates while autoReset is false, so: reset once, let N
 *  animation frames go by, read the total, divide by N. That is the number a
 *  battery actually pays, it is immune to any cadence trick, and it is the only
 *  honest way to compare a screen that draws every frame with one that does
 *  not. */
const sample = async (p, frames = FRAMES) => {
  await p.evaluate(() => { window.__renderer.info.autoReset = false; window.__renderer.info.reset(); });
  const got = await waitFrames(p, frames);
  const r = await p.evaluate(() => {
    const f = window.__frameInfo();
    return { calls: f.calls, tris: f.tris, shadows: f.shadows, bloom: f.bloom,
      pr: f.pr, q: f.qLevel };
  });
  await p.evaluate(() => { window.__renderer.info.autoReset = true; });
  const n = Math.max(1, got);
  return {
    callsMean: Math.round(r.calls / n), trisMean: Math.round(r.tris / n),
    frames: n, callsTotal: r.calls,
    shadows: r.shadows, bloom: r.bloom, pr: r.pr, q: r.q,
  };
};

console.log(`\n  MENU COST — the frame a phone draws while she is deciding\n`);
console.log(`  ${'world'.padEnd(9)} ${'where'.padEnd(6)} ${'calls/frame'.padStart(11)} ${'tris/frame'.padStart(11)} ${'frames'.padStart(6)}  q bloom`);

for (const w of worlds) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => note(`${w}: pageerror ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__frameInfo && !!window.__menuState, null, { timeout: 420000 });

  // ── THE MENU, BOTH WAYS, ON THE SAME ISLAND ─────────────────────────────
  // A and B are the same page. The prop scatter is re-rolled every load and the
  // stage azimuth with it, so measuring the savings by building twice compares
  // two different towns: single runs of one build came back 233, 269 and 274
  // calls a frame. Here the island is fixed and only the savings move.
  const inDiorama = await p.evaluate(() => window.__menuState().menuMode);
  if (!inDiorama) note(`${w}: the menu is not in diorama mode — this is measuring the old splash`);
  if (!(await p.evaluate(() => typeof window.__menuOptim === 'function'))) {
    note(`${w}: __menuOptim is missing — the savings cannot be isolated`);
  }
  const menuPair = { on: [], off: [] };
  for (let i = 0; i < REPEATS; i++) {
    for (const mode of ['off', 'on']) {
      await p.evaluate((m) => window.__menuOptim?.(m === 'on'), mode);
      await waitFrames(p, DISCARD);
      menuPair[mode].push(await sample(p));
    }
  }
  await p.evaluate(() => window.__menuOptim?.(true));
  const med = (a) => { const v = a.slice().sort((x, y) => x - y); return v[Math.floor(v.length / 2)]; };
  const menu = { ...menuPair.on[0],
    callsMean: med(menuPair.on.map((r) => r.callsMean)),
    trisMean: med(menuPair.on.map((r) => r.trisMean)) };
  const menuRaw = { ...menuPair.off[0],
    callsMean: med(menuPair.off.map((r) => r.callsMean)),
    trisMean: med(menuPair.off.map((r) => r.trisMean)) };
  rows.push({ w, where: 'menu', ...menu });
  rows.push({ w, where: 'menu-raw', ...menuRaw });

  // ── THE MATCH, settled ──────────────────────────────────────────────────
  await enterMatch(p, w);
  await p.waitForFunction(() => window.__matchState?.().armed === true, null, { timeout: 300000 }).catch(() => { });
  // one touch starts the clock; then let the opening move finish before sampling,
  // on the GAME's clock, because the descent is a game-time event
  const cv = await p.$('canvas');
  if (cv) { await p.mouse.move(215, 700); await p.mouse.down(); await p.mouse.move(215, 640); }
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 }).catch(() => { });
  if (cv) await p.mouse.up();
  await waitFrames(p, DISCARD);
  const match = await sample(p);
  rows.push({ w, where: 'match', ...match });
  await p.close();

  for (const r of [menuRaw, menu, match]) {
    const tag = r === menu ? 'menu' : r === menuRaw ? 'menu-raw' : 'match';
    console.log(`  ${w.padEnd(9)} ${tag.padEnd(9)} ${String(r.callsMean).padStart(11)} ${String(r.trisMean).padStart(11)} ${String(r.frames).padStart(6)}  ${r.q} ${r.bloom ? 'on' : 'off'}`);
  }
  const ratio = match.callsMean ? menu.callsMean / match.callsMean : 0;
  const rawRatio = match.callsMean ? menuRaw.callsMean / match.callsMean : 0;
  const saved = menuRaw.callsMean ? 1 - menu.callsMean / menuRaw.callsMean : 0;
  console.log(`  ${''.padEnd(9)} ${'→'.padEnd(6)} the three savings cut the menu frame by ${(saved * 100).toFixed(0)}% `
    + `(${menuRaw.callsMean} → ${menu.callsMean} calls/frame, median of ${REPEATS}); `
    + `menu/match ${rawRatio.toFixed(2)}x → ${ratio.toFixed(2)}x\n`);
}

await b.close();
const secs = ((Date.now() - t0) / 1000).toFixed(0);
if (bad.length) {
  for (const m of bad) console.log(`  · ${m}`);
  console.log(`\nFAIL — the measurement itself is unsound (${bad.length}) [${secs}s]`);
  process.exit(1);
}
// A REPORT, NOT A BAR. Day 9 sets the bar once these numbers exist — setting one
// first would be choosing a threshold before knowing what is being thresholded,
// which is how §2.8.3's bar came to be written against a number that was wrong.
console.log(`PASS — measured ${rows.length / 3} world(s) [${secs}s]`);
