// DO SPEECH BUBBLES GET DRAWN OVER THE HERO'S FACE? — the mascot-clear probe.
//
//   node qa/bubbleclear.mjs [port] [worlds...]
//
// bubbles.ts is careful about almost everything. It de-collides bubbles against
// each other by rendered box (:222), refuses the top HUD strip (:386), dodges
// named HUD panels by their real rect (:396), dodges the full-bleed hero-message
// bands (:402), and hides a bubble outright rather than let one sit on another
// (:418). Every one of those was added after a screenshot caught something.
//
// The void himself is on none of those lists, because every entry is a DOM id
// (HUD_AVOID, HUD_BANDS at :73 and :76) and the hero is a 3D object. So the one
// thing on screen that must never be covered is the only thing with no rule
// protecting it — and the crowd nearest the void is exactly the crowd most
// likely to be talking, so the bubbles that spawn are the ones anchored closest
// to him.
//
// Caught in store/03-devouring.png, shot for the App Store: two ambient lines
// over the hero, one straight across his chin.
//
// ── WHAT IT MEASURES ─────────────────────────────────────────────────────
// Per frame, the hero's projected screen disc against every VISIBLE bubble's
// rect, and reports the share of sampled frames in which any bubble covers his
// FACE — not his whole disc. A bubble clipping the bottom of a ten-metre void
// is fine and unavoidable; one across his eyes and mouth is the defect. The
// face sits in the upper-middle of the disc and is roughly 62% of its width
// (void3d.ts builds the features inside a unit-sphere face), so that is the
// rectangle under test.
//
// TRAP: voidUnlocked is a COMMA-JOINED STRING (unlocks.ts:39), not JSON.
// TRAP: a parked void is not representative — the crowd only talks near the
// player, so the probe drives with the same nearest-edible autopilot the perf
// probes use.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv.slice(3).length ? process.argv.slice(3) : ['maple', 'gameday', 'lantern'];

// THE BAR. Not zero: a bubble may legitimately be mid-fade as the hero moves
// under it, and a rule that forbids a single overlapping frame would forbid
// motion. But this is the mascot, and the number that matters is how often a
// child looking at their own character sees words on his face.
const MAX_FACE_COVER = 0.03;   // at most 3% of frames

// ── SAMPLE THE MATCH CLOCK, NOT THE WALL CLOCK ───────────────────────────
// The first version of this probe sampled 90 times at 120ms and reported
// "bubbles up 0% of frames" in all three worlds — a PASS on no data, which is
// the exact failure this repo already retracted once ("a probe that passes on
// no data is worse than no probe") and which I then wrote again.
//
// Measured with qa/_clockrate.mjs: under swiftshader the match clock advances
// 14.3x SLOWER than wall time, because dt is clamped per frame and the software
// renderer only manages a frame or two a second. So 11 seconds of wall clock is
// about 0.8 seconds of match — still inside the opening calm hold (life.ts sets
// calmT so the town can introduce itself before anybody panics). The crowd had
// not started talking yet. In a further 15 s of wall time the same page showed
// 192 bubble-frames, so there was never any shortage of them to measure.
const START_AT = 8;      // match seconds — past the calm hold
const SPAN = 12;         // match seconds to sample across
const SAMPLE_MS = 150;   // wall
// A run that never sees a bubble has not tested anything. Say so instead of
// passing.
const MIN_BUBBLE_FRAMES = 12;
// ── AND SAMPLE THE SIZE WHERE IT ACTUALLY COLLIDES ───────────────────────
// The first honest run of this probe reported 0% face coverage in all three
// worlds — while store/03-devouring.png, shot at radius 3.4, has an ambient
// line straight across the hero's chin. Both are true. A void a metre across
// occupies a small disc and a bubble anchored to a nearby NPC clears it easily;
// the same bubble at COLOSSUS covers his face, because the disc grew and the
// anchor did not move. Overlap risk is a function of screen radius, and playing
// from the start only ever samples the smallest one.
//
// So each world is measured twice: as it plays, and again pinned at a size a
// child reaches in the back half of every match.
const BIG_R = 7;

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

/** One sample: the hero's projected face and disc against every VISIBLE bubble.
 *  Declared once and reused by both sampling windows — it was inlined in the
 *  loop, and adding the second window duplicated it. */
const SAMPLE_FN = () => {
      const THREE = window.__THREE, cam = window.__cam;
      const g = window.__voidGroup?.();
      if (!g || !cam) return null;
      const vs = window.__voidState();
      const c = new THREE.Vector3(); g.getWorldPosition(c);
      const p0 = c.clone().project(cam);
      const cx = (p0.x * 0.5 + 0.5) * innerWidth, cy = (-p0.y * 0.5 + 0.5) * innerHeight;
      // screen radius, measured rather than guessed: project a point one world
      // radius to the camera's right and take the pixel distance.
      const right = new THREE.Vector3(); cam.getWorldDirection(right);
      right.cross(cam.up).normalize().multiplyScalar(vs.r);
      const p1 = c.clone().add(right).project(cam);
      const rx = Math.abs((p1.x * 0.5 + 0.5) * innerWidth - cx) || 1;
      // the FACE, not the whole ball: features live in the upper-middle of the
      // disc. 0.62 of the width, and the band from 12% to 68% of its height.
      const face = { left: cx - rx * 0.62, right: cx + rx * 0.62,
        top: cy - rx * 0.76, bottom: cy + rx * 0.36 };
      const disc = { left: cx - rx, right: cx + rx, top: cy - rx, bottom: cy + rx };
      const over = (a, r) => {
        const w = Math.min(a.right, r.right) - Math.max(a.left, r.left);
        const h = Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top);
        return w > 0 && h > 0 ? (w * h) / Math.max(1, (a.right - a.left) * (a.bottom - a.top)) : 0;
      };
      let bubbles = 0, faceCover = 0, discCover = 0, text = '';
      for (const el of document.querySelectorAll('.vb')) {
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.15) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2) continue;
        bubbles++;
        const f = over(face, r);
        if (f > faceCover) { faceCover = f; text = (el.textContent || '').trim().slice(0, 44); }
        discCover = Math.max(discCover, over(disc, r));
      }
      return { bubbles, faceCover, discCover, text };
    };

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
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

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

  await p.waitForFunction((t) => (window.__matchState?.().t ?? 0) > t, START_AT,
    { timeout: 900000, polling: 250 });
  const until = await p.evaluate(() => window.__matchState().t) + SPAN;
  let n = 0, anyBubble = 0, faceHit = 0, discHit = 0, worst = 0, worstText = '';
  for (;;) {
    if (await p.evaluate(() => window.__matchState().t) >= until) break;
    const s = await p.evaluate(SAMPLE_FN);
    if (s) {
      n++;
      if (s.bubbles) anyBubble++;
      if (s.faceCover > 0.02) faceHit++;
      if (s.discCover > 0.02) discHit++;
      if (s.faceCover > worst) { worst = s.faceCover; worstText = s.text; }
    }
    await p.waitForTimeout(SAMPLE_MS);
  }
  console.log(`  ${wid.padEnd(9)} small  bubbles up ${(anyBubble / n * 100).toFixed(0).padStart(3)}%   `
    + `FACE ${(faceHit / n * 100).toFixed(0).padStart(3)}%   disc ${(discHit / n * 100).toFixed(0).padStart(3)}%   `
    + `worst ${(worst * 100).toFixed(0)}%${worstText ? ` ("${worstText}")` : ''}`);

  // …and again at the size where the disc is big enough to be in the way
  await p.evaluate((r) => window.__setVoidR(r), BIG_R);
  await p.waitForTimeout(1200);
  const until2 = await p.evaluate(() => window.__matchState().t) + SPAN;
  let n2 = 0, any2 = 0, face2 = 0, disc2 = 0, worst2 = 0, worstText2 = '';
  for (;;) {
    if (await p.evaluate(() => window.__matchState().t) >= until2) break;
    const s = await p.evaluate(SAMPLE_FN);
    if (s) {
      n2++;
      if (s.bubbles) any2++;
      if (s.faceCover > 0.02) face2++;
      if (s.discCover > 0.02) disc2++;
      if (s.faceCover > worst2) { worst2 = s.faceCover; worstText2 = s.text; }
    }
    await p.waitForTimeout(SAMPLE_MS);
  }
  console.log(`  ${wid.padEnd(9)} r=${BIG_R}    bubbles up ${(any2 / Math.max(1, n2) * 100).toFixed(0).padStart(3)}%   `
    + `FACE ${(face2 / Math.max(1, n2) * 100).toFixed(0).padStart(3)}%   disc ${(disc2 / Math.max(1, n2) * 100).toFixed(0).padStart(3)}%   `
    + `worst ${(worst2 * 100).toFixed(0)}%${worstText2 ? ` ("${worstText2}")` : ''}`);

  // the gate reads the WORST of the two sizes: a hero covered only when he is
  // big is still a hero covered, and big is most of the back half of a match.
  const pick = (face2 / Math.max(1, n2)) > (faceHit / n)
    ? { n: n2, anyBubble: any2, faceHit: face2, discHit: disc2, worst: worst2, worstText: worstText2, at: `r=${BIG_R}` }
    : { n, anyBubble, faceHit, discHit, worst, worstText, at: 'as played' };
  rows.push({ wid, ...pick, anyBubble: anyBubble + any2 });
  await p.close();
}
await b.close();

console.log('');
// SELF-CHECK FIRST. This probe cannot say anything about a world it never saw a
// bubble in, and it must never report that silence as a clean result.
const blind = rows.filter((r) => r.anyBubble < MIN_BUBBLE_FRAMES);
if (blind.length) {
  for (const r of blind) {
    console.log(`  · ${r.wid}: only ${r.anyBubble} of ${r.n} sampled frames had any bubble on screen `
      + `(need ${MIN_BUBBLE_FRAMES}). This run never reached the state it exists to test — `
      + `do not read anything from it`);
  }
  console.log(`\nFAIL — ${blind.length} world(s) produced no data`);
  process.exit(1);
}
const fails = rows.filter((r) => r.faceHit / r.n > MAX_FACE_COVER);
if (fails.length) {
  for (const r of fails) {
    console.log(`  · ${r.wid}: a speech bubble covered the hero's FACE in `
      + `${(r.faceHit / r.n * 100).toFixed(0)}% of frames (bar ${MAX_FACE_COVER * 100}%), `
      + `worst ${(r.worst * 100).toFixed(0)}% of the face behind "${r.worstText}". `
      + `bubbles.ts dodges HUD panels and other bubbles by rect but has no rule for the void — `
      + `HUD_AVOID and HUD_BANDS are DOM ids and he is a 3D object`);
  }
  console.log(`\nFAIL — the mascot is not clear of the chatter (${fails.length} world(s))`);
  process.exit(1);
}
console.log(`PASS — across ${rows.length} world(s) no world covered the hero's face in more than `
  + `${MAX_FACE_COVER * 100}% of frames (worst `
  + `${Math.max(...rows.map((r) => r.faceHit / r.n * 100)).toFixed(0)}%)`);
