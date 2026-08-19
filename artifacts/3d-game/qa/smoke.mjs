// SMOKE — does a build actually boot, load its assets, and play?
//
// Written for the asset-payload change, where the risk is precise and nasty:
// something got moved out of public/ that the game really did need, and the
// only symptom is a silent 404 that degrades a texture or kills a sound. A
// build that compiles proves nothing about that; only a request log does.
//
//   node qa/smoke.mjs [world] [port]
//
// THE CENTRAL DISTINCTION: /assets/hf/ and /assets/hf3d/ are rewritten to two
// CloudFront distributions by vercel.json and are BLOCKED in this sandbox.
// Those failures are expected and correct, and a probe that counts them as
// errors would cry wolf on every run. Everything else same-origin is a real
// regression. They are reported separately and only the second kind fails.
//
// THE SECOND EXEMPTION, and it is the same shape: /assets/music/<world>.mp3 is
// a DROP-IN SLOT, not a shipped asset. audio3d.ts documents the contract — "the
// presence of the file is the switch: drop /assets/music/<world>.mp3 into
// public/ and that world plays it; leave it out and the world keeps its synth
// score" — so on a build with no licensed track the 404 IS the mechanism
// working, and the fallback it triggers is the shipping behaviour.
//
// This was found by smoking the last pushed commit to check whether a newsroom
// change had broken something: baseline and candidate failed identically, one
// 404 each, on `maple.mp3`. So the gate had been red for every build regardless
// of content, which is the state in which a smoke gate stops meaning anything.
// Exempted rather than silenced: a 404 on a music slot is listed, and a 404 on
// anything else under /assets/ still fails the run.
import { chromium } from 'playwright';

const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4177';
const CDN = /\/assets\/(hf|hf3d)\//;
// `menu` joins the four worlds here: it is the splash/picker theme and it is
// the same optional drop-in contract — absent means quiet, exactly as the menu
// has always been, not broken. Leaving it out of this list is what turned a
// by-design 404 into a red smoke run the moment the slot was wired.
const MUSIC_SLOT = /\/assets\/music\/(maple|pirate|gameday|lantern|theme|menu)\.mp3$/;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });

const cdnFail = [], realFail = [], slotMiss = [], ok = [], consoleErr = [];
const bucket = (u) => (CDN.test(u) ? cdnFail : MUSIC_SLOT.test(u) ? slotMiss : realFail);
p.on('requestfailed', r => bucket(r.url()).push(r.url()));
p.on('response', r => {
  const u = r.url();
  if (r.status() >= 400) { bucket(u).push(`${r.status()} ${u}`); }
  else if (/\/assets\//.test(u) && !CDN.test(u)) ok.push(u);
});
// A blocked CDN asset ALSO surfaces as a console error, so the same exemption
// has to apply here or the probe reports 41 failures on a perfectly good build
// — which is exactly what it did the first time it ran.
// …and a missing music slot surfaces the same way. Chromium reports it as a
// bare "Failed to load resource: 404" with no URL in the message text, so it
// cannot be matched on the path — it is recognised by there being a music-slot
// 404 in the request log and exactly that many unattributable 404 console
// lines. Narrow on purpose: any other 404 still lands in consoleErr.
p.on('console', m => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/403|Forbidden|ERR_(FAILED|BLOCKED)/.test(t) && !/\/assets\/(?!hf)/.test(t)) return;
  consoleErr.push(t.slice(0, 160));
});
p.on('pageerror', e => consoleErr.push('PAGEERROR ' + String(e).slice(0, 160)));

await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });

await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
// the tap gate is the first thing a human touches now — the probe is a human
const gate = await p.$('#tapGate.show');
if (gate) { await p.click('#tapGate'); await p.waitForTimeout(350); }
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

const r0 = await p.evaluate(() => window.__voidState().r);
const alive0 = await p.evaluate(() =>
  window.__edibles.filter(e => !e.eaten && e.mesh?.visible).length);
// Drive at the nearest edible, in MATCH time — the software renderer is a
// fraction of real time and a wall-clock wait proves nothing. This is pace.mjs's
// input path verbatim: a real pointerdown on the canvas followed by pointermove
// on window. The first version of this dispatched a CustomEvent nothing listens
// for, so the void never moved and the probe blamed the build for eating zero.
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const tick = () => {
    const vs = window.__voidState(); let best = null, bd = 1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
    }
    if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 25, null, { timeout: 600000 });
// COUNT CONSUMPTION THE WAY pace.mjs DOES — as the drop in the live edible
// count. Two other readings of this were wrong first: filtering __edibles on
// `eaten` gave 3, and __matchState().ate.you gave 1, both while the radius had
// doubled and the score read >2,000. `ate` is the devoured PERCENTAGE, not a
// tally, and eaten props do not linger in the array wearing a flag. This number
// includes anything the rivals ate too, which is fine — the question here is
// whether the world is being consumed at all, not by whom.
const st = await p.evaluate(() => ({ ...window.__matchState(), r: window.__voidState().r,
  devouredPct: window.__matchState().ate?.you ?? 0,
  alive: window.__edibles.filter(e => !e.eaten && e.mesh?.visible).length }));
st.eaten = alive0 - st.alive;
// the audio graph is the thing most likely to have lost a file silently
const audio = await p.evaluate(() => {
  const a = window.__audio; return { present: !!a, ctx: a?.ctx?.state ?? null };
});
await b.close();

const uniq = a => [...new Set(a)];
console.log(`\n  SMOKE — ${WORLD} @ :${PORT}`);
console.log(`   match t=${st.t.toFixed(1)}s  radius ${r0.toFixed(2)} -> ${st.r.toFixed(2)}  consumed ${st.eaten} props  devoured ${st.devouredPct}%  score ${Math.round(st.score)}`);
console.log(`   same-origin /assets/ served OK : ${uniq(ok).length}`);
console.log(`   CDN-blocked (EXPECTED here)    : ${uniq(cdnFail).length}`);
console.log(`   music slot empty (EXPECTED)    : ${uniq(slotMiss).length}`);
for (const f of uniq(slotMiss)) console.log('      ' + f + '  → synth score, by design');
console.log(`   real failures                  : ${uniq(realFail).length}`);
for (const f of uniq(realFail).slice(0, 20)) console.log('      ' + f);
// Drop exactly as many unattributable 404 console lines as there are 404s
// already accounted for in the two EXPECTED buckets, and no more. Both buckets
// echo into the console as a bare "Failed to load resource: 404" with no URL in
// the text, so they cannot be matched by path — only counted. The existing
// console exemption above covers 403/Forbidden/ERR_BLOCKED, which is what a
// real CDN block looks like; served from a plain static server the same asset
// is simply absent and arrives as a 404 instead, which is why this second pass
// exists. If a REAL asset 404s, `realFail` is non-empty and fails the run on
// its own, and its console line survives here to be printed.
let echo = uniq([...cdnFail, ...slotMiss]).filter((u) => /^404 /.test(u)).length;
const shownErr = consoleErr.filter((t) => {
  if (echo > 0 && /Failed to load resource.*\b404\b/.test(t)) { echo--; return false; }
  return true;
});
if (shownErr.length) {
  console.log(`   console errors: ${shownErr.length}`);
  for (const e of uniq(shownErr).slice(0, 10)) console.log('      ' + e);
}
console.log(`   audio graph: ${audio.present ? 'present, ctx=' + audio.ctx : 'MISSING'}`);

const fails = [];
if (uniq(realFail).length) fails.push(`${uniq(realFail).length} same-origin asset failures`);
if (st.r <= r0) fails.push('the void did not grow');
if (st.eaten < 20) fails.push(`only ${st.eaten} eaten in 25 match-seconds`);
if (!audio.present) fails.push('audio graph missing');
if (shownErr.length) fails.push(`${shownErr.length} console errors`);
console.log('\n  ' + (fails.length ? 'FAIL — ' + fails.join('; ') : 'PASS — boots, loads, grows, eats, and makes sound') + '\n');
process.exit(fails.length ? 1 : 0);
