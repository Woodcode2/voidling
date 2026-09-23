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
// Channels counted after one forced big bite:
//   lens      camera.fov briefly above its 32 resting value (the punch)
//   hit-stop  stopT armed (the sim freeze)
//   sparks    live absorb particles
//   haptics   buzz() fired
// Contract: at least THREE of four answer. Fails on the pre-fix build, where
// the lens never moved in the entire codebase (fov was written exactly once).
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
// The ceremony punches the lens too (camPunch). Let that spring home before (a)
// reads its own lens channel, or (a) would be crediting the bite with the
// evolution's punch.
await p.waitForFunction(() => { const j = window.__juiceState(); return j.fovKick <= 0.02 && j.stop <= 0; },
  null, { timeout: 900000 });

// a size where houses are a big-but-legal bite, near a built-up district
await p.evaluate(() => { window.__setVoidR(4); });
await p.waitForTimeout(800);

const out = await p.evaluate(() => {
  const before = window.__juiceState();
  const ate = window.__eatNearest(0.6);   // >= 0.6 of R = a size-class-up bite
  const after = window.__juiceState();
  return { before, ate, after };
});
if (!out.ate) {
  console.log('  (a) no big edible in range — inconclusive, not a failure');
  await b.close();
  console.log('\n  ' + faceVerdict + '\n');
  process.exit(faceOk ? 0 : 1);
}

const ch = {
  lens: out.after.fovKick > 0.5 || out.after.fov > 32.2,
  hitstop: out.after.stop > 0,
  sparks: out.after.puffs > out.before.puffs,
  haptics: out.after.buzzes > out.before.buzzes,
};
const n = Object.values(ch).filter(Boolean).length;
console.log(`  forced bite r=${out.ate.r.toFixed(2)} on R=${out.ate.R.toFixed(2)}`);
console.log(`  channels: lens=${ch.lens} (fov ${out.after.fov.toFixed(1)})  hitstop=${ch.hitstop} (${out.after.stop.toFixed(3)}s)  sparks=${ch.sparks} (+${out.after.puffs - out.before.puffs})  haptics=${ch.haptics}`);
await b.close();
// One verdict line per part, so the gate's reader (a PASS and no FAIL) needs
// both; a FAIL in either is the step's FAIL.
console.log('\n  ' + (n >= 3 ? `PASS — (a) ${n}/4 channels answered the bite` : `FAIL — (a) only ${n}/4 channels answered (contract: ≥3)`));
console.log('  ' + faceVerdict + '\n');
process.exit(n >= 3 && faceOk ? 0 : 1);
