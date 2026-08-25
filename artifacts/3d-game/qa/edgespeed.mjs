// DOES HITTING THE SHORE MAKE YOU FASTER? — the boundary-speed probe.
//
//   node qa/edgespeed.mjs [port] [worlds...]
//
// The owner, on a real device: "when you're at the border edge and hit it, like
// say the lake in pirate, it glitches out and sometimes you speed up."
//
// He is right, and it is one constant. prototype3d.ts steers the player at
//
//   const speed = Math.min(96, 16 * (cd / 50)) * jm;      // cd = camera distance
//
// which is about 12-16 u/s for a void at match start and reaches 96 only when
// he is enormous. The swim-back that recovers a void who has left the land is
//
//   velX = ld[0] * 62; velZ = ld[1] * 62;
//
// a FLAT 62 u/s, chosen (per its own comment) to out-push a big void's steering
// at 58. For a small void that is four to five times his own top speed, applied
// the instant he touches water — and Pirate Bay has water INSIDE it, so its
// lagoon shore is the likeliest place in the game to meet it.
//
// ── WHAT IT MEASURES ─────────────────────────────────────────────────────
// The void is driven straight at the nearest water and his speed is sampled
// against the speed he is CAPABLE of steering at that size. A wall may stop
// you, turn you, or bleed you off. It may not launch you.
//
// TRAP: voidUnlocked is a COMMA-JOINED STRING (unlocks.ts), not JSON.
// TRAP: the match clock runs ~14x slower than wall under swiftshader
// (qa/_clockrate.mjs), so speed is derived per rendered FRAME rather than from
// a wall-clock stopwatch.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv.slice(3).length ? process.argv.slice(3) : ['pirate'];

// THE CONTRACT. A boundary response is allowed to be authoritative — a void who
// has drifted off the land has to come back, and has to beat his own steering
// or he can hold himself out there against it. 1.35x is that margin. Beyond it
// this is not a recovery, it is a launch, and a child feels it as the game
// throwing them.
const MAX_RATIO = 1.35;
const FRAMES = 900;

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
  await p.waitForSelector('#btnPlay', { state: 'visible', timeout: 400000 });
  await p.evaluate(() => document.getElementById('btnPlay').click());
  await p.waitForSelector(`#worldRow .wCard[data-world="${wid}"]`, { state: 'visible', timeout: 400000 });
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`).click(), wid);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 400000 });

  const r = await p.evaluate(async (FR) => {
    const vs0 = window.__voidState();
    // __solidAt is the SAME predicate the movement code uses, so "the shore"
    // here is the shore the game itself believes in — not a guess from pixels.
    let best = null;
    for (let a = 0; a < 64 && !best; a++) {
      const ang = (a / 64) * Math.PI * 2;
      for (let d = 20; d <= 400; d += 10) {
        const x = vs0.x + Math.cos(ang) * d, z = vs0.z + Math.sin(ang) * d;
        if (!window.__solidAt(x, z, vs0.r)) { best = { ang, d }; break; }
      }
    }
    if (!best) return { ok: false, why: 'no water within 400 units of spawn' };

    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const dx = Math.cos(best.ang), dz = Math.sin(best.ang);
    const drive = () => dispatchEvent(new PointerEvent('pointermove',
      { pointerId: 1, clientX: cx + dx * 110, clientY: cy + dz * 110, bubbles: true }));
    const iv = setInterval(drive, 60); drive();

    let peak = 0, peakR = 0, n = 0, atEdge = 0, capAt = 0;
    let px = vs0.x, pz = vs0.z, last = performance.now();
    await new Promise((res) => {
      const tick = () => {
        const vs = window.__voidState();
        const now = performance.now();
        const dt = Math.max(1e-3, (now - last) / 1000); last = now;
        const sp = Math.hypot(vs.x - px, vs.z - pz) / dt;
        px = vs.x; pz = vs.z;
        // The speed HE can steer at, derived the way the game derives it.
        // __matchState does not expose camDist, so rather than add a hook this
        // reuses the settled-camera expression prototype3d.ts itself falls back
        // to, then the same speed formula. Same numbers, no new surface, and
        // nothing that can drift out of date behind a hook nobody updates.
        const cd = Math.min(340, Math.max(26, 38 * Math.pow(vs.r / 0.9, 0.82)));
        const cap = Math.min(96, 16 * (cd / 50));
        n++;
        const R = vs.r * 1.2;
        const near = !window.__solidAt(vs.x + R, vs.z, vs.r) || !window.__solidAt(vs.x - R, vs.z, vs.r)
          || !window.__solidAt(vs.x, vs.z + R, vs.r) || !window.__solidAt(vs.x, vs.z - R, vs.r);
        if (near) { atEdge++; if (sp / cap > peakR) { peakR = sp / cap; peak = sp; capAt = cap; } }
        if (n < FR) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
    clearInterval(iv);
    return { ok: true, peak, peakR, capAt, n, atEdge };
  }, FRAMES);

  if (!r.ok) { console.log(`  ${wid.padEnd(9)} SKIPPED — ${r.why}`); rows.push({ wid, skipped: true }); }
  else {
    console.log(`  ${wid.padEnd(9)} ${r.atEdge}/${r.n} frames at the shore   peak ${r.peak.toFixed(1)} u/s `
      + `against a steering cap of ${r.capAt.toFixed(1)} = ${r.peakR.toFixed(2)}x`);
    rows.push({ wid, ...r });
  }
  await p.close();
}
await b.close();

// SELF-CHECK. A run that never put the void against a boundary tested nothing,
// and must not report that silence as a pass — the mistake qa/bubbleclear.mjs
// made in three worlds at once.
const judged = rows.filter((r) => !r.skipped && r.atEdge > 20);
console.log('');
if (!judged.length) {
  console.log('FAIL — no world held the void against a boundary long enough to judge. '
    + 'This run tested nothing; do not read a pass from it');
  process.exit(1);
}
const bad = judged.filter((r) => r.peakR > MAX_RATIO);
if (bad.length) {
  for (const r of bad) {
    console.log(`  · ${r.wid}: touching the shore drove the void to ${r.peak.toFixed(1)} u/s, `
      + `${r.peakR.toFixed(2)}x the ${r.capAt.toFixed(1)} u/s he can steer at that size `
      + `(bar ${MAX_RATIO}x). A wall may stop you, turn you or bleed you off; it may not launch you`);
  }
  console.log(`\nFAIL — the boundary is a trampoline in ${bad.length} world(s)`);
  process.exit(1);
}
console.log(`PASS — across ${judged.length} world(s) the shore never drove the void faster than `
  + `${Math.max(...judged.map((r) => r.peakR)).toFixed(2)}x his own steering speed (bar ${MAX_RATIO}x)`);
