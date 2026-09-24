// THE BITE PAYS OFF ON THE SWALLOW — is a bite heard when the meal goes in?
//
//   node qa/bitetime.mjs [port] [world]
//
// Studio round 4, Job 11, and the instrument that gates it (I-10). The bar is
// Donut County's third point: the reward lands when the object drops in. Ours
// landed on contact. capture() played the bite's sound, its voice and its buzz
// on the frame the prop was TAKEN; the drain then held the prop at the height it
// was taken from until e.t crossed T_FALL, and only then let it fall. So every
// bite in the game was heard first and seen to go in afterwards. The studio's
// figure for the gap is 170-290 ms.
//
// WHAT IT READS, EACH FROM ITS OWN SOURCE
//   capture  tClock in the same task as __eatNearest, which drives the real
//            capture(). Nothing between the two can run a frame.
//   sink     the first frame on which the prop's own y has left the height it
//            was taken from — the edible's dropY, which capture() writes. The
//            drain rewrites y from dropY on every frame, so until the fall
//            begins y IS dropY, exactly, and the first frame it is not is the
//            first frame of the fall. Read off the mesh, never off the drain's
//            T_FALL: a copy of that literal in here would describe the build it
//            was copied from forever (GOVERNOR.md rule 4, the snapshot).
//   sound    the 'pop' or 'chomp' in __audioCalls — every public call into the
//            audio engine, stamped with tClock by the wrapper around it. Tied to
//            THIS bite one of two ways, and a build that allows neither is a
//            FAIL, never a skip:
//              1. it was called inside capture() itself: it is in the call log
//                 after the entry that was last before __eatNearest ran, in a
//                 task no frame can interrupt;
//              2. the build's __biteLog names the tClock this mesh's sound was
//                 asked for AND the call log holds a pop or chomp at that same
//                 tClock. The log alone is the game's word; the call log is the
//                 engine's, so both have to agree.
//
// THE DRIVE. The void is held at r 3 (__setVoidR, which pins the growth law and
// sets the form itself). Bites are forced one at a time through __eatNearest,
// alternating a crumb (at least 0.1 of r) and a meal (at least 0.55 of r),
// because the drain's rate falls with the meal's size relative to the void and
// the gap is widest for the biggest meal. Each waits until the last one has
// been swallowed, on the game's clock, so no two drains overlap.
//
// THE BARS
//   (a) every measured bite's sound lands within 67 ms of its sink start, on
//       tClock. 67 ms is the studio's bar: four frames at 60 fps.
//   (b) at least four bites were measured, crumbs and meals both.
//
// THE CLOCK. Everything is keyed on tClock via __matchState(). animate() clamps
// dt to 0.05 s, so under the software renderer every frame is 50 ms of game
// time whatever it costs on the wall, and 50 ms is the finest step this probe
// can resolve. A sound on the sink's own frame reads 0 ms.
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const PORT = POS[0] || '4177', WORLD = POS[1] || 'maple';
const BAR = 0.067;
const RELS = [0.1, 0.55, 0.1, 0.55, 0.1, 0.55, 0.1, 0.55];   // up to eight tries for six bites
const WANT = 6, MIN_MEASURED = 4;
const BITE_SOUNDS = new Set(['pop', 'chomp']);

const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`threw: ${(e && e.message) || e}`));
process.on('unhandledRejection', (e) => die(`rejected: ${(e && e.message) || e}`));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
p.on('pageerror', (e) => console.log('PAGEERR ' + String(e).slice(0, 140)));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidFirstNom', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await enterMatch(p, WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000, polling: 250 });

const hooks = await p.evaluate(() => ({
  calls: typeof window.__audioCalls === 'function',
  eat: typeof window.__eatNearest === 'function',
  edibles: Array.isArray(window.__edibles),
  setR: typeof window.__setVoidR === 'function',
  tClock: typeof window.__matchState?.().tClock === 'number',
  biteLog: typeof window.__biteLog === 'function',
}));
for (const [k, v] of Object.entries(hooks)) {
  if (k !== 'biteLog' && !v) die(`this build has no ${k} hook — nothing here can be measured without it`);
}

// ── THE SAMPLER ─────────────────────────────────────────────────────────────
// One row per animation frame for the bite in flight: the game's clock, the
// prop's height and whether the drain still holds it. Whichever of this callback
// and the game's own runs first in a frame, each row is one finished animate()'s
// state — tClock and y are written by the same call — so a row never pairs one
// frame's clock with another frame's height.
await p.evaluate(() => {
  const tick = () => {
    const B = window.__bt;
    if (B && !B.done) {
      try {
        B.rows.push({ tc: window.__matchState().tClock, y: B.e.mesh.position.y, eaten: !!B.e.eaten });
        if (!B.e.eaten) B.done = true;
        else if (B.rows.length > 600) { B.done = true; B.stuck = true; }
      } catch (err) { B.done = true; B.err = String((err && err.message) || err); }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await p.evaluate(() => window.__setVoidR(3));
{
  const t = await p.evaluate(() => window.__matchState().tClock);
  await p.waitForFunction((x) => window.__matchState().tClock > x + 0.3, t, { timeout: 600000, polling: 250 });
}

const bites = [];
for (const rel of RELS) {
  if (bites.filter((x) => x.lead !== undefined).length >= WANT) break;
  // ── THE CAPTURE, and everything that has to be read inside its task ──────
  const got = await p.evaluate((rel) => {
    const E = window.__edibles;
    const was = new Set();
    for (const e of E) if (e.eaten) was.add(e);
    const before = window.__audioCalls();
    const last = before.length ? before[before.length - 1] : null;
    const tc = window.__matchState().tClock;
    const ate = window.__eatNearest(rel);
    if (!ate) return { none: true };
    let e = null;
    for (const x of E) if (x.eaten && !was.has(x)) { e = x; break; }
    // __eatNearest reports the edible it chose even when capture() declined it
    // (a departed balloon, a tethered whale): then nothing new is in the drain
    if (!e) return { declined: true, r: ate.r };
    // the calls capture() made: everything after the last entry that stood
    // before it ran. The log is a 400-deep ring that drops from the FRONT, so
    // its last entry survives the calls that follow it; the entries are the
    // same objects on every read, so identity finds it.
    const after = window.__audioCalls();
    const k = last ? after.lastIndexOf(last) : -1;
    const sync = after.slice(k + 1).map((c) => ({ id: c.id, t: c.t }));
    const y0 = typeof e.dropY === 'number' ? e.dropY : e.mesh.position.y;
    window.__bt = { e, y0, rows: [], done: false };
    return { r: ate.r, R: ate.R, tc, id: e.mesh.id, y0, sync };
  }, rel);
  const kind = rel >= 0.5 ? 'meal' : 'crumb';
  if (got.none) { bites.push({ kind, rel, skip: `no edible between ${rel} and 1.0 of the void's radius` }); continue; }
  if (got.declined) { bites.push({ kind, rel, skip: `capture() declined the r ${got.r.toFixed(2)} prop __eatNearest chose` }); continue; }

  await p.waitForFunction(() => window.__bt?.done, null, { timeout: 900000, polling: 250 });
  const res = await p.evaluate(() => {
    const B = window.__bt;
    return {
      rows: B.rows, err: B.err || null, stuck: !!B.stuck,
      log: typeof window.__biteLog === 'function' ? window.__biteLog() : null,
      calls: window.__audioCalls().map((c) => ({ id: c.id, t: c.t })),
    };
  });
  const row = { kind, rel, r: got.r, R: got.R, tc: got.tc };
  bites.push(row);
  if (res.err) { row.skip = `the sampler threw: ${res.err}`; continue; }
  if (res.stuck) { row.skip = `still in the drain after ${res.rows.length} frames`; continue; }

  const sink = res.rows.find((x) => x.y !== got.y0);
  const gulp = res.rows.find((x) => !x.eaten);
  if (!sink) { row.skip = 'swallowed without ever leaving the height it was taken from'; continue; }
  row.sink = sink.tc; row.gulp = gulp ? gulp.tc : null;

  // ── WHICH SOUND WAS THIS BITE'S ──────────────────────────────────────────
  let snd = got.sync.find((c) => BITE_SOUNDS.has(c.id)), route = 'inside capture()';
  if (!snd) {
    const ent = (res.log || []).find((x) => x.id === got.id && Math.abs(x.cap - got.tc) < 1e-6);
    if (!res.log) { row.bad = 'capture() played no bite sound and this build keeps no __biteLog, so no sound can be tied to this bite'; continue; }
    if (!ent) { row.bad = `__biteLog has no row for mesh ${got.id} captured at tClock ${got.tc.toFixed(3)}`; continue; }
    if (!(ent.sndT >= 0)) { row.bad = `__biteLog says this bite was never heard (sink ${ent.sink}, swallow ${ent.gulp})`; continue; }
    const hit = res.calls.find((c) => BITE_SOUNDS.has(c.id) && Math.abs(c.t - ent.sndT) < 1e-6);
    if (!hit) { row.bad = `__biteLog puts its sound at tClock ${ent.sndT.toFixed(3)} and the call log has no pop or chomp there`; continue; }
    snd = hit; route = '__biteLog, confirmed in the call log';
  }
  row.snd = snd.id; row.sndT = snd.t; row.route = route;
  row.lead = sink.tc - snd.t;   // positive: the sound came BEFORE the fall

  // the next bite waits a beat on the game's clock, clear of this one's swallow
  const t = await p.evaluate(() => window.__matchState().tClock);
  await p.waitForFunction((x) => window.__matchState().tClock > x + 0.2, t, { timeout: 600000, polling: 250 });
}
await b.close();

// ── GRADING ─────────────────────────────────────────────────────────────────
console.log(`\n  BITE TIME — ${WORLD} on :${PORT}, void held at r 3${hooks.biteLog ? '' : ' (this build has no __biteLog)'}\n`);
const ms = (s) => `${(s * 1000).toFixed(0)} ms`;
for (const x of bites) {
  const head = `${x.kind.padEnd(5)} rel ${x.rel.toFixed(2)}${x.r ? ` r ${x.r.toFixed(2)} on R ${x.R.toFixed(2)}` : ''}`;
  if (x.skip) { console.log(`  ·    ${head}: not measured — ${x.skip}`); continue; }
  if (x.bad) { console.log(`  BAD  ${head}: ${x.bad}`); continue; }
  const when = x.lead > 0 ? `${ms(x.lead)} BEFORE the sink` : x.lead < 0 ? `${ms(-x.lead)} after the sink` : 'on the sink\'s own frame';
  console.log(`  ${Math.abs(x.lead) <= BAR ? 'ok  ' : 'BAD '} ${head}: capture ${x.tc.toFixed(3)}, sink ${x.sink.toFixed(3)}, `
    + `swallow ${x.gulp == null ? '—' : x.gulp.toFixed(3)}; ${x.snd} at ${x.sndT.toFixed(3)} (${x.route}) — ${when}`);
}

const measured = bites.filter((x) => x.lead !== undefined);
const unattributed = bites.filter((x) => x.bad);
const late = measured.filter((x) => Math.abs(x.lead) > BAR);
const kinds = new Set(measured.map((x) => x.kind));
let bad = 0;
const bar = (ok, id, msg) => { console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };
console.log('');
{
  const worst = measured.length ? measured.reduce((a, x) => (Math.abs(x.lead) > Math.abs(a.lead) ? x : a)) : null;
  bar(!unattributed.length && !late.length && measured.length > 0, 'a', unattributed.length
    ? `${unattributed.length} bite(s) whose sound could not be tied to them — nothing about their timing is known`
    : late.length
      ? `${late.length} of ${measured.length} bite(s) heard more than ${ms(BAR)} from the start of their fall; `
        + `the worst ${ms(Math.abs(worst.lead))} ${worst.lead > 0 ? 'early' : 'late'} (a ${worst.kind}, r ${worst.r.toFixed(2)} on R ${worst.R.toFixed(2)})`
      : measured.length
        ? `every bite heard within ${ms(BAR)} of the start of its fall; the widest ${ms(Math.abs(worst.lead))}`
        : 'no bite was measured');
}
bar(measured.length >= MIN_MEASURED && kinds.has('crumb') && kinds.has('meal'), 'b',
  `${measured.length} of ${bites.length} bite(s) measured (${[...kinds].join(' and ') || 'neither size'}; want at least ${MIN_MEASURED}, crumbs and meals both)`);

console.log(bad ? `\nFAIL — ${bad} of 2 bar(s)` : '\nPASS — 2 bar(s): every bite is heard as its meal starts to go in');
process.exit(bad ? 1 : 0);
