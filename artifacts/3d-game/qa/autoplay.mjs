// DOES THE MUSIC ACTUALLY START, ON A BROWSER THAT ENFORCES THE AUTOPLAY POLICY?
//
//   node qa/autoplay.mjs [world] [port]
//
// THIS IS THE PROBE qa/music.mjs COULD NEVER BE. That one launches Chromium with
//
//     --autoplay-policy=no-user-gesture-required
//
// which hands the page a RUNNING AudioContext from the first frame — so it can
// tell you a track fetched, decoded and scheduled, and it is structurally
// incapable of noticing that on a real phone none of it made a sound. Every
// green run it has ever produced was compatible with total silence on a device.
//
// ── THE POLICY IS SIMULATED, NOT BORROWED, AND THAT IS DELIBERATE ──────────
// The obvious move is to drop the flag, or to name the strict policy instead.
// Both were tried and BOTH REPORTED A RUNNING CONTEXT ON AN UNTOUCHED PAGE:
//
//     (no flag)                                          -> running
//     --autoplay-policy=document-user-activation-required -> running
//     --autoplay-policy=user-gesture-required             -> running
//     --headless=new + strict policy                      -> running
//
// Headless Chromium does not gate audio here at any setting, which is the exact
// reason a bug the owner hits on the first tap of every session has survived
// four rounds of green probes. So the rule is enforced in the PAGE: the context
// is really suspended at construction, resume() is really refused until a
// trusted gesture has been seen, and `state` reports 'suspended' until then.
// The clock genuinely does not advance, so anything scheduled early is
// genuinely silent — which is the property under test, not an approximation of
// it. What is simulated is only WHEN the platform relents.
//
// It measures both failure modes, by patching start() to record the CLOCK STATE
// AT SCHEDULE TIME — the one observation that distinguishes a healthy loop from
// a cold one — and by timing the gap between wanting music and hearing it.
import { chromium } from 'playwright';

const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4177';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  // THE POLICY IS OPT-IN HERE, NOT OPT-OUT. Simply omitting the flag is not
  // enough and the first run of this probe proved it: headless Chromium's
  // DEFAULT is no-user-gesture-required, so an unflagged run reported
  // "ctx=running" on an untouched splash and passed everything. Naming the
  // policy explicitly is what makes this browser behave like the phone.
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
    '--autoplay-policy=document-user-activation-required'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });

const net = [];
p.on('response', (r) => {
  if (!/\/assets\/music\/.+\.(mp3|ogg|wav)$/.test(r.url())) return;
  net.push({ name: r.url().split('/').pop(), at: Date.now(), status: r.status() });
});
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));

// Record every scheduled source WITH THE CLOCK STATE AT THAT MOMENT, before any
// of the game's own code runs. A `start()` issued while the context is
// suspended is the failure, stated exactly.
await p.addInitScript(() => {
  try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '0');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern');
  } catch { /* private mode */ }

  // ── THE AUTOPLAY POLICY, ENFORCED HERE ───────────────────────────────────
  const RealAC = window.AudioContext || window.webkitAudioContext;
  const baseProto = Object.getPrototypeOf(RealAC.prototype);           // BaseAudioContext
  const realState = Object.getOwnPropertyDescriptor(baseProto, 'state');
  let gestured = false;
  const mark = () => { gestured = true; };
  for (const ev of ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'click']) {
    addEventListener(ev, mark, { capture: true, passive: true });
  }
  class Policed extends RealAC {
    constructor(...a) {
      super(...a);
      // really suspended: the clock must actually stop, or a cold schedule
      // would still be audible and the probe would prove nothing
      if (!gestured) { try { super.suspend(); } catch { /* already */ } }
    }
    resume() {
      // a phone refuses this outside a gesture, and it refuses it QUIETLY —
      // the promise resolves, nothing throws, and the caller carries on
      if (!gestured) return Promise.resolve();
      return super.resume();
    }
  }
  // suspend() resolves asynchronously, so for a beat the real getter still says
  // 'running'. Report the policy's answer instead, or the game reads the one
  // stale value that would let it think it may schedule.
  Object.defineProperty(Policed.prototype, 'state', {
    configurable: true,
    get() { return gestured ? realState.get.call(this) : 'suspended'; },
  });
  window.AudioContext = Policed;
  window.webkitAudioContext = Policed;

  // Record every scheduled source WITH THE CLOCK STATE AT THAT MOMENT. A
  // start() issued while the context is suspended is the failure, stated
  // exactly: nothing throws, srcs.length is correct, and it is silent.
  const log = [];
  Object.defineProperty(window, '__startLog', { get: () => log });
  const S = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    let st = '?', len = 0;
    try { st = this.context.state; len = this.buffer ? this.buffer.duration : 0; } catch { /* detached */ }
    // a music loop is seconds long; one-shots are a fraction of one. Only the
    // long buffers are the score, and only they matter to this question.
    if (len > 5) log.push({ t: Date.now(), state: st, dur: Math.round(len) });
    return S.apply(this, a);
  };
});

const T0 = Date.now();
const ms = () => `${((Date.now() - T0) / 1000).toFixed(1)}s`;
const state = () => p.evaluate(() => {
  const m = window.__music ? window.__music() : null;
  return { ctx: m?.ctx ?? null, theme: m?.theme ?? null, menu: m?.menu ?? null,
    starts: window.__startLog.map((s) => ({ ...s })) };
});

await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));

console.log(`\n  AUTOPLAY — ${WORLD} @ :${PORT}   gesture-gated audio, as on a phone   \n`);

// ── 1. THE SPLASH, BEFORE ANY TOUCH ──────────────────────────────────────────
// Correct behaviour here is SILENCE. No browser will sound before a gesture and
// asking for it is asking for something the platform does not sell. What this
// checks is that the game has not already burned its one chance by scheduling
// the menu theme against the frozen clock — because anything scheduled now is
// still silent after the gesture arrives.
await p.waitForTimeout(3000);
let s = await state();
const dump = (c) => `wanted=${c?.wanted} srcs=${c?.srcs} cold=${c?.cold} bad=${c?.bad} loading=${c?.loading} buf=${c?.dur ? 'yes' : 'no'}`;
console.log(`  ${ms().padStart(6)} splash, untouched      ctx=${s.ctx}  scheduled=${s.starts.length}`);
console.log(`         menu   ${dump(s.menu)}`);
console.log(`         theme  ${dump(s.theme)}`);
const preTouch = s.starts.length;

// ── 2. THE FIRST TOUCH ───────────────────────────────────────────────────────
// PLAY is the first thing a child taps. From this instant, music is owed.
const tPlay = Date.now();
await p.click('#btnPlay');
let menuHeard = null;
for (let i = 0; i < 60; i++) {
  await p.waitForTimeout(250);
  s = await state();
  if (s.ctx === 'running' && s.menu?.srcs > 0 && !s.menu?.cold) { menuHeard = Date.now() - tPlay; break; }
}
console.log(`  ${ms().padStart(6)} after first tap        ctx=${s.ctx}`
  + `  → ${menuHeard === null ? 'NEVER BECAME AUDIBLE' : `audible ${(menuHeard / 1000).toFixed(1)}s after the tap`}`);
console.log(`         menu   ${dump(s.menu)}`);
console.log(`         theme  ${dump(s.theme)}`);

// ── 3. JOINING A MATCH ───────────────────────────────────────────────────────
const tCard = Date.now();
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 600000 });
const tMatch = Date.now();
let themeHeard = null;
for (let i = 0; i < 120; i++) {
  await p.waitForTimeout(250);
  s = await state();
  if (s.ctx === 'running' && s.theme?.srcs > 0 && !s.theme?.cold) { themeHeard = Date.now() - tMatch; break; }
}
console.log(`  ${ms().padStart(6)} match started          ctx=${s.ctx}  theme srcs=${s.theme?.srcs} `
  + `cold=${s.theme?.cold} bad=${s.theme?.bad} loading=${s.theme?.loading}`);
console.log(`         card tap → match start : ${((tMatch - tCard) / 1000).toFixed(1)}s`);
console.log(`         match start → music    : `
  + (themeHeard === null ? 'NEVER BECAME AUDIBLE' : `${(themeHeard / 1000).toFixed(1)}s`));

// ── 4. WHAT WAS SCHEDULED AGAINST A DEAD CLOCK ───────────────────────────────
const cold = s.starts.filter((x) => x.state !== 'running');
console.log(`\n  music sources scheduled       : ${s.starts.length}  (${preTouch} of them before any touch)`);
console.log(`  …of those, against a SUSPENDED clock: ${cold.length}`
  + (cold.length ? '   ← every one of these is silent' : ''));
for (const n of net) console.log(`  network  ${n.name.padEnd(14)} ${n.status}  at ${((n.at - T0) / 1000).toFixed(1)}s`);

await b.close();

const fails = [];
if (menuHeard === null) fails.push('the menu theme never became audible after the first tap');
else if (menuHeard > 2500) fails.push(`menu theme took ${(menuHeard / 1000).toFixed(1)}s after the first tap`);
if (themeHeard === null) fails.push('the match theme never became audible');
else if (themeHeard > 2500) fails.push(`match theme took ${(themeHeard / 1000).toFixed(1)}s after the match started`);
if (cold.length) fails.push(`${cold.length} music source(s) scheduled against a suspended clock`);
console.log('\n  ' + (fails.length ? 'FAIL — ' + fails.join('; ') : 'PASS — music starts on the first gesture and at match start') + '\n');
process.exit(fails.length ? 1 : 0);
