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
// ── --slow: HOLD THE MUSIC BACK AND SEE WHAT THE CHILD HEARS MEANWHILE ─────
// Everything above measures whether music EVENTUALLY starts. This measures the
// gap, which is the other half of the owner's report — "there's a massive
// delay". On a warm preview server the tracks land in milliseconds and the gap
// cannot be observed at all; on a phone on cellular it is seconds, and what
// fills those seconds is the whole question. Each world ships a hand-written
// synth bed for exactly this, so the test is: with the download stalled, is
// the match making sound?
const SLOW = process.argv.includes('--slow');
// ── --interrupt: THE STATE THE SPEC DOES NOT HAVE ──────────────────────────
// iOS Safari parks an AudioContext in 'interrupted' on an incoming call, on
// Siri, on another app taking the audio session, and on the phone locking.
// It is not in the WebAudio spec and it is not in the TypeScript union, so it
// is very easy to write `state === 'suspended'` and never think about it —
// which is exactly what the engine did, in the only resume() call in the whole
// source tree. From 'interrupted' nothing ever asked to resume again and the
// context stayed wedged for the rest of the session: a child who takes a call
// mid-match gets a silent game until they force-quit.
const INTERRUPT = process.argv.includes('--interrupt');
// Longer than a whole cold boot, deliberately: under swiftshader the island
// takes ~20s to raise, so a 9s stall had already expired by the time the match
// started and the probe measured a HEALTHY recording as "0 voices/s, silent".
// The stall has to still be in force at the whistle or there is no gap to test.
const SLOW_MS = 40000;   // long enough to outlast a cold boot, short enough that the
                         // recording still lands mid-run so the HANDOVER is tested too

const fails0 = [];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  // THE POLICY IS OPT-IN HERE, NOT OPT-OUT. Simply omitting the flag is not
  // enough and the first run of this probe proved it: headless Chromium's
  // DEFAULT is no-user-gesture-required, so an unflagged run reported
  // "ctx=running" on an untouched splash and passed everything. Naming the
  // policy explicitly is what makes this browser behave like the phone.
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
    '--autoplay-policy=document-user-activation-required'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
// an exception inside a gesture handler dies silently otherwise — and a dead
// tap handler looks exactly like a music bug
p.on('pageerror', (e) => { console.log('  PAGEERROR ' + String(e).slice(0, 160)); fails0.push('page error: ' + String(e).slice(0, 80)); });

const net = [];
p.on('response', (r) => {
  if (!/\/assets\/music\/.+\.(mp3|ogg|wav)$/.test(r.url())) return;
  net.push({ name: r.url().split('/').pop(), at: Date.now(), status: r.status() });
});
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
if (SLOW) {
  await p.route('**/assets/music/*.mp3', async (r) => {
    await new Promise((z) => setTimeout(z, SLOW_MS));
    await r.continue();
  });
}

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
  let interrupted = false;
  const live = [];
  // fired from the test: really suspend, and report the iOS state string
  Object.defineProperty(window, '__interrupt', { get: () => async () => {
    interrupted = true;
    for (const c of live) { try { await c.suspend(); } catch { /* already */ } }
  } });
  class Policed extends RealAC {
    constructor(...a) {
      super(...a);
      live.push(this);
      // really suspended: the clock must actually stop, or a cold schedule
      // would still be audible and the probe would prove nothing
      if (!gestured) { try { super.suspend(); } catch { /* already */ } }
    }
    resume() {
      // a phone refuses this outside a gesture, and it refuses it QUIETLY —
      // the promise resolves, nothing throws, and the caller carries on
      if (!gestured) return Promise.resolve();
      interrupted = false;   // resuming IS the exit from 'interrupted' on iOS
      return super.resume();
    }
  }
  // suspend() resolves asynchronously, so for a beat the real getter still says
  // 'running'. Report the policy's answer instead, or the game reads the one
  // stale value that would let it think it may schedule.
  Object.defineProperty(Policed.prototype, 'state', {
    configurable: true,
    get() {
      if (interrupted) return 'interrupted';
      return gestured ? realState.get.call(this) : 'suspended';
    },
  });
  window.AudioContext = Policed;
  window.webkitAudioContext = Policed;

  // Record every scheduled source WITH THE CLOCK STATE AT THAT MOMENT. A
  // start() issued while the context is suspended is the failure, stated
  // exactly: nothing throws, srcs.length is correct, and it is silent.
  const log = [];
  Object.defineProperty(window, '__startLog', { get: () => log });
  // The synth beds build their voices a few dozen a second, so an oscillator
  // rate is a direct read on "is the bed playing" — and unlike a gain value it
  // cannot be faked by a node that is connected but silent.
  let osc = 0;
  Object.defineProperty(window, '__oscCount', { get: () => osc });
  const O = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function (...a) { osc++; return O.apply(this, a); };
  const S = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    let st = '?', len = 0;
    try { st = this.context.state; len = this.buffer ? this.buffer.duration : 0; } catch { /* detached */ }
    // a music loop is seconds long; one-shots are a fraction of one. Only the
    // long buffers are the score, and only they matter to this question.
    // `gestured` distinguishes the poison case (scheduled on a clock nothing
    // is about to start) from the sanctioned one (scheduled inside a gesture
    // whose resume is already in flight — the engine does this on purpose so
    // the tap and the first note share a frame).
    if (len > 5) log.push({ t: Date.now(), state: st, gestured, dur: Math.round(len) });
    return S.apply(this, a);
  };
});

const T0 = Date.now();
const ms = () => `${((Date.now() - T0) / 1000).toFixed(1)}s`;
const state = () => p.evaluate(() => {
  const m = window.__music ? window.__music() : null;
  return { ctx: m?.ctx ?? null, synth: m?.synth ?? null, media: m?.media ?? null, theme: m?.theme ?? null, menu: m?.menu ?? null,
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

// ── 2. THE FIRST TOUCH IS PLAY, AND IT IS STILL THE CONTRACT ─────────────────
// The TAP TO BEGIN overlay was tried here and RETIRED from this path — the
// owner caught it the day it shipped ("two to begin then you have a begin
// right after"). The audio contract survives it: the unlock listeners are
// capture-phase on window, and unlock() runs repairMusic() synchronously
// inside the gesture, so the tap on PLAY — the tap a child makes anyway — is
// the moment the score starts. A gate REAPPEARING on this path is the two-tap
// regression coming back, and this probe fails on it.
if (await p.$('#tapGate.show')) {
  console.log('  A GATE IS UP ON THE FRESH-LOAD PATH — the two-tap regression is back');
  fails0.push('tap gate present on the fresh-load path');
}
const tPlay = Date.now();
await p.click('#btnPlay');
// TWO CLOCKS, MEASURED APART. `menuSched` is the APP's obligation — the tap
// must schedule the score inside the gesture, and that is what the 150ms spec
// governs. `menuHeard` adds the platform's resume round-trip on top; on a
// device that is tens of milliseconds, but on swiftshader the promise queues
// behind one-second frames, so gating on it here would fail builds for the
// harness's slowness — the exact mistake retraction #1 documents.
let menuSched = null, menuHeard = null;
for (let i = 0; i < 80; i++) {
  await p.waitForTimeout(i < 12 ? 50 : 250);
  s = await state();
  if (menuSched === null && s.menu?.srcs > 0 && !s.menu?.cold) menuSched = Date.now() - tPlay;
  if (s.ctx === 'running' && s.menu?.srcs > 0 && !s.menu?.cold) { menuHeard = Date.now() - tPlay; break; }
}
// The REAL tap→schedule latency, from the engine's own event log — in-page
// timestamps, immune to this probe's evaluate() round-trips, which queue
// behind whole frames when the machine is loaded and were being reported as
// if they were the app's latency. (This probe already made that class of
// mistake once today; the log is the ruler now.)
{
  const lg = await p.evaluate(() => window.__audio.musicLog());
  const ts = (line) => parseFloat(lg.find((l) => l.includes(line))?.match(/^([\d.]+)s/)?.[1] ?? 'NaN');
  const g = ts('gesture, ctx='), st = ts('startLoop menu');
  if (!Number.isNaN(g) && !Number.isNaN(st)) menuSched = Math.max(0, Math.round((st - g) * 1000));
}
console.log(`  ${ms().padStart(6)} after first tap        ctx=${s.ctx}`
  + `  → ${menuHeard === null ? 'NEVER BECAME AUDIBLE' : `scheduled ${menuSched}ms, audible ${(menuHeard / 1000).toFixed(1)}s after the tap`}`);
console.log(`         media session: ${s.media ? 'promoted (mute switch defeated)' : 'NOT promoted'}`);
if (!s.media && !SLOW) fails0.push('the silent media element is not playing after the gesture — the iPhone mute switch will silence the game');
console.log(`         menu   ${dump(s.menu)}`);
console.log(`         theme  ${dump(s.theme)}`);

// ── 2b. AND WHAT FILLS THE SPLASH WHILE ITS TRACK IS STILL COMING ──────────
let splashBed = null;
if (SLOW) {
  const a = await p.evaluate(() => window.__oscCount);
  await p.waitForTimeout(3000);
  const b = await p.evaluate(() => window.__oscCount);
  splashBed = Math.round((b - a) / 3);
  if ((await state()).menu?.srcs) splashBed = null;   // see above: no gap, no cover
  console.log(`  ${ms().padStart(6)} menu track downloading   bed ${splashBed === null ? '-' : splashBed} voices/s`
    + (splashBed === null ? '   (recording already up — no gap to cover)'
      : splashBed < 6 ? '   ← THE SPLASH IS SILENT' : '   ← covered'));
}

// ── 3. JOINING A MATCH ───────────────────────────────────────────────────────
// (the first tap already opened the picker — one tap, one thing)
const tCard = Date.now();
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 600000 });
const tMatch = Date.now();
// ── WHAT IS AUDIBLE WHILE THE TRACK IS STILL COMING ──────────────────────
// Measured FIRST, before waiting for the recording — the question is what
// fills the gap, so it has to be asked while the gap is open.
let bedRate = null;
if (SLOW) {
  const a = await p.evaluate(() => window.__oscCount);
  await p.waitForTimeout(3000);
  const b = await p.evaluate(() => window.__oscCount);
  bedRate = Math.round((b - a) / 3);
  // ONLY A GAP CAN BE COVERED. If the recording is already playing there is
  // nothing for the bed to do and a rate of zero is correct — asserting on it
  // regardless failed a perfectly healthy run, which is the probe telling a
  // lie about the game rather than the other way round.
  const st = await state();
  if (st.theme?.srcs) bedRate = null;
  console.log(`  ${ms().padStart(6)} track still downloading  bed ${bedRate === null ? '-' : bedRate} voices/s`
    + (bedRate === null ? '   (recording already up — no gap to cover)'
      : bedRate < 6 ? '   ← THE MATCH IS SILENT' : '   ← covered'));
}
let themeHeard = null;
for (let i = 0; i < 120; i++) {
  await p.waitForTimeout(250);
  s = await state();
  if (s.ctx === 'running' && s.theme?.srcs > 0 && !s.theme?.cold) { themeHeard = Date.now() - tMatch; break; }
}
console.log(`  ${ms().padStart(6)} match started          ctx=${s.ctx}  theme srcs=${s.theme?.srcs} `
  + `cold=${s.theme?.cold} bad=${s.theme?.bad} loading=${s.theme?.loading}`);
console.log(`         card tap → match start : ${((tMatch - tCard) / 1000).toFixed(1)}s`);
// THE HANDOVER, WHICH IS THE OTHER HALF OF THE COVER. A bed that does not stop
// when the recording arrives is two scores at once — the exact failure the old
// "do NOT also start the synth as a stopgap" note was written to prevent.
if (themeHeard !== null) {
  await p.waitForTimeout(1800);   // longer than the 1.2s handover ramp
  const h = await state();
  console.log(`         recording up, bed ${h.synth ? 'STILL RUNNING — two scores at once' : 'handed over'}`);
  if (h.synth) fails0.push('the synth bed kept playing under the recording');
}
console.log(`         match start → music    : `
  + (themeHeard === null ? 'NEVER BECAME AUDIBLE' : `${(themeHeard / 1000).toFixed(1)}s`));

// ── 3b. A PHONE CALL, MID-MATCH ──────────────────────────────────────────────
if (INTERRUPT && themeHeard !== null) {
  await p.evaluate(async () => { await window.__interrupt(); });
  await p.waitForTimeout(600);
  let st = await state();
  console.log(`  ${ms().padStart(6)} phone call            ctx=${st.ctx}  theme srcs=${st.theme?.srcs}`);
  // coming back to the app is the exit, and it need not involve a touch
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  let back = null;
  for (let i = 0; i < 40; i++) {
    await p.waitForTimeout(250);
    st = await state();
    if (st.ctx === 'running' && st.theme?.srcs > 0 && !st.theme?.cold) { back = i * 250; break; }
  }
  console.log(`  ${ms().padStart(6)} back in the app       ctx=${st.ctx}  `
    + (back === null ? '← STILL WEDGED, the rest of the session is silent'
      : `music back after ${(back / 1000).toFixed(1)}s`));
  if (back === null) fails0.push('an interrupted context never recovered — silent for the rest of the session');
}

// ── 4. WHAT WAS SCHEDULED AGAINST A DEAD CLOCK ───────────────────────────────
const cold = s.starts.filter((x) => x.state !== 'running' && !x.gestured);
console.log(`\n  music sources scheduled       : ${s.starts.length}  (${preTouch} of them before any touch)`);
console.log(`  …of those, on a DEAD clock (no gesture pending): ${cold.length}`
  + (cold.length ? '   ← every one of these is silent' : ''));
for (const n of net) console.log(`  network  ${n.name.padEnd(14)} ${n.status}  at ${((n.at - T0) / 1000).toFixed(1)}s`);

await b.close();

const fails = [...fails0];
if (!SLOW) {
  if (menuHeard === null) fails.push('the menu theme never became audible after the first tap');
  // the app's half of the 150ms budget: the tap must schedule the score.
  // 500ms in the harness absorbs the probe's own 50ms polling and page IPC.
  else if (menuSched > 250) fails.push(`gate tap took ${menuSched}ms to schedule the score (spec: inside the gesture)`);
}
if (!SLOW) {
  if (themeHeard === null) fails.push('the match theme never became audible');
  else if (themeHeard > 2500) fails.push(`match theme took ${(themeHeard / 1000).toFixed(1)}s after the match started`);
}
if (cold.length) fails.push(`${cold.length} music source(s) scheduled against a suspended clock`);
if (SLOW && bedRate !== null && bedRate < 6) fails.push(`the match played in silence while the track downloaded (${bedRate} voices/s)`);
if (SLOW && splashBed !== null && splashBed < 6) fails.push(`the splash played in silence while the menu track downloaded (${splashBed} voices/s)`);
console.log('\n  ' + (fails.length ? 'FAIL — ' + fails.join('; ') : 'PASS — music starts on the first gesture and at match start') + '\n');
process.exit(fails.length ? 1 : 0);
