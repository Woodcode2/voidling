// DOES THE HERO WEAR THE SAME FACE IN EVERY WORLD? — the face-parity probe.
//
//   node qa/faceparity.mjs [port] [worlds...]
//
// Studio round 2 (docs/STUDIO-ROUND-2.md) came back NO-SHIP with one headline:
// the void grins in Powder Pass and does not grin anywhere else, and what
// decides it is how many props the level designer scattered. The hero is the
// single strongest identity asset in this product — same purple, same face, in
// every frame — so it is the one element that must not vary by level, and per
// the board it was the only one that did.
//
// The claim is checkable statically and it holds:
//
//   void3d.ts:1943   const mo = Math.max(<bite envelope>, mp.maw);
//   void3d.ts:1944   mouth.visible = mo < 0.25;          // the open kawaii grin
//   void3d.ts:1166   hungry: { ..., maw: 0.26, ... }     // ONE HUNDREDTH OVER
//
// `hungry` parks the gape at 0.26 — a hundredth above the threshold that hides
// the grin — so for as long as the hero is hungry he has no smile at all, only
// a gape scaled to a quarter, and `mawDark.scale.set(1, 1.15, 1)` makes that
// gape TALLER THAN IT IS WIDE. Two eyes and a small dark vertical oval is not a
// mouth; the board's word for it was "a nostril".
//
// And `hungry` is not a rare state:
//
//   prototype3d.ts:8809   if (d < reach * 0.85) hungryT = tClock;
//   prototype3d.ts:8582   else if (tClock - hungryT < 0.45) mood = 'hungry';
//
// ANY edible inside 85% of the magnet reach re-arms it, and it decays 0.45s
// later. In a dense town that condition is satisfied continuously, so the mood
// never lapses and the grin never returns. In a sparse one it lapses constantly
// and the grin FLICKERS. Neither is a decision anybody made.
//
// ── WHAT THIS MEASURES, AND WHY THAT EXACT PREDICATE ──────────────────────
// `faceState()` returns the MOOD's gape target (mp.maw), not the frame's gape
// (mo). That distinction is the whole instrument. A grin hidden because the
// hero is mid-bite is correct and desirable — you cannot smile and gape at
// once. A grin hidden because the MOOD alone closed it is the defect. So:
//
//   MOOD-HIDDEN   smile === false && maw >= 0.25
//
// isolates exactly the failure and is zero under every mood but `hungry`. No
// screenshot, no eyeballing, no luminance argument that has already fooled this
// project twice.
//
// TRAP, and it cost this probe its first three runs: voidUnlocked is a
// COMMA-JOINED STRING (`unlocks.ts:39` — `raw.split(',')`), not JSON. Seeding
// it with JSON.stringify([...]) parses to `["maple"`, `"pirate"`, … — quotes
// and brackets baked into every entry — so not one of them matches and every
// world but Maple stays locked. Maple looks fine because read() force-adds it,
// which is exactly what makes the bug invisible.
// TRAP: sampling a parked void measures nothing — the mood engine is driven by
// what is in the magnet well, so the probe has to PLAY. It steers with the same
// nearest-edible autopilot the perf probes use.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv.slice(3).length ? process.argv.slice(3) : ['maple', 'pirate', 'gameday', 'lantern', 'powder'];

// THE CONTRACT.
//
// The mood engine may colour an expression. It may not DELETE the hero's
// primary feature for most of a match, and it certainly may not do so in some
// levels and not others. Both numbers are deliberately generous — this is a
// floor under a character, not a tuning target.
const MAX_MOOD_HIDDEN = 0.20;   // at most 20% of a match with the grin closed by mood alone
const MAX_GRIN_SPREAD = 0.35;   // the grin's share may not differ across worlds by more than this

const SAMPLES = 120;            // at 10Hz — twelve seconds of play per world
const SAMPLE_MS = 100;

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const rows = [];
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
  } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  // TRAP, and it cost this probe its first run AND `npm run shoot:store` three
  // of theirs: `?w=<world>` does NOT start a match. It lands on the MENU with
  // #menu flex and full-screen, #tapGate display:none, and matchState().t
  // pinned at 0 forever. The world has to be entered the way a child enters
  // it — press PLAY, then pick the card.
  await p.waitForSelector('#btnPlay', { state: 'visible', timeout: 400000 });
  await p.click('#btnPlay');
  await p.waitForSelector(`#worldRow .wCard[data-world="${wid}"]`, { state: 'visible', timeout: 400000 });
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

  // Steer at the nearest edible we can actually swallow. Rendering stays ON:
  // under swiftshader that costs wall-clock, but the mood engine reads the
  // same state either way and a probe that disables the renderer to go faster
  // is one step from a probe that measures a game nobody is playing.
  await p.evaluate(() => {
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => {
      const vs = window.__voidState();
      let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz;
        if (d < bd) { bd = d; best = { dx, dz }; }
      }
      if (best) {
        const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true }));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const moods = new Map();
  let grin = 0, moodHidden = 0, n = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const s = await p.evaluate(() => window.__faceState());
    n++;
    if (s.smile) grin++;
    if (!s.smile && s.maw >= 0.25) moodHidden++;
    moods.set(s.mood, (moods.get(s.mood) || 0) + 1);
    await p.waitForTimeout(SAMPLE_MS);
  }
  const top = [...moods.entries()].sort((a, c) => c[1] - a[1]).slice(0, 3)
    .map(([m, c]) => `${m} ${Math.round(c / n * 100)}%`).join(', ');
  rows.push({ wid, grin: grin / n, moodHidden: moodHidden / n, top });
  console.log(`  ${wid.padEnd(9)} grin ${(grin / n * 100).toFixed(0).padStart(3)}%   `
    + `mood-hidden ${(moodHidden / n * 100).toFixed(0).padStart(3)}%   [${top}]`);
  await p.close();
}
await b.close();

const fails = [];
for (const r of rows) {
  if (r.moodHidden > MAX_MOOD_HIDDEN) {
    fails.push(`${r.wid}: the mood engine closed the hero's grin for ${(r.moodHidden * 100).toFixed(0)}% `
      + `of the match (bar ${MAX_MOOD_HIDDEN * 100}%) — void3d.ts MOODS.hungry.maw sits above the `
      + `mouth.visible threshold, so there is no smile while food is in the well`);
  }
}
const grins = rows.map(r => r.grin);
const spread = Math.max(...grins) - Math.min(...grins);
if (spread > MAX_GRIN_SPREAD) {
  const hi = rows.find(r => r.grin === Math.max(...grins)), lo = rows.find(r => r.grin === Math.min(...grins));
  fails.push(`the hero wears a different face per world: he grins ${(hi.grin * 100).toFixed(0)}% of the time in `
    + `${hi.wid} and ${(lo.grin * 100).toFixed(0)}% in ${lo.wid} — a spread of ${(spread * 100).toFixed(0)} points `
    + `(bar ${MAX_GRIN_SPREAD * 100}). Prop density is choosing the character's expression`);
}

console.log('');
if (fails.length) {
  for (const f of fails) console.log(`  · ${f}`);
  console.log(`\nFAIL — the hero's face is not the same character in every world (${fails.length} finding(s))`);
  process.exit(1);
}
console.log(`PASS — one face in all ${rows.length} world(s): grin spread ${(spread * 100).toFixed(0)} pts `
  + `(bar ${MAX_GRIN_SPREAD * 100}), worst mood-hidden share `
  + `${(Math.max(...rows.map(r => r.moodHidden)) * 100).toFixed(0)}% (bar ${MAX_MOOD_HIDDEN * 100}%)`);
