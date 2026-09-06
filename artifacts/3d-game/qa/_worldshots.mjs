// GRAPHICS-WORLDS: shoot every world at spawn / mid / late, at PHONE SIZE.
//
//   node qa/_worldshots.mjs [worlds] [port]
//
// 430x932 DPR3 = 1290x2796, an iPhone 14 Pro Max frame. The void is driven the
// way pace.mjs drives it (nearest edible), so the mid and late frames are a
// real playthrough state and not a warped-in fake.
//
// THE RENDERER IS STUBBED BETWEEN SHOTS. The software renderer runs the sim at
// 1/9-1/40 real time; with `render` a no-op the clock runs at its proper rate.
// It is restored, given a few frames to compose, shot, and stubbed again.
import { chromium } from 'playwright';
import fs from 'node:fs';
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
const PORT = process.argv[3] || '4177';
const MARKS = [{ t: 5, tag: 'spawn' }, { t: 88, tag: 'mid' }, { t: 163, tag: 'late' }];
fs.mkdirSync('qa-out/gw', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  // 430x932 at DPR3 is 3.6M pixels through swiftshader; the 30s default is not
  // enough to compose one, and the first run died on the very first shot.
  p.setDefaultTimeout(400000);
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

  await p.evaluate(() => {
    window.__RR = window.__renderer.render.bind(window.__renderer);
    window.__stub = () => { window.__renderer.render = () => {}; };
    window.__unstub = () => { window.__renderer.render = window.__RR; };
    // drive at the nearest edible, exactly as pace.mjs does
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => {
      const vs = window.__voidState(); let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
      }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  console.log(`\n══ ${wid.toUpperCase()} ══`);
  for (const m of MARKS) {
    await p.evaluate(() => window.__stub());
    await p.waitForFunction(t => (window.__matchState?.().t ?? 0) > t, m.t, { timeout: 900000 });
    await p.evaluate(() => window.__unstub());
    await p.waitForTimeout(1400);           // let a few real frames compose
    await p.screenshot({ path: `qa-out/gw/${wid}-${m.tag}.png` });
    const st = await p.evaluate(() => {
      const ms = window.__matchState(), vs = window.__voidState();
      let alive = 0; for (const e of window.__edibles) if (!e.eaten && e.mesh?.visible) alive++;
      const i = window.__renderer.info;
      return { t: +ms.t.toFixed(1), r: +vs.r.toFixed(2), score: Math.round(ms.score), alive,
        calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, texs: i.memory.textures,
        fog: window.__scene.fog ? { c: '#' + window.__scene.fog.color.getHexString(),
          near: window.__scene.fog.near, far: window.__scene.fog.far } : null,
        bg: window.__scene.background?.isColor ? '#' + window.__scene.background.getHexString() : String(window.__scene.background?.type || null) };
    });
    console.log(`  ${m.tag.padEnd(5)} t=${String(st.t).padStart(5)} r=${String(st.r).padStart(6)} score=${String(st.score).padStart(6)} edibles=${String(st.alive).padStart(5)} calls=${String(st.calls).padStart(4)} tris=${String(st.tris).padStart(8)} geos=${st.geos} tex=${st.texs} bg=${st.bg} fog=${JSON.stringify(st.fog)}`);
  }
  await p.close();
}
await b.close();
console.log('\nwrote qa-out/gw/*.png');
