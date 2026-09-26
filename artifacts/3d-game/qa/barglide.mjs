// DOES THE BAR GLIDE, OR DOES IT ADD ITSELF IN BLOCKS?
//
//   node qa/barglide.mjs [port] [world] [--dump=<file.json>]
//
// The owner, 2026-09-25, on a screen recording of his own iPhone: "the progress
// bar on the bottom ... it's like janky. It's not like smooth progression. It's
// like little blocks that get added."
//
// He is describing what qa/barjump.mjs asked for. The bar was written from
// gShown, a ledger that only moves when a flying number lands, and the fill
// crossed each payment on a 0.12 s CSS width transition — so a spree drew a
// step, then nothing, then a step: blocks. This probe reads the fill the way
// he sees it, and grades the two halves of "blocks" separately.
//
// THE READING. Every rendered frame, the fill's own box (getBoundingClientRect,
// so a CSS transition in flight is read at the value it is drawing), the
// track's width, the ledger (__barDbg().gShown, what the bar has been PAID) and
// the form label. Keyed on __matchState().tClock — the clamped frame dt the bar,
// the bank window and the flight all run on — never on wall time: this box
// draws about one frame per wall second and the game's dt is clamped at 0.05,
// so a wall-clock sample would be a handful of frames of play.
//
// THE DRIVE. Ordinary bites (a tenth of his size and up) every 0.2 s of game
// time for 25 bites, warping to fresh ground if the eaten count stalls; then
// the chain is left to lapse (its cash-in is the last payment) and REST
// seconds of game time pass with nothing paid, so the bar can come to rest.
// Then one form change, forced with __setVoidR, to grade the level-up snap.
//
// THE BARS:
//   (a) STILL — of the game time between the bar's first move and its last,
//       the share it spends standing still (under 0.05 px in a frame). A bar
//       that is paid in blocks stands still between payments; a bar that
//       glides keeps moving while she keeps eating. Bar: 25%.
//   (b) JUMP — the biggest single frame's move, scaled to 50 ms of game time,
//       as a share of the median payment. A block lands a whole payment in one
//       frame (1.0 or more here, where a frame IS 50 ms of game time; ~0.42 on
//       a 60 Hz phone, where the 0.12 s transition spreads it over seven
//       frames). A glide spreads it over the better part of a second. Bar: 0.5.
//   (c) NO OVERSHOOT — the fill never draws more than 0.5 px past what it has
//       been paid, and never moves backwards while the ledger has not.
//   (d) AT REST — once nothing has been paid for REST (1.5 s) of game time,
//       the fill has come to rest within 1 px of the ledger: a glide arrives.
//   (e) THE LEVEL-UP KEEPS ITS SNAP — a form change changes the label, and the
//       fill leaves the old band for the new one in ONE frame: it may fill to
//       the brim first, but it never glides backwards across the track.
//
// (c)-(e) are what the smoothing must not break; (a) and (b) are the defect.
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = POS[0] || '4177';
const WORLD = POS[1] || 'maple';
const DUMP = (process.argv.find((a) => a.startsWith('--dump=')) || '').slice(7);
const BITES = 25, GAP = 0.2, REST = 1.5;
const STILL_PX = 0.05, STILL_BAR = 0.25, JUMP_BAR = 0.5;

const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`threw: ${(e && e.message) || e}`));
process.on('unhandledRejection', (e) => die(`rejected: ${(e && e.message) || e}`));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidFirstNom', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
const miss = await p.evaluate(() => ['__matchState', '__barDbg', '__eatNearest', '__warpVoid', '__setVoidR', '__voidState']
  .filter((k) => typeof window[k] !== 'function'));
if (miss.length) die(`this build has no ${miss.join(', ')} — nothing here can be measured without it`);
await enterMatch(p, WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });
if (await p.evaluate(() => typeof window.__matchState().tClock !== 'number')) die('__matchState() carries no tClock — there is no game clock to read the bar on');

// ── THE READING, ONE ROW PER RENDERED FRAME ─────────────────────────────────
// Throws, rather than skipping, if the bar's parts have moved: a probe that
// quietly reads nothing is the vacuous-green GOVERNOR rule 4 is about.
const sel = await p.evaluate(() => {
  const fill = document.querySelector('#growth .gFill');
  const track = document.querySelector('#growth .gTrack');
  const now = document.querySelector('#growth .gNow');
  if (!fill || !track || !now) return false;
  const G = window.__bg = { rows: [], on: true, pays: window.__barDbg().pays, lastPay: -1e9 };
  const tick = () => {
    if (!G.on) return;
    const s = window.__matchState(), d = window.__barDbg();
    const fr = fill.getBoundingClientRect(), tr = track.getBoundingClientRect();
    if (d.pays !== G.pays) { G.pays = d.pays; G.lastPay = s.tClock; }
    G.rows.push({ tc: s.tClock, t: s.t, w: fr.width, tw: tr.width, led: d.gShown, pays: d.pays,
      form: (now.textContent || '').trim(), eaten: s.eaten, vis: tr.width > 4 });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return true;
});
if (!sel) die('#growth .gFill / .gTrack / .gNow are not in the page — the bar has moved and this probe reads nothing');

const tc = () => p.evaluate(() => window.__matchState().tClock);
const waitTc = async (x) => { await p.waitForFunction((v) => window.__matchState().tClock >= v, x, { timeout: 900000, polling: 100 }); };

// ── THE SPREE ───────────────────────────────────────────────────────────────
const t0 = await tc();
let landed = 0, lastEaten = -1, stale = 0, warps = 0;
for (let i = 0; i < BITES; i++) {
  await waitTc(t0 + i * GAP);
  const st = await p.evaluate(() => window.__matchState().eaten);
  if (st === lastEaten) stale++; else { stale = 0; lastEaten = st; }
  if (stale >= 4) {
    stale = 0; warps++;
    await p.evaluate(() => { const v = window.__voidState(); const a = Math.random() * Math.PI * 2;
      window.__warpVoid(v.x + Math.cos(a) * 60, v.z + Math.sin(a) * 60); });
  }
  if (await p.evaluate(() => window.__eatNearest(0.1))) landed++;
}
const spreeEnd = await tc();
// ── AT REST MEANS NOTHING LEFT TO PAY ─────────────────────────────────────
// The last payment is not the last bite's flight: when the chain lapses, 1.6 s
// after its last link, its cash-in pays the bar too (nomCash -> gbarPay). The
// first run of this probe waited a fixed 2.4 s after the spree, closed its
// window 0.7 s after that cash-in had landed, and read a correct glide 1.39px
// short of its ledger as a bar that never arrives. So: wait for the chain to
// lapse, then for REST seconds of game time with no payment at all.
await p.waitForFunction(() => window.__matchState().combo === 0, null, { timeout: 900000, polling: 200 });
await p.waitForFunction((rest) => window.__matchState().tClock - (window.__bg.lastPay ?? -1e9) >= rest,
  REST, { timeout: 900000, polling: 200 });
const restAt = await tc();

// ── THE FORM CHANGE ─────────────────────────────────────────────────────────
// x1.6 of his radius crosses at least one FORM_MIN rung from anywhere under
// COLOSSUS (the rungs are 1.56x apart at most down there), and the label is
// asserted to change, so a rung table that moves fails loudly here instead of
// grading a crossing that never happened.
const cross = await p.evaluate(() => {
  const r = window.__matchState().r;
  const form = (document.querySelector('#growth .gNow').textContent || '').trim();
  window.__setVoidR(r * 1.6);
  return { r, to: r * 1.6, form, tc: window.__matchState().tClock };
});
await waitTc(cross.tc + 1.2);
const G = await p.evaluate(() => { window.__bg.on = false; return window.__bg; });
const led = await p.evaluate(() => window.__barDbg());
await b.close();
if (DUMP) writeFileSync(DUMP, JSON.stringify({ world: WORLD, t0, spreeEnd, restAt, cross, rows: G.rows }, null, 0));

// ── GRADING ─────────────────────────────────────────────────────────────────
// ── THE FILL AS A SHARE OF ITS OWN TRACK ──────────────────────────────────
// Not raw pixels. #growth scales as a whole (.pop, 1.045x) on an evolution and
// a demoting bite, and a rect includes that transform: the first run of this
// probe read one such frame as the fill moving backwards 5.7px, when the fill
// had not moved at all — the card around it had. So every reading is
// fill/track, and pixels are that share of the track's usual width.
const rows = G.rows.filter((r) => r.vis).map((r) => ({ ...r, f: r.w / r.tw }));
const spree = rows.filter((r) => r.tc >= t0 && r.tc <= restAt);
if (spree.length < 20) die(`only ${spree.length} frames were drawn across the spree — too few to grade`);
const tws = spree.map((r) => r.tw).sort((x, y) => x - y);
const tw = tws[Math.floor(tws.length / 2)];
// a form change inside the spree is the level-up path, not a glide: its frames,
// and 0.3 s either side, are left out of (a)-(d) and graded under (e) only
const formAt = [];
for (let i = 1; i < spree.length; i++) if (spree[i].form !== spree[i - 1].form) formAt.push(spree[i].tc);
const nearForm = (t) => formAt.some((x) => Math.abs(t - x) <= 0.3);

const pairs = [];
for (let i = 1; i < spree.length; i++) {
  const a = spree[i - 1], c = spree[i];
  const dt = c.tc - a.tc;
  if (dt <= 0 || nearForm(c.tc) || nearForm(a.tc)) continue;
  pairs.push({ tc: c.tc, dt, dw: (c.f - a.f) * tw, dled: (c.led - a.led) * tw, paid: c.pays > a.pays, w: c.f * tw, led: c.led * tw });
}
const moving = pairs.filter((q) => Math.abs(q.dw) >= STILL_PX);
if (moving.length < 3) die(`the bar moved on ${moving.length} frame(s) of ${pairs.length} — nothing was paid to glide or to step`);
const first = moving[0].tc, last = moving[moving.length - 1].tc;
const inWin = pairs.filter((q) => q.tc > first && q.tc <= last);
const winT = inWin.reduce((s, q) => s + q.dt, 0);
const stillT = inWin.filter((q) => Math.abs(q.dw) < STILL_PX).reduce((s, q) => s + q.dt, 0);
const stillShare = winT > 0 ? stillT / winT : 1;
const payPx = pairs.filter((q) => q.paid && q.dled > 0.05).map((q) => q.dled).sort((x, y) => x - y);
if (!payPx.length) die('the ledger was never paid during the spree — nothing was eaten, or the payout path is broken');
const medPay = payPx[Math.floor(payPx.length / 2)];
let jump = 0, jumpAt = null;
for (const q of pairs) {
  const k = (Math.abs(q.dw) * (0.05 / q.dt)) / medPay;
  if (k > jump) { jump = k; jumpAt = q; }
}
const over = pairs.filter((q) => q.w > q.led + 0.5);
const back = pairs.filter((q) => q.dw < -STILL_PX && q.dled >= -0.01);
const restRow = spree[spree.length - 1];
const restGap = Math.abs(restRow.f - restRow.led) * tw;
const travel = moving.reduce((s, q) => s + Math.abs(q.dw), 0);

console.log(`\n  BAR GLIDE — ${WORLD} on :${PORT}\n`);
console.log(`  ·    spree: ${landed}/${BITES} bites landed on the game clock ${t0.toFixed(2)} → ${spreeEnd.toFixed(2)}, ${warps} warp(s), rest to ${restAt.toFixed(2)}`);
console.log(`  ·    ${spree.length} frames drawn, track ${tw.toFixed(1)}px; the fill travelled ${travel.toFixed(1)}px on ${moving.length} of them, `
  + `between tClock ${first.toFixed(2)} and ${last.toFixed(2)} (${winT.toFixed(2)} s)`);
console.log(`  ·    ${payPx.length} payment(s) into the ledger, median ${medPay.toFixed(1)}px (${payPx.map((x) => x.toFixed(1)).join(' ')})`);
if (formAt.length) console.log(`  ·    a form change inside the spree at tClock ${formAt.map((x) => x.toFixed(2)).join(', ')} — left to (e)`);

let bad = 0;
const bar = (ok, id, msg) => { console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };
bar(stillShare <= STILL_BAR, 'a', `the fill stood still for ${(stillShare * 100).toFixed(1)}% of the ${winT.toFixed(2)} s it was travelling `
  + `(${stillT.toFixed(2)} s; bar ${(STILL_BAR * 100).toFixed(0)}%)`);
bar(jump <= JUMP_BAR, 'b', `the biggest frame moved ${jumpAt ? Math.abs(jumpAt.dw).toFixed(1) : 0}px in ${jumpAt ? (jumpAt.dt * 1000).toFixed(0) : 0} ms of game time `
  + `= ${jump.toFixed(2)} of a median payment per 50 ms (bar ${JUMP_BAR})`);
bar(over.length === 0 && back.length === 0, 'c', `drawn past its payment on ${over.length} frame(s)`
  + `${over.length ? ` (worst +${Math.max(...over.map((q) => q.w - q.led)).toFixed(2)}px)` : ''}, backwards with the ledger standing on ${back.length}`);
bar(restGap <= 1, 'd', `${restGap.toFixed(2)}px from the ledger after ${REST} s with nothing paid (bar 1px)`);

// (e) the form change
{
  const post = rows.filter((r) => r.tc >= cross.tc - 0.001);
  const changed = post.find((r) => r.form !== cross.form);
  let run = 0, worstRun = 0;
  for (let i = 1; i < post.length; i++) {
    if ((post[i].f - post[i - 1].f) * tw < -0.5) { run++; worstRun = Math.max(worstRun, run); } else run = 0;
  }
  const endW = post.length ? post[post.length - 1].f * tw : NaN;
  const endLed = post.length ? post[post.length - 1].led * tw : NaN;
  bar(!!changed && worstRun <= 1 && Math.abs(endW - endLed) <= 1, 'e', changed
    ? `r ${cross.r.toFixed(2)} → ${cross.to.toFixed(2)}: ${cross.form} → ${changed.form}; the fill went back across the track in `
      + `${worstRun} consecutive frame(s) (bar 1 — a snap), and settled ${Math.abs(endW - endLed).toFixed(2)}px from the new band's ledger`
    : `r ${cross.r.toFixed(2)} → ${cross.to.toFixed(2)} and the label still reads ${cross.form} — no form change happened to grade`);
}
console.log(`  ·    ledger at the end: ${JSON.stringify(led)}`);
console.log(bad ? `\nFAIL — ${bad} of 5 bar(s): the bar is paid in blocks a child can see, not a glide`
  : '\nPASS — the bar glides while she eats, never runs past its payment, and still snaps on a form change');
process.exit(bad ? 1 : 0);
