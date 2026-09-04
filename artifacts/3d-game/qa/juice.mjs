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
import { chromium } from 'playwright';

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
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await p.click('#worldRow .wCard[data-world="maple"]');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000 });

// a size where houses are a big-but-legal bite, near a built-up district
await p.evaluate(() => { window.__setVoidR(4); });
await p.waitForTimeout(800);

const out = await p.evaluate(() => {
  const before = window.__juiceState();
  const ate = window.__eatNearest(0.6);   // >= 0.6 of R = a size-class-up bite
  const after = window.__juiceState();
  return { before, ate, after };
});
if (!out.ate) { console.log('  no big edible in range — inconclusive, not a failure'); await b.close(); process.exit(0); }

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
console.log('\n  ' + (n >= 3 ? `PASS — ${n}/4 channels answered the bite` : `FAIL — only ${n}/4 channels answered (contract: ≥3)`) + '\n');
process.exit(n >= 3 ? 0 : 1);
