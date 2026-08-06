// CODE-HEALTH: how much CPU the per-frame O(n) sweeps over `edibles` cost.
// animate() walks the WHOLE prop list every frame twice (the eat/magnet pass
// and the shake-decay pass) and refreshHud() walks it a third time at 5 Hz.
// There is no broad phase. Replicate each loop verbatim against the live
// __edibles array and time it, so the cost is a measured number rather than
// an opinion. Pure JS — the software renderer does not distort it.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const WORLDS = (process.argv[2] || 'maple,gameday').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const W of WORLDS) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  const p = await ctx.newPage();
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  const r = await p.evaluate(() => {
    const es = window.__edibles, s = window.__voidState();
    const R = s.r, REP = 200;
    let sink = 0;
    // 1. the eat / magnet pass (prototype3d.ts ~4373)
    let t0 = performance.now();
    for (let k = 0; k < REP; k++) for (const e of es) {
      if (e.eaten) { sink++; continue; }
      if (!e.mesh.visible || e.mesh.userData.eaten) continue;
      const dx = e.mesh.position.x - s.x, dz = e.mesh.position.z - s.z;
      const d = Math.hypot(dx, dz);
      const reach = R * 2.0 + e.radius * 2.4;
      if (d < reach && e.radius < 2.5) sink++;
    }
    const eat = (performance.now() - t0) / REP;
    // 2. the shake-decay pass (prototype3d.ts ~4426)
    t0 = performance.now();
    for (let k = 0; k < REP; k++) for (const e of es) {
      const ud = e.mesh.userData; if (ud.shakeT > 0) sink++;
    }
    const shake = (performance.now() - t0) / REP;
    // 3. refreshHud's devoured tally (prototype3d.ts ~1915), 5 Hz
    t0 = performance.now();
    for (let k = 0; k < REP; k++) { let c = 0, tt = 0, m = 0;
      for (const e of es) { tt++; if (e.eaten || !e.mesh.visible) { c++; if (e.mesh.userData.byPlayer) m++; } }
      sink += c + tt + m; }
    const hud = (performance.now() - t0) / REP;
    // 4. the size-gate pass (prototype3d.ts ~4199), 2.5 Hz
    const reach = R * 26 + 40;
    t0 = performance.now();
    for (let k = 0; k < REP; k++) for (const e of es) {
      if (e.eaten || !e.mesh.visible) continue;
      const dx = e.mesh.position.x - s.x, dz = e.mesh.position.z - s.z;
      if (dx * dx + dz * dz > reach * reach) continue;
      if ((e.radius > R * 1.11) === e.mesh.userData.gated) continue;
      sink++;
    }
    const gate = (performance.now() - t0) / REP;
    return { n: es.length, eat: +eat.toFixed(3), shake: +shake.toFixed(3),
      hud: +hud.toFixed(3), gate: +gate.toFixed(3), sink };
  });
  const perFrame = r.eat + r.shake;
  const perSec = perFrame * 60 + r.hud * 5 + r.gate * 2.5;
  console.log(`${W.padEnd(8)} props=${String(r.n).padStart(5)}  eatPass=${r.eat}ms  shakePass=${r.shake}ms  `
    + `hudTally=${r.hud}ms(5Hz)  gatePass=${r.gate}ms(2.5Hz)`);
  console.log(`         => ${perFrame.toFixed(2)} ms of list-walking EVERY FRAME `
    + `(${(perFrame / 16.67 * 100).toFixed(1)}% of a 60fps budget on THIS machine), `
    + `${perSec.toFixed(1)} ms/s total`);
  await ctx.close();
}
await b.close();
