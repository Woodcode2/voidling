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
// its own swallow — whose cooldowns (hitStop's 0.35 s on dt, the kit's 1.6 s
// on the wall) would decide whether THIS bite's swallow may stop it. 1.0 s is
// 20 frames at dt 0.05: past the slowest drain (13 frames by the drain's rate)
// plus hitStop's cooldown (7). This was an 800 ms wall-clock sleep: under one
// frame at the cost qa/navtap.mjs traced on this box (about one per 2.5 s).
{
  const t = await p.evaluate(() => window.__matchState().tClock);
  await p.waitForFunction((x) => window.__matchState().tClock > x + 1.0, t, { timeout: 600000, polling: 250 });
}

// Row 0 is the capture frame, read in the same task as the bite. Every row
// after it is one animation frame, until the drain lets go of the meal. The
// payoff is read on two of them, each off the mesh rather than off any of the
// game's own constants: the SINK, the first row on which the prop's height has
// left the height it was taken from (the drain rewrites it from dropY every
// frame until the fall begins), and the SWALLOW, the first row that reads it
// let go — the drain writes `eaten` and pays the swallow in the same call.
const out = await p.evaluate(() => new Promise((res) => {
  const E = window.__edibles;
  const was = new Set();
  for (const x of E) if (x.eaten) was.add(x);
  const before = window.__juiceState();
  const ate = window.__eatNearest(0.6);   // >= 0.6 of R = a size-class-up bite
  if (!ate) { res({ before, ate: null }); return; }
  let e = null;
  for (const x of E) if (x.eaten && !was.has(x)) { e = x; break; }
  if (!e) { res({ before, ate, declined: true }); return; }
  const y0 = typeof e.dropY === 'number' ? e.dropY : e.mesh.position.y;
  const rows = [{ ...window.__juiceState(), eaten: true, y: e.mesh.position.y }];
  const tick = () => {
    rows.push({ ...window.__juiceState(), eaten: !!e.eaten, y: e.mesh.position.y });
    if (!e.eaten || rows.length > 400) res({ before, ate, rows, y0, swallowed: !e.eaten });
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}));
// ── (a) UNMEASURED IS NOT (a) PASSED ─────────────────────────────────────
// Before (b) this branch printed a note, no verdict, and exit 0 — which the
// gate reads as silence, and fails. The commit that added (b) printed (b)'s
// verdict here instead, so (b)'s PASS was the only verdict line and the
// gate's reader (a PASS and no FAIL) passed the step with (a) never measured.
// So an unmeasured (a) says FAIL out loud, and (b)'s line is still printed
// for what it is worth.
const inconclusive = !out.ate ? 'no big edible in range at r 4'
  : out.declined ? `capture() declined the r ${out.ate.r.toFixed(2)} prop __eatNearest chose, so nothing went into the drain`
    : !out.swallowed ? `the meal was still in the drain after ${out.rows.length - 1} frames`
      : null;
if (inconclusive) {
  await b.close();
  console.log(`\n  FAIL — (a) inconclusive: ${inconclusive}, so the bite's four channels were not measured`);
  console.log('  ' + faceVerdict + '\n');
  process.exit(1);
}

// A channel answers the bite when it RISES from the frame before to the frame
// the meal starts to fall, or to the frame it is swallowed. Only those two:
// the void keeps eating on its own while this one goes down, and a rise on any
// other frame belongs to some other meal.
const rows = out.rows;
const sinkK = rows.findIndex((r, k) => k > 0 && r.y !== out.y0);
const gulpK = rows.findIndex((r) => !r.eaten);
const payK = [...new Set([sinkK, gulpK])].filter((k) => k > 0);
const rose = (f) => payK.some((k) => f(rows[k], rows[k - 1]));
const ch = {
  lens: rose((r, q) => (r.fov > 32.2 && !(q.fov > 32.2)) || r.fovKick > q.fovKick + 0.5),
  hitstop: rose((r, q) => r.stop > q.stop),
  sparks: rose((r, q) => r.puffs > q.puffs),
  haptics: rose((r, q) => r.buzzes > q.buzzes),
};
const at = rows[0], was = out.before;
const onCapture = [
  (at.fovKick > was.fovKick + 0.5 || (at.fov > 32.2 && !(was.fov > 32.2))) && 'lens',
  at.stop > was.stop && 'hit-stop', at.puffs > was.puffs && 'sparks', at.buzzes > was.buzzes && 'haptics',
].filter(Boolean);
const n = Object.values(ch).filter(Boolean).length;
const last = rows[rows.length - 1];
console.log(`  forced bite r=${out.ate.r.toFixed(2)} on R=${out.ate.R.toFixed(2)}: began to fall on frame `
  + `${sinkK > 0 ? sinkK : 'never'}, swallowed on frame ${gulpK} after the capture`);
console.log(`  on the capture frame (not credited): ${onCapture.join(' ') || 'nothing'}`);
console.log(`  on the payoff: lens=${ch.lens}  hitstop=${ch.hitstop} (${last.stop.toFixed(3)}s on the swallow frame)  `
  + `sparks=${ch.sparks} (${last.puffs} live)  haptics=${ch.haptics}`);
await b.close();
// One verdict line per part, so the gate's reader (a PASS and no FAIL) needs
// both; a FAIL in either is the step's FAIL.
console.log('\n  ' + (n >= 3 ? `PASS — (a) ${n}/4 channels answered the bite as it went in`
  : `FAIL — (a) only ${n}/4 channels answered the bite on the frame it began to fall or the frame it was swallowed (contract: ≥3; the capture frame earns nothing)`));
console.log('  ' + faceVerdict + '\n');
process.exit(n >= 3 && faceOk ? 0 : 1);
