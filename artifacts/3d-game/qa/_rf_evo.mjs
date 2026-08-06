// REFUTATION PROBE: does crossing FORM_MIN[4] (COLOSSUS) fire the evolve
// celebration on the CHARACTER, and how big is each form's per-form read?
//
//   node qa/_rf_evo.mjs [world]
//
// Method. The claim is that prototype3d.ts VISUAL_STAGE = [0,1,2,3,3,4] means
// setStage(3 -> 3) at the DEVOURER->COLOSSUS boundary, so void3d.ts's
// `if (n > stage)` branch never runs and evolveT / wobble / ringBurst all stay
// at zero. Observables that prove or disprove it, per frame:
//   - ringMats[0].opacity  (the evolution ribbon; 0 unless ringBurst > 0)
//   - orbStars[0].opacity  (the star flare; same gate)
//   - uWobble uniform      (the jelly slosh; wobble = 1 on evolve)
//   - hero body world scale (evolveT's +/-16% double bounce shows here)
// All four are reachable from window.__scene without touching module state.
import { chromium } from 'playwright';

const WORLD = process.argv[2] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
const tap = async (sel) => {
  await p.waitForSelector(sel, { timeout: 300000 });
  await p.evaluate((s) => document.querySelector(s).click(), sel);
};
await tap('#btnPlay'); await p.waitForTimeout(2500);
await tap(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 1800000 });

// probe rig: find the hero body + the ring group hanging off its parent
await p.evaluate(() => {
  const THREE = window.__THREE;
  let body = null;
  window.__scene.traverse((o) => {
    if (o.isMesh && o.material?.uniforms?.uAbyss && (o.geometry.parameters?.widthSegments ?? 0) >= 90) body = o;
  });
  // group = body's void group. rings live as a direct child Group of it.
  let g = body; while (g && !(g.children || []).some((c) => c.isGroup && c.children.some((m) => m.isMesh && m.geometry?.type === 'TorusGeometry'))) g = g.parent;
  const ringGrp = g.children.find((c) => c.isGroup && c.children.some((m) => m.isMesh && m.geometry?.type === 'TorusGeometry'));
  const toruses = ringGrp.children.filter((m) => m.isMesh && m.geometry?.type === 'TorusGeometry');
  const orbit = ringGrp.children.find((c) => c.isGroup || c.isObject3D ? (c.children || []).some((s) => s.isSprite) : false);
  const stars = orbit ? orbit.children.filter((s) => s.isSprite) : [];
  window.__evoProbe = () => {
    const sc = new THREE.Vector3(); body.getWorldScale(sc);
    return {
      r: +window.__voidState().r.toFixed(3),
      uStage: body.material.uniforms.uStage.value,
      uWobble: +body.material.uniforms.uWobble.value.toFixed(4),
      uTexAmt: +body.material.uniforms.uTexAmt.value.toFixed(3),
      ring0: +toruses[0].material.opacity.toFixed(4),
      ring1: +toruses[1].material.opacity.toFixed(4),
      star0: stars.length ? +stars[0].material.opacity.toFixed(4) : -1,
      nStars: stars.length,
      bodyScale: +sc.x.toFixed(4),
      banner: (document.querySelector('#evolve .big')?.textContent || '') + '|' + (document.querySelector('#evolve')?.className || ''),
    };
  };
});

const sample = async (n, label) => {
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push(await p.evaluate(() => window.__evoProbe()));
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  }
  const mx = (k) => Math.max(...rows.map((x) => x[k]));
  const mn = (k) => Math.min(...rows.map((x) => x[k]));
  console.log(`  ${label.padEnd(34)} ring0max=${mx('ring0').toFixed(3)} star0max=${mx('star0').toFixed(3)} ` +
    `wobMax=${mx('uWobble').toFixed(3)} scale=${mn('bodyScale').toFixed(3)}..${mx('bodyScale').toFixed(3)} ` +
    `uStage=${rows[rows.length - 1].uStage} tex=${rows[rows.length - 1].uTexAmt}`);
  return rows;
};

// ── PART 1: every form boundary, through the same setStage call the game makes
const FORM_MIN = [0, 1.6, 2.5, 3.6, 5.5, 8.0];
const FORMS = ['VOIDLING', 'MUNCHER', 'GOBBLER', 'DEVOURER', 'COLOSSUS', 'WORLD ENDER'];
console.log(`\n### ${WORLD} — the celebration at each form boundary (via __setVoidR, the game's own setStage path)`);
for (let i = 1; i < FORM_MIN.length; i++) {
  await p.evaluate((r) => window.__setVoidR(r), FORM_MIN[i] - 0.05);
  for (let k = 0; k < 8; k++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  await p.evaluate((r) => window.__setVoidR(r), FORM_MIN[i] + 0.05);
  await sample(26, `-> ${FORMS[i]} (r ${FORM_MIN[i]})`);
}

// ── PART 2: settled per-form silhouette + shader state at the gameplay camera
console.log(`\n### per-form settled state (no evolve in flight)`);
for (let i = 0; i < FORM_MIN.length; i++) {
  const r = Math.max(0.9, FORM_MIN[i] + (i === 5 ? 1.5 : 0.4));
  await p.evaluate((rr) => window.__setVoidR(rr), r);
  for (let k = 0; k < 40; k++) await p.evaluate(() => new Promise((x) => requestAnimationFrame(() => x())));
  const st = await p.evaluate(() => {
    const THREE = window.__THREE, cam = window.__cam;
    let body = null;
    window.__scene.traverse((o) => { if (o.isMesh && o.material?.uniforms?.uAbyss && (o.geometry.parameters?.widthSegments ?? 0) >= 90) body = o; });
    const wp = new THREE.Vector3(); body.getWorldPosition(wp);
    const sc = new THREE.Vector3(); body.getWorldScale(sc);
    const camD = cam.position.distanceTo(wp);
    const k = 2 * Math.tan(cam.fov * Math.PI / 360);
    return { camD: +camD.toFixed(1), pxR: +((window.innerHeight / (camD * k)) * sc.x).toFixed(1),
      uStage: body.material.uniforms.uStage.value, uSmall: +body.material.uniforms.uSmall.value.toFixed(3),
      uTexAmt: +body.material.uniforms.uTexAmt.value.toFixed(3), uSlow: +body.material.uniforms.uSlow.value.toFixed(3) };
  });
  // churn amplitude in screen px, from the shader: p *= 1 + churn*0.022*max(0,uStage-1)
  const churnPx = st.pxR * 0.022 * Math.max(0, st.uStage - 1);
  console.log(`  ${FORMS[i].padEnd(12)} r=${r.toFixed(2)} camD=${st.camD} onScreenR=${st.pxR}px uStage=${st.uStage} ` +
    `uSmall=${st.uSmall} tex=${st.uTexAmt} slow=${st.uSlow} churnPeak=${churnPx.toFixed(2)}px`);
}

await b.close();
