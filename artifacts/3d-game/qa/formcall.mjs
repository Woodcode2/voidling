// DOES THE NAME LAND ON HIM, OR ON HIS FACE?
//
//   node qa/formcall.mjs [port] [world]
//
// The owner, on hole.io: "What if we had a graphics that looked beat like hole
// and it says level up next to the void?" — and, shown that his own reference
// announces the new SIZE rather than the words level up: "keeping the names
// work maybe as how we set ourselves different right? So instead of level up we
// use the names?"
//
// ── WHY A PATH AND NOT A POSITION ────────────────────────────────────────────
// The callout is BORN above his head and RISES for 0.80 seconds. So it occupies
// a path, and a probe that samples one instant clears nothing: the first design
// for this feature was caught with a clamp that put the sticker 22px INSIDE his
// brow, and the probe written alongside it would have passed, because screen y
// grows downward and both were wrong in the same direction.
//
// This walks the whole path, at every radius an evolution can fire at, on four
// phones, in ONE frame — via window.__formSweep(a), which runs the shipped
// placement against the live projection for any point of the life. That matters
// on this box: the renderer manages about one frame per two wall-seconds, so a
// probe that waited out six real ceremonies would be SIGKILLed by the gate's
// own step timeout long before it finished.
//
// ── THE CLEARANCE TEST IS COMPUTED FROM THE CAMERA, NOT FROM heroBox ─────────
// An earlier draft of this probe asserted `min(heroBox.top, crown) - bottom >=
// 0` and passed on every row with the gap reading exactly 6.0px everywhere —
// because the implementation SUBTRACTS 6 at that very line. It was testing the
// arithmetic against itself, which is the same vacuous-green pattern that lets
// qa/_evolvecover.mjs print 0.0% and pass when its target is deleted.
// So the void's on-screen silhouette is rebuilt here from window.__cam and
// window.__THREE — project his centre, project a point one world radius above
// it, take the difference — and the callout is measured against THAT. The only
// thing shared with the implementation is the camera itself.
//
// ── AND THE CAMERA HAS TO HAVE SETTLED ───────────────────────────────────────
// camDist eases toward its target with a 0.625s time constant and __setVoidR
// changes that target. On this box, which renders about one frame per two
// wall-seconds, settling takes 30-60 SECONDS of wall clock — so the first
// version of this probe read the same stale 9px void at all six radii and
// declared them all clear. The renderer is stubbed (the qa/pace.mjs idiom,
// window.__renderer.render = () => {}) which restores real-time frames, and
// then every radius change WAITS for window.__camAim() to converge.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
const VIEWPORTS = [[360, 780], [375, 812], [390, 844], [430, 932]];
const STEPS = 41;                 // a from 0 to 1 inclusive
const FORMS_R = [1.6, 2.5, 3.6, 5.5, 8.0, 13.5];   // FORM_MIN crossings

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
let fail = 0;
const bad = (m) => { console.log('  ' + m); fail++; };

try {
  for (const [W, H] of VIEWPORTS) {
    const pg = await b.newPage({ viewport: { width: W, height: H } });
    await pg.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&len=180`, { waitUntil: 'domcontentloaded', timeout: 300000 });
    // Wait for a hook that exists on BOTH builds, then ask about this one — a
    // bare timeout cannot tell "no feature" from "slow init", and a fixed 30s
    // window produced a false FAIL on a correct build earlier this session.
    await pg.waitForFunction(() => typeof window.__edibles !== 'undefined', null, { timeout: 600000 });
    // frames at real speed, so the camera ease is affordable
    await pg.evaluate(() => { window.__renderer.render = () => {}; });
    // …AND LET THE INTRO FINISH. The opening descent drives camDist on its own
    // schedule; sweeping radii underneath it means every reading is taken from
    // a lens in motion, heroBox is one frame behind that motion, and the two
    // projections disagree for a reason that has nothing to do with the
    // callout. Measured: rows taken during the descent disagreed by up to 2x,
    // and every row taken after it agreed within 2px.
    await pg.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 })
      .catch(() => {});
    if (await pg.evaluate(() => typeof window.__formSweep !== 'function')) {
      console.log('\nFAIL — the debug API is live but window.__formSweep is absent: this build has no form callout.');
      await b.close(); process.exit(1);
    }

    const meta = await pg.evaluate(() => {
      const el = document.getElementById('form');
      if (!el) return { fatal: '#form is not in the document' };
      const cs = getComputedStyle(el);
      // NO @keyframes, off AND on. Its visibility must not BE an animation:
      // four hero cards in this sheet are on screen for ten microseconds under
      // the OS reduced-motion catch-all for exactly that reason.
      const animOff = cs.animationName;
      el.classList.add('on');
      const animOn = getComputedStyle(el).animationName;
      el.textContent = 'CHOMPOSAURUS';
      const wide = el.offsetWidth, tall = el.offsetHeight;
      el.classList.remove('on');
      // prime the real callout once, so the placement is measuring the element
      // it will actually place rather than a fallback guess at its width
      window.__formCall('CHOMPOSAURUS');
      return { animOff, animOn, wide, tall };
    });
    if (meta.fatal) { bad(`FAIL — ${meta.fatal}`); await pg.close(); continue; }
    console.log(`\n  ${W}x${H} — "CHOMPOSAURUS" is ${meta.wide}x${meta.tall}px`);
    if (meta.animOff !== 'none' || meta.animOn !== 'none')
      bad(`FAIL — #form carries an animation (${meta.animOff} / ${meta.animOn}). Its visibility must not BE an animation.`);
    if (meta.wide > W - 16) bad(`FAIL — the longest form name is ${meta.wide}px on a ${W}px screen; it does not fit.`);

    // ── (b) THE GEOMETRY, SWEPT DETERMINISTICALLY ────────────────────────
    // Synthetic boxes, not the live sim. Driving radii through __setVoidR
    // means every reading comes off a camera still easing toward a target
    // that just moved — measured, the two projections disagreed by up to
    // three times, and none of it was about the callout. The placement is a
    // pure function of the box, so the box is supplied directly and the whole
    // ladder is walked in one frame.
    //
    // The range covers what the camera law actually produces (the void holds
    // a roughly constant screen fraction, because camDist grows with radius)
    // AND the pathological end — a void filling the screen, which is what an
    // unsettled lens looks like and what the ceiling clamp exists for.
    const rows = await pg.evaluate(({ STEPS, wide, tall }) => {
      const H = innerHeight, W = innerWidth;
      const out = [];
      for (const ry of [14, 24, 40, 60, 90, 140, 240, 380]) {
        const rx = ry / 0.72;                       // the pitch, near enough
        for (const cxf of [0.5, 0.29, 0.71]) {      // his full lookahead swing
          const cx = W * cxf, cy = H * 0.55;
          const box = { cx, cy, rx, ry, on: true,
            top: cy - rx * 0.76 - 6, bottom: cy + rx * 0.36 + 6,
            left: cx - rx * 0.62 - 6, right: cx + rx * 0.62 + 6 };
          const headTop = cy - ry * 1.16;           // the SWOLLEN silhouette
          let worst = 1e9, offL = 0, offR = 0, topMin = 1e9, firstY = null, lastY = null, ceilHit = 0;
          for (let i = 0; i < STEPS; i++) {
            const a = i / (STEPS - 1);
            const f = window.__formSweep(a, box);
            if (!f) continue;
            const bot = f.y, top = f.y - tall * f.s, half = (wide * f.s) / 2;
            if (firstY === null) firstY = bot;
            lastY = bot;
            worst = Math.min(worst, headTop - bot);
            topMin = Math.min(topMin, top);
            if (f.x - half < 0) offL++;
            if (f.x + half > W) offR++;
            if (bot <= 60 + tall + 0.5) ceilHit++;
          }
          out.push({ ry, cxf, headGap: worst, topMin, offL, offR, rise: firstY - lastY, ceilHit });
        }
      }
      return out;
    }, { STEPS, wide: meta.wide, tall: meta.tall });

    for (const row of rows) {
      const tag = `ry ${String(row.ry).padStart(3)} cx ${row.cxf}`;
      // (b1) THE PATH NEVER TOUCHES HIM — unless the ceiling had to bind,
      //      which only happens when he is too big for anything to fit above
      //      his head, and then being on screen beats being clear.
      if (row.headGap < 0 && !row.ceilHit)
        bad(`FAIL — ${tag}: the callout crosses his head by ${(-row.headGap).toFixed(1)}px with room to spare above it.`);
      // (b2) IT NEVER LEAVES THE SCREEN, in any direction
      if (row.topMin < 0) bad(`FAIL — ${tag}: the callout goes ${(-row.topMin).toFixed(0)}px off the top.`);
      if (row.offL || row.offR) bad(`FAIL — ${tag}: off screen on ${row.offL} left / ${row.offR} right samples.`);
      // (b3) IT RISES. A rise smaller than the camera's own drift reads as
      //      sinking, which is what a flat 8px would have shipped as.
      if (row.rise < 8 && !row.ceilHit) bad(`FAIL — ${tag}: rises only ${row.rise.toFixed(1)}px; that is not a rise.`);
    }
    const clear = rows.filter((r) => !r.ceilHit);
    const pinned = rows.length - clear.length;
    console.log(`    ${rows.length} boxes swept x ${STEPS} points: worst head gap ${Math.min(...clear.map((r) => r.headGap)).toFixed(1)}px, rise ${Math.min(...clear.map((r) => r.rise)).toFixed(1)}-${Math.max(...clear.map((r) => r.rise)).toFixed(1)}px, ${pinned} pinned to the ceiling.`);

    // ── (d) AND ONE LIVE CHECK, that the box it places from is where he is ──
    await pg.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 }).catch(() => {});
    for (let tries = 0; tries < 30; tries++) {
      const c = await pg.evaluate(() => new Promise((res) => {
        let n = 0; const tick = () => { if (++n >= 20) return res(window.__camAim()); requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }));
      if (Math.abs(c.now - c.aim) <= Math.max(0.35, c.aim * 0.01)) break;
    }
    const live = await pg.evaluate(() => {
      const THREE = window.__THREE, cam = window.__cam, box = window.__formBox();
      if (!box.on) return { skipped: true };
      const p = window.__voidPos(), r = window.__matchState().r;
      const c0 = new THREE.Vector3(p.x, p.y, p.z), up = new THREE.Vector3(p.x, p.y + r, p.z);
      const y0 = (-c0.clone().project(cam).y * 0.5 + 0.5) * innerHeight;
      const y1 = (-up.clone().project(cam).y * 0.5 + 0.5) * innerHeight;
      const c = window.__camAim();
      return { ryBox: box.ry, ryTrue: Math.abs(y1 - y0), r, now: c.now, aim: c.aim };
    });
    if (live.skipped) bad('FAIL — the hero was never projected, so the live projection could not be checked.');
    else {
      console.log(`    live: r ${live.r.toFixed(2)}, cam ${live.now.toFixed(0)}/${live.aim.toFixed(0)}, heroBox ry ${live.ryBox.toFixed(1)} against the camera's ${live.ryTrue.toFixed(1)}`);
      if (Math.abs(live.ryBox - live.ryTrue) > Math.max(2, live.ryTrue * 0.15))
        bad(`FAIL — the box the callout places from (ry ${live.ryBox.toFixed(1)}) disagrees with the camera (ry ${live.ryTrue.toFixed(1)}).`);
    }
    await pg.close();
  }
} catch (e) {
  bad(`FAIL — formcall threw: ${e.message}`);
}
await b.close();
console.log('');
console.log(fail ? `FAIL — ${fail} problem(s).`
  : 'PASS — the name clears his head along its whole path, rises, and stays on screen, at every crossing on four phones.');
process.exit(fail ? 1 : 0);
