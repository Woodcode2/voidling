// ONE THICK EVENT, NOT ONE THIN ONE — the juice contract.
//
//   node qa/juice.mjs [port]
//
// AAA-BRIEF absence #1: a cheap game answers a big action once; a polished
// game answers in layers — camera, particles, hit-stop, haptics — arriving
// together. This forces a real size-class-up eat through the game's own
// capture() path and counts the channels that answered, from STATE rather
// than timing, so it works at any frame rate (the sandbox runs ~1fps).
//
// Channels counted for one forced big bite:
//   lens      camera.fov above its 32 resting value, or the punch armed
//   hit-stop  stopT armed anew (the sim freeze)
//   sparks    more live absorb particles than the frame before
//   haptics   buzz() fired
// Contract: at least THREE of four answer. Failed on the build where the lens
// never moved in the entire codebase (fov was written exactly once).
//
// ── NO CREDIT FOR THE CAPTURE FRAME (studio round 4, Job 11) ─────────────
// This used to read the four channels in the same task as __eatNearest — the
// frame the prop was TAKEN — and that is exactly the frame the studio found
// the bite paying off on: sound and buzz on contact, the world stopped and the
// burst thrown while the meal was still out at the rim, all of it spent before
// the prop began to fall. The probe credited that as juice. Job 11 moves the
// payoff to the meal going in — the buzz where the fall begins, the hit-stop
// and the burst on the swallow — so (a) now follows the bite frame by frame
// from the capture to the swallow, credits a channel only for a rise onto the
// frame the meal starts to fall or the frame it is swallowed, and prints what
// fired on the capture frame for the record, crediting none of it.
// qa/bitetime.mjs times the sound.
//
// …AND NO CREDIT FOR ANOTHER MEAL'S PAYOFF (the Job 11 review). The void goes
// on eating by itself while the forced meal goes down, so a rise on the sink
// or swallow frame could be another meal's — and another meal's swallow could
// spend the hit-stop's cooldowns and leave a correct build at 2/4. Each rise
// is now tied to the forced bite through __biteLog, the kit through __kickN,
// and an attempt that another meal spoils is taken again (see WHOSE RISE IS
// IT, below). A build with no __biteLog is credited nothing.
//
// (b) THE FACE TAKES THE EVOLUTION TOO — studio round 4, Job 8 (HERO). An
// evolution is the biggest thing that happens to the void, and the one channel
// that never answered it was his own face: celebrate() pops the body and
// flares the ribbon, the card and the paper and the flash all fire, and the
// mood engine went on showing whatever it showed before — cruise, or hungry
// in a town. Part (b) forces the next form through the REAL ceremony block
// (__forceEvolve, which drives the stage check itself rather than a copy of
// it) from a fresh match and requires the rig to report `smug` or `victory`
// within 3 animation frames. Three, not one: the ceremony runs AFTER the mood
// block in the frame loop, so the earliest a mood can follow it is the next
// frame, and the probe's own rAF callback may land either side of the game's.
// Counted in frames rather than seconds because the claim is "on the beat",
// and under swiftshader a second of wall clock is a single frame.
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

// a run that throws or rejects anywhere below prints a verdict, not a stack
const die = (e) => { console.log(`\nFAIL — juice aborted before a verdict: ${String((e && e.message) || e).split('\n')[0]}`); process.exit(1); };
process.on('uncaughtException', die);
process.on('unhandledRejection', die);

const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
p.on('pageerror', (e) => console.log('PAGEERR ' + String(e).slice(0, 140)));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await enterMatch(p, 'maple');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000 });

// ── (b) first, on the fresh match, before (a) moves the radius ─────────────
const face = await p.evaluate(() => new Promise((res) => {
  const before = window.__faceState().mood;
  const ev0 = window.__stages().ceremonies;
  window.__forceEvolve();
  const seen = [];
  const tick = () => {
    const m = window.__faceState().mood;
    seen.push(m);
    if (m === 'smug' || m === 'victory' || seen.length >= 3) {
      res({ before, seen, fired: window.__stages().ceremonies > ev0 });
    } else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}));
const faceOk = face.fired && ['smug', 'victory'].includes(face.seen[face.seen.length - 1]);
console.log(`  (b) forced evolution: ceremony ${face.fired ? 'fired' : 'DID NOT FIRE'}; mood ${face.before} -> `
  + `${face.seen.join(' -> ')} over ${face.seen.length} frame(s)`);
const faceVerdict = !face.fired
  ? 'FAIL — (b) __forceEvolve did not run a ceremony from a fresh match, so the face was never asked'
  : faceOk ? `PASS — (b) the face answers the evolution: ${face.seen[face.seen.length - 1]} on frame ${face.seen.length}`
    : `FAIL — (b) three frames after the evolution the face still reads ${face.seen[face.seen.length - 1]} `
      + '(contract: smug or victory within 3 frames)';

// a size where houses are a big-but-legal bite, near a built-up district
await p.evaluate(() => { window.__setVoidR(4); });
// …and let the feast that size sets off go down first, on the game's clock.
// Growing to r 4 in one call puts every prop within reach of the rim into the
// drain at once, big ones included, and each of those now stops the world on
// its own swallow. 1.0 s is 20 frames at dt 0.05: past the slowest drain (13
// frames by the drain's rate). This was an 800 ms wall-clock sleep: under one
// frame at the cost qa/navtap.mjs traced on this box (about one per 2.5 s).
{
  const t = await p.evaluate(() => window.__matchState().tClock);
  await p.waitForFunction((x) => window.__matchState().tClock > x + 1.0, t, { timeout: 600000, polling: 250 });
}

// ── ONE ATTEMPT ──────────────────────────────────────────────────────────
// Row 0 is the capture frame, read in the same task as the bite. Every row
// after it is one animation frame, until the drain lets go of the meal. The
// payoff is read on two of them, each off the mesh rather than off any of the
// game's own constants: the SINK, the first row on which the prop's height has
// left the height it was taken from (the drain rewrites it from dropY every
// frame until the fall begins), and the SWALLOW, the first row that reads it
// let go — the drain writes `eaten` and pays the swallow in the same call.
// Each row also carries the game's clock, the landmark kit's firing count
// (__kickN) and the ceremony count, so a rise can be tied to a meal below.
const attempt = () => p.evaluate(() => new Promise((res) => {
  const E = window.__edibles;
  const row = (e) => ({ ...window.__juiceState(), tc: window.__matchState().tClock,
    kick: window.__kickN ?? 0, ev: window.__stages().ceremonies, eaten: !!e.eaten, y: e.mesh.position.y });
  const was = new Set();
  for (const x of E) if (x.eaten) was.add(x);
  const before = { ...window.__juiceState(), kick: window.__kickN ?? 0 };
  const ate = window.__eatNearest(0.6);   // >= 0.6 of R = a size-class-up bite
  if (!ate) { res({ before, ate: null }); return; }
  let e = null;
  for (const x of E) if (x.eaten && !was.has(x)) { e = x; break; }
  if (!e) { res({ before, ate, declined: true }); return; }
  const y0 = typeof e.dropY === 'number' ? e.dropY : e.mesh.position.y;
  const rows = [row(e)];
  const tick = () => {
    rows.push(row(e));
    if (!e.eaten || rows.length > 400) {
      res({ before, ate, rows, y0, id: e.mesh.id, swallowed: !e.eaten,
        log: typeof window.__biteLog === 'function' ? window.__biteLog() : null });
    } else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}));

// ── WHOSE RISE IS IT ─────────────────────────────────────────────────────
// A channel answers THIS bite when it rises from the frame before onto the
// frame its meal starts to fall or the frame it is swallowed — and nothing
// else touched that frame. The void keeps eating on its own while this one
// goes down: a natural capture's buzz on our sink frame, another meal's burst
// or hit-stop on our swallow frame, would be credited to us, and on a build
// that pays on contact that is a false PASS. So a frame is SHARED when any
// other __biteLog row was captured, began to fall or was swallowed on it (the
// log keeps every capture, stamped with tClock), and for the buzz and the
// lens when an evolution ceremony played on it. A rise only on a shared frame
// cannot be tied to this bite: the attempt is SPOILED and another is taken.
// A build with no __biteLog cannot tie anything to anything: nothing is
// credited, and the capture-frame line below says where its payoff went.
//
// HIT-STOP HAS TWO COOLDOWNS: hitStop()'s own 0.35 s on dt, and the landmark
// kit's 1.6 s on wall time. Another qualifying meal swallowed in the window
// before ours spends them and ours correctly does not stop the world — a
// correct build would read 2/4. So the probe waits for both to read clear
// (and no bite in flight) before it bites, requires the kit to have fired on
// the frame it credits (__kickN rose there), and SPOILS the attempt when the
// kit fired on any other frame between our capture and our swallow, or
// hitStop's cooldown was still running into our swallow frame.
const EPS = 1e-9;
const same = (a, b) => typeof a === 'number' && a >= 0 && Math.abs(a - b) < EPS;
function judge(out) {
  const rows = out.rows;
  const sinkK = rows.findIndex((r, k) => k > 0 && r.y !== out.y0);
  const gulpK = rows.findIndex((r) => !r.eaten);
  const ch = { lens: false, hitstop: false, sparks: false, haptics: false };
  const J = { sinkK, gulpK, ch, spoiled: [], notes: [], final: null };
  if (!out.log) { J.final = 'this build keeps no __biteLog, so nothing on the payoff frames can be tied to this bite'; return J; }
  const mine = out.log.find((b) => b.id === out.id && same(b.cap, rows[0].tc));
  if (!mine) { J.spoiled.push('its row had already left the 64-deep __biteLog'); return J; }
  if (sinkK > 0 && !same(mine.sink, rows[sinkK].tc)) J.notes.push(`__biteLog puts its sink at ${mine.sink}, the mesh at ${rows[sinkK].tc}`);
  if (!same(mine.gulp, rows[gulpK].tc)) J.notes.push(`__biteLog puts its swallow at ${mine.gulp}, the mesh at ${rows[gulpK].tc}`);
  const others = out.log.filter((b) => b !== mine);
  const byBite = (k) => others.some((b) => same(b.cap, rows[k].tc) || same(b.sink, rows[k].tc) || same(b.gulp, rows[k].tc));
  const byEvo = (k) => rows[k].ev > rows[k - 1].ev;
  const pay = [...new Set([sinkK, gulpK])].filter((k) => k > 0);
  const channel = (name, rose, shared) => {
    const up = pay.filter((k) => rose(rows[k], rows[k - 1]));
    if (up.some((k) => !shared(k))) ch[name] = true;
    else if (up.length) J.spoiled.push(`${name} rose only on frame ${up.join('/')}, which another meal${up.some(byEvo) ? ' or a ceremony' : ''} shares`);
  };
  channel('lens', (r, q) => (r.fov > 32.2 && !(q.fov > 32.2)) || r.fovKick > q.fovKick + 0.5, (k) => byBite(k) || byEvo(k));
  channel('haptics', (r, q) => r.buzzes > q.buzzes, (k) => byBite(k) || byEvo(k));
  channel('sparks', (r, q) => r.puffs > q.puffs, byBite);
  channel('hitstop', (r, q) => r.stop > q.stop && r.kick > q.kick, byBite);
  if (!ch.hitstop) {
    const kitAt = [];
    for (let k = 1; k <= gulpK; k++) if (rows[k].kick > rows[k - 1].kick && (!pay.includes(k) || byBite(k))) kitAt.push(k);
    if (kitAt.length) J.spoiled.push(`the landmark kit fired for another meal on frame ${kitAt.join('/')}`);
    // …unless it was THIS bite's own capture that spent the cooldowns: row 0
    // is read in the task that called capture(), so a kit on it is ours, and
    // a kit on contact is what (a) is here to fail, not a reason to retry
    if (!(rows[0].kick > (out.before.kick ?? 0))) {
      const hot = pay.filter((k) => typeof rows[k - 1].stopCd === 'number' && rows[k - 1].stopCd - (rows[k].tc - rows[k - 1].tc) > EPS);
      if (hot.length) J.spoiled.push(`hitStop()'s own cooldown was still running into frame ${hot.join('/')}`);
      if (rows[0].kitCd > 0 || rows[0].stopCd > 0) J.spoiled.push('the cooldowns had not cleared when it bit');
    }
  }
  return J;
}

const ATTEMPTS = 3;
const tries = [];
let chosen = null, stop = null;
for (let i = 0; i < ATTEMPTS && !chosen && !stop; i++) {
  // quiet first, on the game's clock: no bite of the void's own still in the
  // air, and both of the hit-stop's cooldowns clear — or a second of tClock,
  // whichever is first (a void that never stops eating still gets its turn)
  {
    const t = await p.evaluate(() => window.__matchState().tClock);
    await p.waitForFunction((x) => {
      const L = typeof window.__biteLog === 'function' ? window.__biteLog() : [];
      const j = window.__juiceState();
      return (L.every((b) => b.gulp >= 0) && !(j.stopCd > 0) && !(j.kitCd > 0)) || window.__matchState().tClock > x + 1.0;
    }, t, { timeout: 600000, polling: 250 });
  }
  const out = await attempt();
  if (!out.ate) { stop = 'no big edible in range at r 4'; break; }
  if (out.declined) { tries.push({ out, why: `capture() declined the r ${out.ate.r.toFixed(2)} prop __eatNearest chose` }); continue; }
  if (!out.swallowed) { tries.push({ out, why: `the meal was still in the drain after ${out.rows.length - 1} frames` }); continue; }
  const J = judge(out);
  tries.push({ out, J, why: J.spoiled.join('; ') });
  if (J.final || !J.spoiled.length) chosen = { out, J };
}
await b.close();

// ── (a) UNMEASURED IS NOT (a) PASSED ─────────────────────────────────────
// Before (b) this branch printed a note, no verdict, and exit 0 — which the
// gate reads as silence, and fails. The commit that added (b) printed (b)'s
// verdict here instead, so (b)'s PASS was the only verdict line and the
// gate's reader (a PASS and no FAIL) passed the step with (a) never measured.
// So an unmeasured (a) says FAIL out loud, and (b)'s line is still printed
// for what it is worth.
tries.forEach((t, i) => {
  const o = t.out;
  const head = `  attempt ${i + 1}: bite r=${o.ate.r.toFixed(2)} on R=${o.ate.R.toFixed(2)}`;
  if (!t.J) { console.log(`${head}: not measured — ${t.why}`); return; }
  console.log(`${head}: began to fall on frame ${t.J.sinkK > 0 ? t.J.sinkK : 'never'}, swallowed on frame ${t.J.gulpK} after the capture`
    + (t.J.final ? '' : t.why ? ` — SPOILED: ${t.why}` : ' — clean'));
  for (const n of t.J.notes) console.log(`    note: ${n}`);
});
if (!chosen) {
  console.log(`\n  FAIL — (a) inconclusive: ${stop ?? `none of ${tries.length} forced bite(s) could be tied to its own payoff frames`}, `
    + 'so the bite\'s four channels were not measured');
  console.log('  ' + faceVerdict + '\n');
  process.exit(1);
}
const { out, J } = chosen;
const at = out.rows[0], was = out.before;
const onCapture = [
  (at.fovKick > was.fovKick + 0.5 || (at.fov > 32.2 && !(was.fov > 32.2))) && 'lens',
  at.stop > was.stop && 'hit-stop', at.puffs > was.puffs && 'sparks', at.buzzes > was.buzzes && 'haptics',
].filter(Boolean);
const n = Object.values(J.ch).filter(Boolean).length;
const last = out.rows[out.rows.length - 1];
console.log(`  on the capture frame (not credited): ${onCapture.join(' ') || 'nothing'}`);
if (J.final) console.log(`  on the payoff: nothing credited — ${J.final}`);
else {
  console.log(`  on the payoff, tied to this bite: lens=${J.ch.lens}  hitstop=${J.ch.hitstop} (${last.stop.toFixed(3)}s on the swallow frame)  `
    + `sparks=${J.ch.sparks} (${last.puffs} live)  haptics=${J.ch.haptics}`);
}
// One verdict line per part, so the gate's reader (a PASS and no FAIL) needs
// both; a FAIL in either is the step's FAIL.
console.log('\n  ' + (n >= 3 ? `PASS — (a) ${n}/4 channels answered the bite as it went in`
  : `FAIL — (a) only ${n}/4 channels answered the bite on the frame it began to fall or the frame it was swallowed (contract: ≥3; the capture frame earns nothing, and nothing another meal shares)`));
console.log('  ' + faceVerdict + '\n');
process.exit(n >= 3 && faceOk ? 0 : 1);
