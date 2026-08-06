// REFUTATION PROBE 3 — PICTURES. Two sheets:
//  A. the six forms, settled, at the real gameplay camera (what a child sees)
//  B. the evolve MOMENT at DEVOURER (burst fires) vs COLOSSUS (claimed inert)
import { chromium } from 'playwright';
import fs from 'node:fs';
const WORLD = process.argv[2] || 'maple';
fs.mkdirSync('qa-out/rfevo', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private */ } });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
const tap = async (sel) => { await p.waitForSelector(sel, { timeout: 300000 });
  await p.evaluate((s) => document.querySelector(s).click(), sel); };
await tap('#btnPlay'); await p.waitForTimeout(2500);
await tap(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 1800000 });

const frames = (n) => p.evaluate((k) => new Promise((res) => {
  let i = 0; const go = () => (++i >= k ? res() : requestAnimationFrame(go)); requestAnimationFrame(go);
}), n);
const state = () => p.evaluate(() => {
  const THREE = window.__THREE, cam = window.__cam; let body = null;
  window.__scene.traverse((o) => { if (o.isMesh && o.material?.uniforms?.uAbyss && (o.geometry.parameters?.widthSegments ?? 0) >= 90) body = o; });
  const wp = new THREE.Vector3(); body.getWorldPosition(wp);
  const sc = new THREE.Vector3(); body.getWorldScale(sc);
  const camD = cam.position.distanceTo(wp);
  return { dispR: +sc.x.toFixed(3), realR: +window.__voidState().r.toFixed(3), camD: +camD.toFixed(1),
    pxR: +((window.innerHeight / (camD * 2 * Math.tan(cam.fov * Math.PI / 360))) * sc.x).toFixed(1),
    uStage: body.material.uniforms.uStage.value, uSmall: +body.material.uniforms.uSmall.value.toFixed(3),
    uSlow: +body.material.uniforms.uSlow.value.toFixed(3), uTexAmt: +body.material.uniforms.uTexAmt.value.toFixed(3) };
});

// hide HUD so the frame is only the character + world
await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins,#joy{opacity:0!important}' });

const FORMS = [['VOIDLING', 0.9], ['MUNCHER', 2.0], ['GOBBLER', 3.0], ['DEVOURER', 4.4], ['COLOSSUS', 6.5], ['WORLD_ENDER', 10.0]];
console.log(`\n### A — the six forms, settled, gameplay camera (${WORLD})`);
for (const [name, r] of FORMS) {
  await p.evaluate((rr) => window.__setVoidR(rr), r);
  // camDist lerps: give it plenty of frames, re-pinning r so eating cannot drift it
  for (let k = 0; k < 12; k++) { await p.evaluate((rr) => window.__setVoidR(rr), r); await frames(4); }
  const st = await state();
  await p.screenshot({ path: `qa-out/rfevo/A_${FORMS.findIndex((f) => f[0] === name)}_${name}.png` });
  const rimStop = 0.86 + (0.50 - 0.86) * st.uSmall;
  console.log(`  ${name.padEnd(12)} setR=${String(r).padStart(5)} dispR=${st.dispR} camD=${st.camD} onScreenR=${st.pxR}px ` +
    `uStage=${st.uStage} uSmall=${st.uSmall} rimStop=${rimStop.toFixed(3)} rimAreaPct=${((1 - rimStop * rimStop) * 100).toFixed(0)}% ` +
    `uSlow=${st.uSlow} tex=${st.uTexAmt} churnPeak=${(st.pxR * 0.022 * Math.max(0, st.uStage - 1)).toFixed(2)}px`);
}

console.log(`\n### B — the evolve MOMENT: DEVOURER vs COLOSSUS`);
for (const [from, to, name] of [[3.4, 3.7, 'DEVOURER'], [5.3, 5.6, 'COLOSSUS'], [7.7, 8.1, 'WORLD_ENDER']]) {
  await p.evaluate((r) => window.__setVoidR(r), from);
  for (let k = 0; k < 10; k++) { await p.evaluate((r) => window.__setVoidR(r), from); await frames(4); }
  await p.evaluate((r) => window.__setVoidR(r), to);
  for (let s = 0; s < 4; s++) {
    await frames(2);
    const obs = await p.evaluate(() => {
      const THREE = window.__THREE; let body = null;
      window.__scene.traverse((o) => { if (o.isMesh && o.material?.uniforms?.uAbyss && (o.geometry.parameters?.widthSegments ?? 0) >= 90) body = o; });
      let g = body; const has = (o) => (o.children || []).some((c) => c.type === 'Group' && c.children.some((m) => m.isMesh && m.geometry?.type === 'TorusGeometry'));
      while (g && !has(g)) g = g.parent;
      const rg = g.children.find((c) => c.type === 'Group' && c.children.some((m) => m.isMesh && m.geometry?.type === 'TorusGeometry'));
      const tor = rg.children.filter((m) => m.isMesh && m.geometry?.type === 'TorusGeometry');
      const orb = rg.children.find((c) => (c.children || []).some((s) => s.isSprite));
      const stars = orb ? orb.children.filter((s) => s.isSprite) : [];
      const sc = new THREE.Vector3(); body.getWorldScale(sc);
      return { ring0: +tor[0].material.opacity.toFixed(3), star0: stars.length ? +stars[0].material.opacity.toFixed(3) : -1,
        wob: +body.material.uniforms.uWobble.value.toFixed(3), bodyScale: +sc.x.toFixed(3) };
    });
    console.log(`  ${name} step${s}: ring=${obs.ring0} star=${obs.star0} wobble=${obs.wob} bodyScale=${obs.bodyScale}`);
    await p.screenshot({ path: `qa-out/rfevo/B_${name}_s${s}.png` });
  }
}
await b.close();
