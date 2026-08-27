// DOES THE WALL SPEAK, AND ONLY ON ARRIVAL? — the instrument for TEAM PLAY's
// first commissioned fix.
//
//   node qa/wallcue.mjs [port]
//
// The finding: wall contact was the only place this game punished a
// six-year-old with total silence. The fix fires one soft cue on the
// TRANSITION into contact and then holds its tongue while leaning — because a
// per-second nag would be the ring mistake again. Both halves need a number:
//
//   cues >= 1                        the wall spoke at all
//   cues <= ~2 per match-second      the throttle held (a leaner is not nagged)
//
// It stands the void near the outer coast and holds the stick into the water
// for six seconds of match time. Under that hold, the transition edge should
// fire once on arrival plus at most a handful of re-arms as the stall breaker
// walks him off the shore and he pushes back in.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 320, height: 640 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple&r=4`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 400000 });
await p.evaluate(() => {
  const v = window.__voidState();
  let edge = 0, az = 0;
  for (let a = 0; a < 8; a++) {
    const t = a * Math.PI / 4;
    for (let d = 600; d > 20; d -= 4) {
      if (window.__solidAt(Math.cos(t) * d, Math.sin(t) * d, v.r)) { if (!edge || d < edge) { edge = d; az = t; } break; }
    }
  }
  if (!edge) throw new Error('no coast found — __solidAt has moved');
  window.__warpVoid(Math.cos(az) * (edge - 8), Math.sin(az) * (edge - 8));
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
    clientX: cx + Math.cos(az) * 110, clientY: cy + Math.sin(az) * 110, bubbles: true }));
});
const t0 = await p.evaluate(() => window.__matchState().t);
await p.waitForFunction((t) => (window.__matchState?.().t ?? 0) >= t, t0 + 6, { timeout: 900000, polling: 400 });
const cues = await p.evaluate(() => window.__wallCues());
const t1 = await p.evaluate(() => window.__matchState().t);
await b.close();
const span = t1 - t0;
console.log(`${cues} wall cue(s) over ${span.toFixed(1)}s of match holding into the shore`);
if (cues < 1) { console.log('FAIL — the wall never spoke.'); process.exit(1); }
if (cues > span * 2) { console.log('FAIL — the throttle is broken: that is a nag, not an acknowledgment.'); process.exit(1); }
console.log('PASS — the wall speaks on arrival and then holds its tongue.');
