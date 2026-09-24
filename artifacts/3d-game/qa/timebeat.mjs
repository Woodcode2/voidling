// TIME, NOT THE CAMERA, SELLS THE MARQUEE MOMENTS — research governor G8.
//
//   node qa/timebeat.mjs [port] [world] [--only=s,b,c,g,a,e,f,d]   ((b2) rides b, (c2) and (c3) c, (d2) d)
//
// Eating a sibling is the marquee play of the whole game, and until G8 it got
// no pause at all. Its budget went to three calls the owner had already turned
// into no-ops (fx.shake, camPunch, fx.kick: "I don't want any shake. 0."), the
// one hit-stop in the game fired only on a big bite's swallow, and while that
// stop held the world at 6% it held the HERO at 6% too — his jaw and his eyes
// froze with the town. G8 sells the moment with time instead of the camera:
// a freeze, a slow stretch, a ray pulse and a dizzy sibling, all behind one
// switch (?killbeat=1) that is OFF until the owner has seen it, plus four
// fixes that ship ON because nobody can see them as a feature — only as a
// fault going away.
//
// ── WHAT IS READ, AND FROM WHERE ──────────────────────────────────────────
// Everything is keyed on the game's own clock, tClock, never on the wall: under
// the software renderer the match clock runs ~14x slower than the wall. The two
// match pages run in LOCKSTEP: an init script wraps requestAnimationFrame, and
// once the match is running the probe holds every queued callback and releases
// them one frame at a time, at least 60 ms of wall apart — so animate() clamps
// every dt to exactly 0.05 s and row k is the state one finished frame left.
// Drawing is stubbed on those pages (nothing here is a pixel); the sheet the
// owner looks at is qa/killbeat.mjs, which draws.
//
//   __juiceState()   stop (stopT), worldK (dtw / dt of the last frame), slow
//                    (the slow-motion scale in force), flashes (fx's count of
//                    washes it has SHOWN — background writes, not calls),
//                    killPulses, stops / longStops (freezes begun / past 100 ms)
//   __faceState()    hold — the hero's jaw clock (mouthT), which counts down by
//                    exactly the dt the frame loop hands voidling.update()
//   __rivalBeside()  puts a sibling beside him, small enough for the FAMILY'S
//                    OWN swallow rule; the kill is rivals.update()'s, not ours
//   __rivalFace()    her gulp clock and her two pupils, off the meshes
//   #kill            the ray pulse's own element, its inline opacity and scale
//
//   __fx.flashShown()  the wash overlay's own background and opacity: the
//                    colour the child is being shown this frame
//
// ── THE BARS ──────────────────────────────────────────────────────────────
//   (s) SOURCE. The rival handler in prototype3d.ts (rivals.onRivalEaten)
//       calls none of fx.shake / camPunch / fx.kick — all three no-ops by the
//       owner's order — and exactly one fx.flash. Throws if the handler moved.
//       IT GRADES THE SOURCE TREE THIS PROBE SITS IN (../src/prototype3d.ts,
//       printed on the line), NOT THE BUILD ON [port]: every other bar reads
//       the served page, this one cannot — a minified bundle keeps fx.shake's
//       property name but not camPunch's. So a copy of this probe in a fixed
//       tree, pointed at a server of an older build, prints (s) PASS for the
//       tree and FAILs the rest for the build (the G8 review did exactly that
//       and saw it). To grade a build's handler, run the probe from that
//       build's own tree (a git-archive export of the commit is enough).
//   ── the switch OFF (the default, ?w= only) ──
//   (b) THE HERO LIVES THROUGH A STOP. A hit-stop armed through the real
//       hitStop(), the gape pinned so the jaw clock runs: on every frame the
//       freeze holds from end to end, the jaw clock advances by at least 0.30
//       of tClock (spec: heroDt = dt x 0.35) while the world stays at 0.07 or
//       under. Before G8 the hero ran on dtw and read 0.06.
//   (b2) THE WORLD EASES OUT OF IT. No frame steps the world from 0.1 or under
//       straight to 0.999 or over (spec: a 60 ms ease, not a snap).
//   (c) THE FLASH GOVERNOR. Five fx.flash() calls on five frames spanning at
//       most 200 ms of tClock, after a second with no wash: at most TWO washes
//       shown (spec: 2 per rolling second, a call inside the window blends
//       into the live wash). Before G8: five.
//   (c3) THE CAP, AND DANGER PAST IT. After a clean second: two washes of the
//       probe's own start and fade, each called with nothing on screen; a
//       third inside the same rolling second of tClock is NOT drawn (the
//       spec's 2 a second, which (c) never reaches — its five calls all land
//       inside one live wash); then a nibble through the REAL bite handler
//       (__bite(false), violet) IS drawn — a warning is never the one the cap
//       drops. The G8 build drew two of three and then dropped the nibble.
//   (c2) DANGER PAINTS OVER A LIVE WASH. A gold wash of the probe's own, then,
//       while it is still up, a form bite through the REAL bite handler
//       (__bite(true)): the overlay must show RED (hue within 20 degrees of
//       0, saturation 0.5 or more — qa/dangerchannel.mjs's own rule) — and
//       a green call on the next frame, inside the red, must leave it red. The
//       G8 build kept the gold: the governor's blend kept the colour already
//       showing, so the bite that costs a form was shown as a reward.
//       (c3) runs first: a nibble buys 2.5 s of the bite handler's mercy and a
//       form bite 6, and the probe waits the nibble's out, not the form's.
//   (g) THE SWITCH IS OFF BY DEFAULT. A sibling eaten beside him arms no stop
//       and no slow motion, fires no ray pulse, leaves her pupils where they
//       were, and shows exactly one wash.
//   ── the switch ON (?killbeat=1&g=1) ──
//   (a) THE KILL BEAT. On the kill frame the freeze reads 0.14-0.16 s; at the
//       first frame 150 ms of tClock later slow reads 0.25 and the world is at
//       0.25 or under; the kill showed exactly one wash and one ray pulse,
//       whose peak alpha is at most 0.35; and her pupils MOVE through her gulp
//       (three or more frame-to-frame moves over 0.005) — dizzy.
//   (e) REDUCE MOTION HALVES IT. BIG MOTION switched off through the pause
//       sheet's own control (#pauseMotion): the kill's freeze reads 0.07-0.08 s
//       and the ray pulse is visible for at most 0.25 s + one frame, at one
//       scale throughout.
//   (f) THE WHISTLE OWNS THE END. A sibling eaten first, and the dot's goal
//       met (__setScore to its EAT line) INSIDE her beat's slow stretch — the
//       freeze over, slow under 1, her rays up and her pupils circling: the
//       goal-met frame freezes 0.12 s, and from the frame after it slow reads
//       1, no ray is up and her pupils do not move — the whistle takes the
//       time and the stretch, the pulse and the dizzy end with it. Then a
//       sibling eaten inside the outro arms nothing — no new freeze, no slow
//       motion, no ray pulse. The G8 build met the goal in a stretch with no
//       freeze at all (a beat landing in a stretch JOINS it, and the goal has
//       no slow part to join with) and ran the stretch, the rays and the
//       dizzy on into the outro. Before the review this bar met the goal with
//       nothing running, which is the one case that could not show either.
//   ── the whole match (?killbeat=1&len=180, a child driver, drawing off) ──
//   (d) THE CEILING — THE LEAD'S BAR, AS SET. At most 8 freezes longer than
//       100 ms in one full match, every freeze counted, whoever took it
//       (__juiceState().longStops). The owner once measured 141 camera kicks
//       a minute; every new site here fires one to five times a match, and
//       this is the bar that says so. How many of them a beat armed or pushed
//       over (longBeats) is printed beside it. See REINSTATED, below.
//   (d2) THE BEATS. At most 20 marquee beats armed in that match, every kind
//       counted, the ones whose freeze is 100 ms or less (a sticker, the hero
//       landmark, a form) included — (d) cannot see those at all, however
//       many there are. 20 is the spec's own "one to five times a match" for
//       each of the four sites a level-free Maple match can fire (a sibling
//       eaten, the hero landmark, a sticker found, a form reached; the goal
//       needs a level). The G8 build's whole match for the review armed 7
//       (sticker 2, evolve 5) and the fixed build's 10 (landmark 1, sticker 4,
//       evolve 5); a beat hung on anything frequent — every bite, every near
//       miss — arms hundreds.
//
// ── RETRACTED BEFORE IT GATED ANYTHING: (d) COUNTED THE BITE, NOT THE BEAT ──
// (d) was first written as "at most 8 freezes longer than 100 ms", every freeze
// counted. On the build before G8 — the instrumentation commit, where no
// marquee beat exists and the ONLY freeze in the game is the bite hit-stop —
// it read "47 freeze(s), 9 over 100 ms" in a whole Maple match and FAILED:
// nine, and not one of them a beat's. On the first full G8 build it read 51
// and 10, with one marquee kill among the beats (a 0.16 s freeze, over the
// line by design) — and nothing it could read said whose the rest were. The
// bite's freeze is hitStop(0.055 + 0.05 * bite) with bite clamped to 1, so any meal
// of 0.9 of his radius or more freezes 0.100-0.105 s: its top rung sits ON
// this bar's line, and the bar was measuring that rung. That rung is not G8's
// to move ("hitStop stays") and shaving 5 ms off it to get under a line
// nobody can see would move this number for no reason a child could feel. So
// the game now says who took each freeze over the line (longBeatN, above
// armStop in prototype3d.ts), this bar judges the beats', and the total and
// the bite's share are printed on every run for whoever owns that rung.
//
// ── REINSTATED BY THE G8 REVIEW: THE LEAD'S BAR, AS WRITTEN ────────────────
// The retraction above swapped the lead's bar for one of its own, and the
// review found the swap worse than the fault it fixed: longBeats can count only
// a rival, the marquee or the goal (a sticker's and the landmark's freeze are
// exactly 0.10 s, a form's 0.08), so it was "at most 8 sibling kills a match"
// and could not see the stutter it was written for; and the whole-match total
// it set aside is the bite's, not the beats' — on the G8 build, switch on, this
// probe read "40 freeze(s), 6 over 100 ms (0 armed or pushed over by a marquee
// beat, 6 by the bite hit-stop alone)" in the run the review's fix was proved
// against. So (d) is the lead's bar again, every freeze counted, and the game
// — WITH ?killbeat=1 ONLY — holds the bite's hit-stop to 0.100 s (biteGulps:
// the ladder's sticker and landmark freeze, so no anonymous meal outlasts a
// named one's). That trims 0 to 5 ms off meals of 0.9 of his radius or more
// and leaves every freeze the bar counts a beat's; the game as it ships,
// switch off, keeps its rung to the millisecond. (d2) is the half the review
// asked for that (d) cannot be: a ceiling on the beats of 100 ms or under.
// (d) is a ceiling, not a detector: a match whose child driver happens to
// take few big bites passes it on either build — the run above did, at 6.
// The retraction stays above because it is still true of what it measured.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';
import { UNLOCK_ALL } from './worlds.mjs';

const die = (e) => { console.log(`\nFAIL — timebeat aborted before a verdict: ${String((e && e.message) || e).split('\n')[0]}`); process.exit(1); };
process.on('uncaughtException', die);
process.on('unhandledRejection', die);

const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = POS[0] || '4177', WORLD = POS[1] || 'maple';
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.slice(7).split(',') : ['s', 'b', 'c', 'g', 'a', 'e', 'f', 'd'];   // (b2) rides b, (c2)/(c3) c, (d2) d
const want = (k) => ONLY.includes(k);
const EPS = 1e-6;

const verdicts = [];
// both tokens spelled out, so qa/idiomguard.mjs #2a can see this probe say either
const verdict = (ok, id, msg) => { verdicts.push({ ok, line: ok ? `PASS — (${id}) ${msg}` : `FAIL — (${id}) ${msg}` }); };
const note = (s) => console.log(`    ${s}`);

// ── (s) THE SOURCE ─────────────────────────────────────────────────────────
if (want('s')) {
  // the tree this probe sits in, NOT the build on PORT (see the header's (s))
  const SRC_URL = new URL('../src/prototype3d.ts', import.meta.url);
  const SRC = readFileSync(SRC_URL, 'utf8');
  console.log(`\n  (s) grades the source next to this probe, not the build on :${PORT} — ${fileURLToPath(SRC_URL)}`);
  const at = SRC.indexOf('rivals.onRivalEaten = (');
  if (at < 0) die(new Error('rivals.onRivalEaten is not in src/prototype3d.ts — the handler moved, and a probe that skips what it cannot find is worse than none'));
  const end = SRC.indexOf('\n};\n', at);
  if (end < 0) die(new Error('could not find the end of rivals.onRivalEaten'));
  // code only: a comment that NAMES a retired call is history, not a call
  const code = SRC.slice(at, end).split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  const noops = ['fx.shake(', 'camPunch(', 'fx.kick('].filter((s) => code.includes(s));
  const nFlash = (code.match(/fx\.flash\(/g) || []).length;
  console.log(`  (s) rivals.onRivalEaten: ${noops.length ? `calls ${noops.join(' ')}` : 'no shake, punch or kick'}; ${nFlash} fx.flash() call(s)`);
  verdict(!noops.length && nFlash === 1, 's', !noops.length && nFlash === 1
    ? 'the rival handler (in the source beside this probe) spends nothing on the camera: no fx.shake, camPunch or fx.kick, and one fx.flash'
    : `the rival handler (in the source beside this probe) still ${noops.length ? `calls ${noops.join(', ')} (no-ops by the owner's order)` : ''}${noops.length && nFlash !== 1 ? ' and ' : ''}${nFlash !== 1 ? `makes ${nFlash} fx.flash() calls, not one` : ''}`);
}

const pageParts = ['b', 'c', 'g', 'a', 'e', 'f', 'd'].filter(want);
if (!pageParts.length) finish();

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

// ── LOCKSTEP ───────────────────────────────────────────────────────────────
// Installed before any page script runs, off until __lock.on. When on, every
// requestAnimationFrame callback is queued rather than scheduled, and __step
// releases the queue once per frame, at least `gap` ms of wall after the last,
// so animate()'s clock.getDelta() is over its 0.05 clamp and dt is exactly 0.05.
const LOCK = () => {
  const L = window.__lock = { on: false, q: [], err: null };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { if (L.on) { L.q.push(cb); return 0; } return raf(cb); };
  window.__step = async (n = 1, gap = 60) => {
    for (let i = 0; i < n; i++) {
      await new Promise((r) => setTimeout(r, gap));
      const q = L.q; L.q = [];
      const t = performance.now();
      for (const cb of q) { try { cb(t); } catch (e) { L.err = String((e && e.message) || e); } }
    }
  };
  // one row: the state one finished animate() left behind
  window.__row = (name) => {
    const j = window.__juiceState(), ms = window.__matchState();
    const k = document.getElementById('kill');
    const sc = k ? /scale\(([-\d.e]+)\)/.exec(k.style.transform || '') : null;
    return { tc: ms.tClock, stop: j.stop, wk: j.worldK, slow: j.slow ?? null, fl: j.flashes, kp: j.killPulses ?? null,
      stops: j.stops, longStops: j.longStops, beats: j.beats ?? null, ev: ms.ev.eaten, hold: window.__faceState().hold,
      kick: window.__kickN ?? 0, met: !!window.__goalState?.()?.met,
      ray: k ? { op: Number(k.style.opacity) || 0, shown: k.style.display !== 'none', scale: sc ? Number(sc[1]) : null } : null,
      face: name ? window.__rivalFace(name) : null };
  };
};

async function open(query, label) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  p.on('pageerror', (e) => console.log(`PAGEERR ${label} ` + String(e).slice(0, 160)));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(LOCK);
  await p.addInitScript((u) => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidFirstNom', '1'); localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidMotion', '1');   // BIG MOTION on: (e) turns it off in the page
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', u);
  } catch { /* private mode */ } }, UNLOCK_ALL);
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}${query}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  // no pixel is read on this page: drawing is the cost, and it goes
  await p.evaluate(() => { window.__renderer.render = () => { }; });
  const hooks = await p.evaluate(() => ['__juiceState', '__faceState', '__rivalBeside', '__rivalFace', '__hitStop',
    '__setVoidR', '__pinGape', '__setScore', '__goalState', '__levelSpec', '__stages', '__bite']
    .filter((k) => typeof window[k] !== 'function')
    .concat(['flash', 'flashShown'].filter((m) => !(window.__fx && typeof window.__fx[m] === 'function')).map((m) => `__fx.${m}`)));
  if (hooks.length) die(new Error(`this build has no ${hooks.join(', ')} — nothing here can be measured without ${hooks.length > 1 ? 'them' : 'it'}`));
  await enterMatch(p, WORLD);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000, polling: 250 });
  return p;
}
/** Lock the page's frame loop; resolves once animate() is waiting in the queue. */
const lock = (p) => p.evaluate(() => new Promise((res, rej) => {
  window.__lock.on = true;
  let n = 0;
  const w = () => { if (window.__lock.q.length) res(); else if (++n > 3000) rej(new Error('animate() never queued')); else setTimeout(w, 20); };
  w();
}));
const step = (p, n = 1) => p.evaluate((k) => window.__step(k), n);
const row = (p, name) => p.evaluate((nm) => window.__row(nm), name ?? null);
/** step n frames, one row after each */
const rows = async (p, n, name) => {
  const out = [];
  for (let i = 0; i < n; i++) { await step(p); out.push(await row(p, name)); }
  return out;
};

/** A SIBLING, EATEN BESIDE HIM. Walks one in if nobody has joined, places her
 *  at half his radius on the camera's right, steps, and returns the row of the
 *  frame her kill landed on (ev.eaten rose and her gulp clock started) plus the
 *  row before it. Re-places her if a frame passes without the kill. */
async function killOne(p) {
  let placed = null;
  for (let i = 0; i < 60 && !placed; i++) {
    placed = await p.evaluate(() => window.__rivalBeside(undefined, 0.5, 0.6));
    if (!placed) await step(p);
  }
  if (!placed) return { why: 'no sibling could be walked in and placed in 60 frames' };
  let before = await row(p, placed.name);
  for (let i = 0; i < 6; i++) {
    await step(p);
    const r = await row(p, placed.name);
    if (r.ev > before.ev && r.face && r.face.dyingT > 0) return { placed, before, at: r };
    before = r;
    await p.evaluate((nm) => window.__rivalBeside(nm, 0.5, 0.6), placed.name);
  }
  return { why: `${placed.name} was placed beside him six times and never eaten` };
}

const fmt = (x, d = 3) => (x === null || x === undefined ? 'n/a' : Number(x).toFixed(d));

// ── WHAT COLOUR IS UP ──────────────────────────────────────────────────────
// The overlay's background as the browser normalised it, first colour stop
// read. RED is qa/dangerchannel.mjs's rule, so the two probes cannot disagree
// about what red is: hue within 20 degrees of 0 at HSV saturation 0.5 or more.
const firstRgb = (bg) => {
  const m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(String(bg));
  return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
};
const hueOf = ({ r, g, b }) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx <= 0 || mx === mn) return { h: 0, s: 0 };
  let h = mx === r ? 60 * (((g - b) / (mx - mn)) % 6) : mx === g ? 60 * ((b - r) / (mx - mn) + 2) : 60 * ((r - g) / (mx - mn) + 4);
  return { h: (h + 360) % 360, s: (mx - mn) / mx };
};
const isRedBg = (bg) => { const c = firstRgb(bg); if (!c) return false; const { h, s } = hueOf(c); return s >= 0.5 && (h <= 20 || h >= 340); };
const hueTxt = (bg) => { const c = firstRgb(bg); return c ? `hue ${Math.round(hueOf(c).h)}` : 'no colour'; };
/** the overlay, now */
const shown = (p) => p.evaluate(() => ({ ...window.__fx.flashShown(), fl: window.__juiceState().flashes, tc: window.__matchState().tClock }));
/** step until 1.1 s of tClock (22 frames) has shown no new wash and nothing
 *  is up — the governor's rolling second then holds only what the caller does
 *  next. 22, not 20: twenty sums of 0.05 can land a hair under 1.0, and a wash
 *  begun exactly one second back would still be in the window. Returns false
 *  if the game would not go quiet. */
async function quietSecond(p) {
  let quiet = 0, last = (await row(p)).fl;
  for (let i = 0; i < 400 && quiet < 22; i++) {
    await step(p);
    const s = await shown(p);
    if (s.fl === last && !(s.op > 0)) quiet++; else { quiet = 0; last = s.fl; }
  }
  return quiet >= 22;
}
/** step until nothing is on the overlay, at most `n` frames */
async function fade(p, n = 12) {
  for (let i = 0; i < n; i++) { if (!((await shown(p)).op > 0)) return true; await step(p); }
  return !((await shown(p)).op > 0);
}

// ═══ PAGE 1: THE SWITCH OFF ═════════════════════════════════════════════════
if (['b', 'c', 'g'].some(want)) {
  console.log(`\n  PAGE 1 — ${WORLD}, the switch OFF (default)`);
  const p = await open('', 'off');
  await p.evaluate(() => window.__setVoidR(3));
  await lock(p);
  await step(p, 10);

  if (want('b')) {
    // ── (b) + (b2): a stop, the hero's jaw clock and the world's own ──────
    await p.evaluate(() => window.__pinGape(0.5));   // mouthT = 999: the jaw clock runs every frame
    let ok = false;
    for (let i = 0; i < 40 && !ok; i++) {
      const j = await p.evaluate(() => window.__juiceState());
      if (!(j.stopCd > 0) && !(j.stop > 0)) ok = true; else await step(p);
    }
    const armed = ok ? await p.evaluate(() => window.__hitStop(0.14)) : 0;
    const r0 = await row(p);
    const R = [r0, ...(await rows(p, 8))];
    await p.evaluate(() => window.__pinGape(0));
    console.log(`  (b) __hitStop(0.14) armed ${fmt(armed)} s; frame by frame (tClock / stop / world / hero):`);
    const inside = [];
    for (let k = 1; k < R.length; k++) {
      const dt = R[k].tc - R[k - 1].tc;
      const hero = dt > 0 ? (R[k - 1].hold - R[k].hold) / dt : NaN;
      note(`${fmt(R[k].tc)}  stop ${fmt(R[k].stop)}  world ${fmt(R[k].wk)}  hero ${fmt(hero)}`);
      // the freeze held across this whole frame: armed before it and still
      // running after it
      if (R[k - 1].stop > 0 && R[k].stop > 0) inside.push({ hero, wk: R[k].wk });
    }
    if (!(armed > 0.14 - EPS)) verdict(false, 'b', `__hitStop(0.14) armed ${fmt(armed)} s — hitStop()'s cooldown never cleared in 40 frames, so there was no stop to read the hero through`);
    // (R[0] is read AFTER the arming, so frame 1 counts as frozen end to end)
    else if (!inside.length) verdict(false, 'b', 'no frame was frozen from end to end — nothing to read the hero through');
    else {
      const hMin = Math.min(...inside.map((x) => x.hero)), wMax = Math.max(...inside.map((x) => x.wk));
      verdict(hMin >= 0.30 && wMax <= 0.07, 'b', hMin >= 0.30 && wMax <= 0.07
        ? `the hero lives through a hit-stop: his jaw clock ran at ${fmt(hMin)} of tClock on every frozen frame (bar 0.30) while the world held at ${fmt(wMax)}`
        : hMin < 0.30 ? `the hero freezes with the world: his jaw clock ran at ${fmt(hMin)} of tClock on a frozen frame (bar 0.30 — his jaw and eyes stop with the town)`
          : `the world did not freeze: ${fmt(wMax)} of dt on a frame inside the stop (bar 0.07)`);
    }
    // (b2) the ease — every consecutive pair after the freeze began
    const snaps = [];
    for (let k = 2; k < R.length; k++) if (R[k - 1].wk <= 0.1 && R[k].wk >= 0.999) snaps.push(`${fmt(R[k - 1].wk)} -> ${fmt(R[k].wk)} at ${fmt(R[k].tc)}`);
    const wseq = R.slice(1).map((r) => fmt(r.wk, 2)).join(' ');
    if (!(armed > 0.14 - EPS)) verdict(false, 'b2', 'no stop was armed, so there was no way out of one to read');
    else if (!R.slice(1).some((r) => r.wk <= 0.1)) verdict(false, 'b2', `the world never froze (world ${wseq})`);
    else if (!(R[R.length - 1].wk >= 0.999)) verdict(false, 'b2', `the world had not come back to full speed eight frames on (world ${wseq})`);
    else verdict(!snaps.length, 'b2', snaps.length ? `the world snaps out of the stop: ${snaps.join('; ')} (world ${wseq})`
      : `the world eases out of the stop instead of snapping (world ${wseq})`);
  }

  if (want('c')) {
    // ── (c) five calls inside 200 ms of tClock ────────────────────────────
    // a clean window first: a whole second of tClock (20 frames) with no wash,
    // so the governor's rolling second holds only what this part does
    let quiet = 0, last = (await row(p)).fl;
    for (let i = 0; i < 400 && quiet < 20; i++) {
      await step(p);
      const f = (await row(p)).fl;
      if (f === last) quiet++; else { quiet = 0; last = f; }
    }
    if (quiet < 20) verdict(false, 'c', 'the game washed the screen at least once a second for 400 frames — no clean window to test the governor in');
    else {
      const out = await p.evaluate(async () => {
        const j0 = window.__juiceState().flashes, t0 = window.__matchState().tClock;
        const at = [];
        for (let i = 0; i < 5; i++) {
          at.push(window.__matchState().tClock - t0);
          window.__fx.flash('rgba(255,255,255,0.02)', 0.02);
          if (i < 4) await window.__step(1);
        }
        return { washes: window.__juiceState().flashes - j0, at };
      });
      const span = out.at[out.at.length - 1];
      console.log(`  (c) five fx.flash() calls at tClock +${out.at.map((x) => Math.round(x * 1000)).join(', +')} ms: ${out.washes} wash(es) shown`);
      if (span > 0.2 + EPS) verdict(false, 'c', `the five calls spanned ${Math.round(span * 1000)} ms of tClock, not 200 or less — not the test the spec asks for`);
      else verdict(out.washes <= 2, 'c', out.washes <= 2
        ? `the flash governor holds: five calls in ${Math.round(span * 1000)} ms showed ${out.washes} wash(es) (bar 2 — the rest blended into the live one)`
        : `five fx.flash() calls in ${Math.round(span * 1000)} ms showed ${out.washes} washes (bar 2): every call repaints the screen`);
    }

    // ── (c3) the cap: a third wash in a second is not drawn; a warning is ──
    // Each ordinary call is made with NOTHING on screen, so each is a start,
    // not a blend — the path (c) cannot reach. The colour is the probe's own
    // (a pale blue that nothing in the game washes); the warning is the game's,
    // through the real bite handler.
    const OURS = 'rgba(120,200,255,0.3)';
    let nibbleAt = null;
    if (!(await quietSecond(p))) verdict(false, 'c3', 'the game would not go a second without a wash — no clean window to test the cap in');
    else {
      const s0 = await shown(p);
      const seq = [];
      // one call, then what the overlay shows; p.evaluate hands OURS through
      // as the function's argument
      const one = async (label, fn) => { await p.evaluate(fn, OURS); const s = await shown(p); seq.push({ label, ...s, at: s.tc - s0.tc }); return s; };
      await one('A', (c) => window.__fx.flash(c, 0.3));
      const fadedA = await fade(p);
      await one('B', (c) => window.__fx.flash(c, 0.3));
      const fadedB = await fade(p);
      await one('C', (c) => window.__fx.flash(c, 0.3));
      await one('nibble', () => window.__bite(false));
      nibbleAt = seq[3].tc;
      const [a, b1, c, n] = seq;
      console.log(`  (c3) after a clean second: ${seq.map((x) => `${x.label} at +${Math.round(x.at * 1000)} ms -> washes ${x.fl - s0.fl}, `
        + `${x.op > 0 ? `up (${hueTxt(x.bg)}, alpha ${fmt(x.op, 2)})` : 'nothing up'}`).join('; ')}`);
      const bad = [];
      if (!fadedA || !fadedB) bad.push(`inconclusive — ${!fadedA ? 'A' : 'B'} was still up after 12 frames, so the next call could only blend`);
      else if (n.at > 0.9) bad.push(`inconclusive — the four calls spanned ${Math.round(n.at * 1000)} ms of tClock, not inside one rolling second with room to spare`);
      else {
        if (!(a.fl - s0.fl === 1 && a.op > 0) || !(b1.fl - s0.fl === 2 && b1.op > 0)) bad.push(`the first two washes were not both drawn (washes ${a.fl - s0.fl}, ${b1.fl - s0.fl})`);
        if (c.fl !== b1.fl || c.op > 0) bad.push(`a third wash ${Math.round(c.at * 1000)} ms into the second was drawn (bar: two a second)`);
        if (!(n.fl === c.fl + 1 && n.op > 0 && n.bg !== c.bg)) bad.push(`the nibble through the real bite handler was ${n.fl === c.fl ? 'NOT drawn — the cap dropped a warning' : `shown as ${hueTxt(n.bg)} at alpha ${fmt(n.op, 2)}`}`);
      }
      verdict(!bad.length, 'c3', bad.length ? bad.join('; ')
        : `the cap holds and a warning passes it: two washes in ${Math.round(c.at * 1000)} ms, a third not drawn, then the nibble drawn (${hueTxt(n.bg)})`);
    }

    // ── (c2) a danger wash paints over a live one ─────────────────────────
    // The bite handler ignores a bite inside its own mercy (2.5 s of tClock
    // after a nibble), so that goes first, then a clean second.
    if (nibbleAt !== null) while ((await shown(p)).tc < nibbleAt + 2.6) await step(p);
    if (!(await quietSecond(p))) verdict(false, 'c2', 'the game would not go a second without a wash — no clean window to test danger in');
    else {
      const s0 = await shown(p);
      await p.evaluate(() => window.__fx.flash('rgba(255,214,120,0.4)', 0.5));
      await step(p);
      const live = await shown(p);        // the gold, one frame on: still up?
      await p.evaluate(() => window.__bite(true));
      const bit = await shown(p);         // what the form bite left on screen
      await step(p);
      await p.evaluate(() => window.__fx.flash('rgba(126,242,160,0.3)', 0.3));
      const after = await shown(p);       // an ordinary call inside the red
      console.log(`  (c2) gold ${live.op > 0 ? `up (${hueTxt(live.bg)}, alpha ${fmt(live.op, 2)})` : 'already gone'} one frame on; `
        + `the form bite -> ${hueTxt(bit.bg)} at alpha ${fmt(bit.op, 2)} (washes +${bit.fl - live.fl}); `
        + `a green call a frame later -> ${hueTxt(after.bg)} at alpha ${fmt(after.op, 2)}`);
      const bad = [];
      if (!(live.op > 0) || isRedBg(live.bg) || live.fl !== s0.fl + 1) bad.push('inconclusive — the gold wash was not the one up when the bite landed');
      else {
        if (!(isRedBg(bit.bg) && bit.op > 0)) bad.push(`the form bite landed inside a live gold wash and the screen showed ${hueTxt(bit.bg)}, not red — the bite that costs a form was shown in the colour of a reward`);
        else if (!isRedBg(after.bg) || !(after.op > 0)) bad.push(`an ordinary call inside the red repainted it (${hueTxt(after.bg)})`);
      }
      verdict(!bad.length, 'c2', bad.length ? bad.join('; ')
        : `a danger wash outranks the governor: the form bite painted red over a live gold wash, and a green call inside the red left it red`);
    }
  }

  if (want('g')) {
    // ── (g) the switch is off by default ──────────────────────────────────
    // 1.1 s of tClock first, so (c)'s washes have left the governor's rolling
    // second and cannot stand between the kill and its own wash
    await step(p, 22);
    const k = await killOne(p);
    if (k.why) verdict(false, 'g', `inconclusive — ${k.why}`);
    else {
      const after = await rows(p, 14, k.placed.name);
      const all = [k.at, ...after];
      const dying = all.filter((r) => r.face && r.face.dyingT > 0);
      let moves = 0;
      for (let i = 1; i < dying.length; i++) {
        const a = dying[i - 1].face.pupils, c = dying[i].face.pupils;
        if (a.some((q, j) => Math.hypot(q.x - c[j].x, q.y - c[j].y) > 0.005)) moves++;
      }
      const armedStop = k.at.stops > k.before.stops && !(k.at.kick > k.before.kick);
      const slow = all.map((r) => r.slow).filter((s) => s !== null && s < 1 - EPS);
      const kp = (all[all.length - 1].kp ?? 0) - (k.before.kp ?? 0);
      const rayUp = all.some((r) => r.ray && r.ray.shown && r.ray.op > 0);
      const washes = k.at.fl - k.before.fl;
      console.log(`  (g) ${k.placed.name} eaten beside him (r ${fmt(k.placed.r, 2)} on R ${fmt(k.placed.R, 2)}): stop ${fmt(k.at.stop)}, `
        + `slow ${slow.length ? slow[0] : 'never under 1'}, ray pulses ${kp}${rayUp ? ' (shown)' : ''}, pupil moves ${moves} over ${dying.length} gulp frame(s), ${washes} wash(es)`);
      const bad = [];
      if (armedStop) bad.push(`the kill armed a ${fmt(k.at.stop)} s freeze`);
      if (slow.length) bad.push(`slow motion ran at ${slow[0]}`);
      if (kp > 0 || rayUp) bad.push('the ray pulse fired');
      if (moves > 0) bad.push(`her pupils moved ${moves} time(s) through her gulp`);
      if (washes !== 1) bad.push(`the kill showed ${washes} washes, not one`);
      verdict(!bad.length, 'g', bad.length ? `the switch is not off by default: ${bad.join('; ')}`
        : 'with no ?killbeat the kill beat is off: no freeze, no slow motion, no ray pulse, still pupils, one wash');
    }
  }
  await p.close();
}

// ═══ PAGE 2: THE SWITCH ON ══════════════════════════════════════════════════
if (['a', 'e', 'f'].some(want)) {
  console.log(`\n  PAGE 2 — ${WORLD}, ?killbeat=1&g=1`);
  const p = await open('&killbeat=1&g=1', 'on');
  await p.evaluate(() => window.__setVoidR(3));
  await lock(p);
  await step(p, 10);

  /** kill one and read the beat off 16 frames after it */
  const beat = async () => {
    const k = await killOne(p);
    if (k.why) return k;
    const after = await rows(p, 16, k.placed.name);
    return { ...k, after, all: [k.at, ...after] };
  };
  const rayStats = (all) => {
    const up = all.filter((r) => r.ray && r.ray.shown && r.ray.op > 0);
    return { n: up.length, span: up.length ? up[up.length - 1].tc - up[0].tc : 0,
      peak: up.length ? Math.max(...up.map((r) => r.ray.op)) : 0,
      scales: [...new Set(up.map((r) => r.ray.scale))] };
  };

  if (want('a')) {
    const K = await beat();
    if (K.why) verdict(false, 'a', `inconclusive — ${K.why}`);
    else {
      const t150 = K.all.find((r) => r.tc >= K.at.tc + 0.15 - EPS);
      const dying = K.all.filter((r) => r.face && r.face.dyingT > 0);
      let moves = 0;
      for (let i = 1; i < dying.length; i++) {
        const a = dying[i - 1].face.pupils, c = dying[i].face.pupils;
        if (a.some((q, j) => Math.hypot(q.x - c[j].x, q.y - c[j].y) > 0.005)) moves++;
      }
      // the kill's own washes are the ones its frame showed; anything after it
      // in the window is another event's (a form the feast pays for, a near
      // miss) and is printed, not judged
      const washes = K.at.fl - K.before.fl, later = K.all[K.all.length - 1].fl - K.at.fl;
      const pulses = K.at.kp === null ? null : K.all[K.all.length - 1].kp - (K.before.kp ?? 0);
      const ray = rayStats(K.all);
      // the jaw through the kill's own freeze (animGulp opened it on the kill)
      const jaw = [];
      for (let i = 1; i < K.all.length; i++) {
        const A = K.all[i - 1], B = K.all[i];
        if (A.stop > 0 && B.stop > 0 && B.tc > A.tc) jaw.push((A.hold - B.hold) / (B.tc - A.tc));
      }
      console.log(`  (a) ${K.placed.name} eaten beside him (r ${fmt(K.placed.r, 2)} on R ${fmt(K.placed.R, 2)}${K.placed.marquee ? ', the marquee' : ''}):`);
      note(`kill frame: stop ${fmt(K.at.stop)} s, slow ${K.at.slow ?? 'n/a'}, world ${fmt(K.at.wk)}`);
      note(`+150 ms (tClock ${t150 ? fmt(t150.tc) : 'never'}): slow ${t150 ? t150.slow ?? 'n/a' : 'n/a'}, world ${t150 ? fmt(t150.wk) : 'n/a'}`);
      note(`world, frame by frame: ${K.all.map((r) => fmt(r.wk, 2)).join(' ')}`);
      note(`${washes} wash(es) on the kill frame, ${later} after it; ray pulses ${pulses ?? 'n/a'}, shown on ${ray.n} frame(s) over ${fmt(ray.span, 2)} s, peak alpha ${fmt(ray.peak)}`);
      if (K.at.beats) {
        const B0 = K.before.beats, B1 = K.all[K.all.length - 1].beats;
        note(`marquee beats armed over the window: ${Object.keys(B1).filter((k) => B1[k] > B0[k]).map((k) => `${k} +${B1[k] - B0[k]}`).join(', ') || 'none'}`);
      }
      note(`pupils moved on ${moves} of ${Math.max(0, dying.length - 1)} gulp frame pair(s); jaw clock through the freeze: ${jaw.length ? jaw.map((x) => fmt(x, 2)).join(' ') : 'no frozen frame'}`);
      const bad = [];
      if (!(K.at.stop >= 0.14 - EPS && K.at.stop <= 0.16 + EPS)) bad.push(`the kill frame's freeze is ${fmt(K.at.stop)} s (bar 0.14-0.16)`);
      if (!t150 || t150.slow === null || Math.abs(t150.slow - 0.25) > EPS) bad.push(`slow reads ${t150 ? t150.slow ?? 'nothing' : 'no frame'} 150 ms on (bar 0.25)`);
      else if (!(t150.wk <= 0.25 + EPS)) bad.push(`the world runs at ${fmt(t150.wk)} 150 ms on — slow motion that does not slow it (bar 0.25)`);
      if (washes !== 1) bad.push(`the kill frame showed ${washes} washes (bar 1)`);
      if (pulses !== 1 || !ray.n) bad.push(`ray pulses ${pulses ?? 'none counted'}, shown on ${ray.n} frame(s) (bar: one pulse, seen)`);
      else if (ray.peak > 0.35 + EPS) bad.push(`the rays peaked at alpha ${fmt(ray.peak)} (bar 0.35)`);
      if (moves < 3) bad.push(`her pupils moved on ${moves} frame pair(s) of her gulp (bar 3 — dizzy)`);
      verdict(!bad.length, 'a', bad.length ? `the kill beat is not there: ${bad.join('; ')}`
        : `the kill beat lands: a ${fmt(K.at.stop, 2)} s freeze, slow ${t150.slow} at +150 ms, one wash, one ray pulse at alpha ${fmt(ray.peak, 2)}, dizzy pupils`);
    }
  }

  if (want('e')) {
    const flip = await p.evaluate(() => { document.getElementById('pauseMotion')?.click(); return document.body.classList.contains('calm'); });
    if (!flip) verdict(false, 'e', '#pauseMotion did not put the body in calm — the reduce-motion switch could not be thrown');
    else {
      const K = await beat();
      if (K.why) verdict(false, 'e', `inconclusive — ${K.why}`);
      else {
        const ray = rayStats(K.all);
        console.log(`  (e) BIG MOTION off; ${K.placed.name} eaten: stop ${fmt(K.at.stop)} s; rays on ${ray.n} frame(s) over ${fmt(ray.span, 2)} s at scale ${ray.scales.join('/') || 'n/a'}, peak ${fmt(ray.peak)}`);
        const bad = [];
        if (!(K.at.stop >= 0.07 - EPS && K.at.stop <= 0.08 + EPS)) bad.push(`the freeze is ${fmt(K.at.stop)} s (bar 0.07-0.08, half the beat)`);
        if (!ray.n) bad.push('no ray pulse was shown');
        else {
          if (ray.span > 0.25 + 0.05 + EPS) bad.push(`the rays were up for ${fmt(ray.span, 2)} s (bar 0.25 + a frame)`);
          if (ray.scales.length > 1) bad.push(`the rays changed scale (${ray.scales.join(' -> ')}) — motion the child asked to be spared`);
        }
        verdict(!bad.length, 'e', bad.length ? `reduce motion does not halve the beat: ${bad.join('; ')}`
          : `reduce motion halves the beat: a ${fmt(K.at.stop, 3)} s freeze and a ${fmt(ray.span, 2)} s ray pulse that does not grow`);
      }
      await p.evaluate(() => document.getElementById('pauseMotion')?.click());
    }
  }

  if (want('f')) {
    const calm = await p.evaluate(() => document.body.classList.contains('calm'));
    if (calm) verdict(false, 'f', 'BIG MOTION is still off from (e), so the goal-met freeze would read halved — no fair reading');
    else {
      const eat = await p.evaluate(() => window.__levelSpec().eat);
      const g0 = await p.evaluate(() => window.__goalState());
      if (!g0 || g0.n !== 1) verdict(false, 'f', `?g=1 did not make a dot-1 match (goal ${JSON.stringify(g0)})`);
      else {
        // ── a sibling first, then the goal met INSIDE her beat's slow stretch:
        // the freeze over, slow under 1, her rays up, her pupils circling ────
        const K0 = await killOne(p);
        const pre = [];
        let into = null;
        if (!K0.why) {
          pre.push(K0.at);
          for (let i = 0; i < 8 && !into; i++) {
            await step(p);
            const r = await row(p, K0.placed.name);
            pre.push(r);
            if (!(r.stop > 0) && r.slow !== null && r.slow < 1 - EPS) into = r;
          }
        }
        const rayUp = (r) => !!(r.ray && r.ray.shown && r.ray.op > 0);
        let met = null;
        if (into) {
          await p.evaluate((e) => window.__setScore(e), eat);
          let prev = into;
          for (let i = 0; i < 6 && !met; i++) {
            await step(p);
            const r = await row(p, K0.placed.name);
            if (r.met) met = { r, prev }; else prev = r;
          }
        }
        if (K0.why) verdict(false, 'f', `inconclusive — ${K0.why}`);
        else if (!into) verdict(false, 'f', `inconclusive — ${K0.placed.name}'s kill never reached its slow stretch in 8 frames (slow ${pre.map((r) => r.slow).join(' ')}), so there was no stretch to meet the goal inside`);
        else if (!met) verdict(false, 'f', `the score set to the EAT line (${eat}) did not meet the goal in six frames`);
        else {
          const w = met.prev;   // the last frame before the whistle
          const post = await rows(p, 10, K0.placed.name);
          const tail = [met.r, ...post];
          const slowOn = post.filter((r) => r.slow !== null && r.slow < 1 - EPS);
          const raysOn = tail.filter(rayUp);
          // her pupils from the whistle frame on (the move INTO it is the
          // whistle putting them back, and is not counted)
          const dying = tail.filter((r) => r.face && r.face.dyingT > 0);
          let moves = 0;
          for (let i = 1; i < dying.length; i++) {
            const a = dying[i - 1].face.pupils, c = dying[i].face.pupils;
            if (a.some((q, j) => Math.hypot(q.x - c[j].x, q.y - c[j].y) > 0.005)) moves++;
          }
          let wmoves = 0;   // …and before it, to show she WAS dizzy
          const wd = pre.concat([w]).filter((r) => r.face && r.face.dyingT > 0);
          for (let i = 1; i < wd.length; i++) {
            const a = wd[i - 1].face.pupils, c = wd[i].face.pupils;
            if (a.some((q, j) => Math.hypot(q.x - c[j].x, q.y - c[j].y) > 0.005)) wmoves++;
          }
          console.log(`  (f) ${K0.placed.name} eaten; the goal met ${Math.round((met.r.tc - K0.at.tc) * 1000)} ms of tClock later, inside her beat `
            + `(the frame before the whistle: stop ${fmt(w.stop)} s, slow ${w.slow}, rays ${rayUp(w) ? `up at ${fmt(w.ray.op, 2)}` : 'down'}, her pupils moved on ${wmoves} frame pair(s) so far):`);
          note(`goal-met frame: stop ${fmt(met.r.stop)} s; slow on the frames after it: ${post.map((r) => fmt(r.slow, 2)).join(' ')}`);
          note(`rays up on ${raysOn.length} of ${tail.length} frame(s) from the whistle on; her pupils moved on ${moves} of ${Math.max(0, dying.length - 1)} gulp frame pair(s) from the whistle on`);
          const bad = [];
          if (!(met.r.stop >= 0.12 - EPS && met.r.stop <= 0.12 + EPS)) bad.push(`the goal met inside a slow stretch froze ${fmt(met.r.stop)} s (bar 0.12 — the whistle's own freeze)`);
          if (slowOn.length) bad.push(`slow motion ran on under the whistle (${post.map((r) => fmt(r.slow, 2)).join(' ')})`);
          if (raysOn.length) bad.push(`her rays stayed up under the whistle (${raysOn.length} frame(s))`);
          if (moves > 0) bad.push(`her pupils kept circling under the whistle (${moves} move(s))`);
          // …and a sibling eaten inside the outro arms nothing
          const K = await killOne(p);
          if (K.why) bad.push(`the outro kill was inconclusive — ${K.why}`);
          else {
            const after = await rows(p, 10, K.placed.name);
            const all = [K.at, ...after];
            // Judged by what only a beat can do. A raw freeze count is not
            // this bar: the first kill grows him into a big meal (r 2.4), and
            // that meal's own bite hit-stop (0.055 + 0.05 x bite, ~0.092 s —
            // older than G8, and the end beat never blocked it) gulps within a
            // frame of the outro kill. A review run caught it landing ON the
            // kill frame, freezes 4 -> 5 with no beat armed, and failed the
            // right code; two instrumented re-runs showed the same meal
            // gulping one frame early (stop 0.093 / 0.091 s, freezes 3 -> 3).
            // So: no marquee beat may be armed, and no freeze may run longer
            // than the bite's own ladder can make (0.105 s) — a beat's
            // shortest stop that could land here, the rival's, is 0.14 s.
            const B0 = K.before.beats, B1 = all[all.length - 1].beats;
            const armed = B0 && B1 ? Object.keys(B1).filter((k) => B1[k] > (B0[k] || 0)) : null;
            if (armed === null) bad.push('this build keeps no count of its marquee beats (no beats in __juiceState)');
            else if (armed.length) bad.push(`the kill armed a marquee beat inside the outro (${armed.map((k) => `${k} +${B1[k] - (B0[k] || 0)}`).join(', ')})`);
            if (all.some((r) => r.stop > 0.105 + EPS)) bad.push(`a ${fmt(Math.max(...all.map((r) => r.stop)))} s freeze ran inside the outro (over the bite's own 0.105 s)`);
            const slow = all.map((r) => r.slow).filter((x) => x !== null && x < 1 - EPS);
            if (slow.length) bad.push(`slow motion ran at ${slow[0]} after a kill inside the outro`);
            const kp = (all[all.length - 1].kp ?? 0) - (K.before.kp ?? 0);
            if (kp > 0 || all.some(rayUp)) bad.push('the ray pulse fired inside the outro');
            note(`then ${K.placed.name} eaten in the outro: stop ${fmt(K.at.stop)} s (was ${fmt(K.before.stop)}), freezes ${K.before.stops} -> ${K.at.stops}, ray pulses +${kp}`);
          }
          verdict(!bad.length, 'f', bad.length ? bad.join('; ')
            : 'the whistle owns the end: met inside a kill\'s slow stretch, the goal-met frame freezes 0.12 s and the stretch, the rays and the dizzy end with it; a sibling eaten in the outro arms nothing');
        }
      }
    }
  }
  const err = await p.evaluate(() => window.__lock.err);
  if (err) console.log(`  note: a frame callback threw on this page: ${err}`);
  await p.close();
}

// ═══ PAGE 3: A WHOLE MATCH ══════════════════════════════════════════════════
if (want('d')) {
  console.log(`\n  PAGE 3 — ${WORLD}, ?killbeat=1&len=180, a whole match with a child driver, drawing off`);
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  p.on('pageerror', (e) => console.log('PAGEERR full ' + String(e).slice(0, 160)));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript((u) => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidFirstNom', '1'); localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidMotion', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', u);
  } catch { /* private mode */ } }, UNLOCK_ALL);
  // ?len=180 is the shipped length, and it is also what makes this a match
  // with no level on it: a dot's goal would end the match the moment it was
  // met, and the bar is about a WHOLE match
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&killbeat=1&len=180`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => { }; });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 900000, polling: 500 });
  const len = await p.evaluate(() => window.__matchState().clock + window.__matchState().t);
  const s0 = await p.evaluate(() => ({ ...window.__juiceState(), ev: window.__matchState().ev.eaten, cer: window.__stages().ceremonies }));
  // qa/_kickrate.mjs's child driver: toward nearby food, wobbly aim, a third
  // of the time stalled, a third of the time distracted
  await p.evaluate(() => {
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    let heldT = -1, held = null, stall = 0;
    const tick = () => {
      const ms = window.__matchState?.();
      if (ms) {
        const vs = window.__voidState();
        if (ms.t - heldT > 2.4) {
          heldT = ms.t;
          const cand = [];
          let best = null, bd = 1e9;
          for (const e of window.__edibles) {
            if (e.eaten || !e.mesh?.visible) continue;
            const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
            const d = dx * dx + dz * dz;
            if (e.radius <= vs.r * 0.92) { if (d < bd) { bd = d; best = { dx, dz }; } }
            if (d < 90000) cand.push({ dx, dz });
          }
          held = best;
          stall = Math.random() < 0.34 ? 1 : 0;
          if (cand.length && Math.random() < 0.30) held = cand[(Math.random() * cand.length) | 0];
        }
        if (held && !stall) {
          const a = Math.atan2(held.dz, held.dx) + (Math.random() - 0.5) * 2.1;
          dispatchEvent(new PointerEvent('pointermove', {
            pointerId: 1, clientX: cx + Math.cos(a) * 110, clientY: cy + Math.sin(a) * 110, bubbles: true }));
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await p.waitForFunction(() => window.__matchState().clock <= 0, null, { timeout: 5400000, polling: 2000 });
  {
    const t = await p.evaluate(() => window.__matchState().tClock);
    await p.waitForFunction((x) => window.__matchState().tClock > x + 2.5, t, { timeout: 600000, polling: 1000 });
  }
  const s1 = await p.evaluate(() => ({ ...window.__juiceState(), ev: window.__matchState().ev.eaten, cer: window.__stages().ceremonies,
    marquee: window.__matchState().ev.marquee }));
  await p.close();
  const long = s1.longStops - s0.longStops, all = s1.stops - s0.stops;
  const beatLong = typeof s1.longBeats === 'number' ? s1.longBeats - (s0.longBeats ?? 0) : null;
  console.log(`  (d) a ${Math.round(len)} s match: ${all} freeze(s), ${long} over 100 ms`
    + `${beatLong === null ? '' : ` (${beatLong} armed or pushed over by a marquee beat, ${long - beatLong} by the bite hit-stop alone)`}; `
    + `${s1.ev - s0.ev} sibling(s) eaten (${s1.marquee} marquee), ${s1.cer - s0.cer} evolution ceremonies`);
  if (s1.beats) {
    note(`marquee beats armed: ${Object.keys(s1.beats).map((k) => `${k} ${s1.beats[k] - ((s0.beats || {})[k] || 0)}`).join(', ')}`);
  }
  // (d) THE LEAD'S BAR, every freeze over 100 ms, whoever took it; (d2) every
  // beat armed, the ones (d) cannot see included
  const beatsAll = s1.beats ? Object.keys(s1.beats).reduce((n, k) => n + s1.beats[k] - ((s0.beats || {})[k] || 0), 0) : null;
  if (Math.abs(len - 180) > 1) {
    verdict(false, 'd', `the match was ${Math.round(len)} s, not the 180 s the bar is about`);
    verdict(false, 'd2', `the match was ${Math.round(len)} s, not the 180 s the bar is about`);
  } else {
    const who = beatLong === null ? 'none of them can be told apart from the bite hit-stop\'s own on this build'
      : `${beatLong} armed or pushed over by a marquee beat, ${long - beatLong} by the bite hit-stop alone`;
    verdict(long <= 8, 'd', long <= 8
      ? `the ceiling holds: ${long} freeze(s) longer than 100 ms in a whole ${WORLD} match (bar 8; ${who}), of ${all} in all`
      : `${long} freezes longer than 100 ms in one ${WORLD} match (bar 8; ${who}), of ${all} in all — more than the lead's ceiling`);
    if (beatsAll === null) verdict(false, 'd2', 'this build keeps no count of its marquee beats (no beats in __juiceState)');
    else verdict(beatsAll <= 20, 'd2', beatsAll <= 20
      ? `the beats stay rare: ${beatsAll} marquee beat(s) armed in a whole ${WORLD} match (bar 20)`
      : `${beatsAll} marquee beats armed in one ${WORLD} match (bar 20) — the beat is becoming the stutter the owner ruled out`);
  }
}

await b.close();
finish();

function finish() {
  console.log('');
  for (const v of verdicts) console.log(`  ${v.line}`);
  if (!verdicts.length) { console.log('  FAIL — timebeat measured nothing (check --only)'); process.exit(1); }
  console.log('');
  process.exit(verdicts.every((v) => v.ok) ? 0 : 1);
}
