// DOES EVERY WORLD HAVE A CLIMAX, AND DOES IT FIRE IN THE LAST QUARTER?
//
// Each world names a hero landmark: the biggest edible on the map, announced
// when it comes into reach and celebrated when it goes. Maple Falls had none,
// on the recorded grounds that its 6.5 town hall "comes into range halfway
// through, so a cue there would be noise". The cue gate is
// `heroProp.radius <= voidling.radius * EAT_RATIO` with EAT_RATIO 1.11, so a
// 6.5 hall needs r >= 5.86 — which Maple reaches at about t=132s of 180.
//
// This drives a real match with the pace autopilot and records WHEN the cue
// actually fires, so the claim is a number rather than an argument. A finale
// that fires before halfway is noise; one that never fires is not a finale.
import { chromium } from 'playwright';
const worlds = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const PORT = process.argv[3] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [];
for (const wid of worlds) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1000);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2, null, { timeout: 600000 });

  await p.evaluate(() => {
    window.__renderer.render = () => {};
    window.__fin = { cue: null, gone: null, cueText: '', goneText: '' };
    // The banner is the only place these two beats appear, so watch it rather
    // than reaching into game state — this is what a child would see.
    const bn = document.getElementById('banner');
    new MutationObserver(() => {
      const t = (bn.textContent || '').trim();
      const now = window.__matchState().t;
      if (/IN REACH/i.test(t) && window.__fin.cue === null) { window.__fin.cue = now; window.__fin.cueText = t; }
      if (/ADJOURNED|IS GONE|ALL FIVE STARS/i.test(t) && window.__fin.gone === null) { window.__fin.gone = now; window.__fin.goneText = t; }
    }).observe(bn, { childList: true, characterData: true, subtree: true });

    // the same autopilot pace.mjs uses, steering through the camera basis
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
      if (best) {
        const cam = window.__cam;
        let fx = vs.x - cam.position.x, fz = vs.z - cam.position.z;
        const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
        const rx = -fz, rz = fx;
        const m = Math.hypot(best.dx, best.dz) || 1;
        const wx = best.dx / m, wz = best.dz / m;
        const sx = -fz * wx + fx * wz, sy = -rz * wx + rx * wz;
        const sm = Math.hypot(sx, sy) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + sx / sm * 110, clientY: cy + sy / sm * 110, bubbles: true }));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 900000 });
  const f = await p.evaluate(() => window.__fin);
  const pct = f.cue === null ? null : (f.cue / 180) * 100;
  const ok = f.cue !== null && pct > 50;
  rows.push(`${ok ? 'PASS' : 'FAIL'}  ${wid.padEnd(8)} cue at `
    + `${f.cue === null ? 'NEVER' : `${f.cue.toFixed(0)}s (${pct.toFixed(0)}% in)`}`
    + `   eaten at ${f.gone === null ? '—' : `${f.gone.toFixed(0)}s`}`
    + `   "${(f.cueText || '').slice(0, 38)}"`);
  await p.close();
}
for (const r of rows) console.log(r);
console.log(rows.every((r) => r.startsWith('PASS')) ? '\nALL PASS' : '\nFAILURES ABOVE');
await b.close();
