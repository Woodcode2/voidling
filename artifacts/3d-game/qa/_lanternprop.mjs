// REFUTATION PROBE: are Lantern Night's lanterns unlit-glow or moon-lit? do
// they float? are there strings? Boots lantern, walks the scene graph, then
// shoots the spawn frame and a camera-pushed close-up.
import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('qa-out/lan', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch {} });
await p.goto('http://127.0.0.1:4177/?w=lantern', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
const tap = async (sel) => { await p.waitForSelector(sel, { timeout: 300000 });
  await p.evaluate((s) => document.querySelector(s).click(), sel); };
await tap('#btnPlay'); await p.waitForTimeout(2500);
await tap('#worldRow .wCard[data-world="lantern"]');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 1800000 });

const r = await p.evaluate(() => {
  const THREE = window.__THREE;
  const mats = new Map(); let basic = 0, std = 0, meshes = 0;
  const glowMeshes = [];
  window.__scene.traverse((o) => {
    if (!o.isMesh || !o.material || o.material.uniforms) return;
    meshes++;
    const m = o.material;
    const key = m.type + '|' + (m.vertexColors ? 'vc' : 'plain') + '|' + (m.toneMapped ? 'tm' : 'raw');
    mats.set(key, (mats.get(key) || 0) + 1);
    if (m.type === 'MeshBasicMaterial' && m.vertexColors) {
      basic++;
      const wp = new THREE.Vector3(); o.getWorldPosition(wp);
      o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox;
      glowMeshes.push({ y: +wp.y.toFixed(2), yMin: +(wp.y + bb.min.y).toFixed(2),
        yMax: +(wp.y + bb.max.y).toFixed(2), tri: o.geometry.index ? o.geometry.index.count/3 : o.geometry.attributes.position.count/3,
        lit: m.lights === true });
    } else if (m.type === 'MeshStandardMaterial') std++;
  });
  // lights
  const lights = [];
  window.__scene.traverse((o) => { if (o.isLight) lights.push({ t: o.type, i: +o.intensity.toFixed(3) }); });
  const gm = glowMeshes;
  const grounded = gm.filter((g) => g.yMin <= 0.12).length;
  const floating = gm.filter((g) => g.yMin > 0.6).length;
  return { meshes, basicGlowMeshes: basic, stdMeshes: std,
    mats: [...mats.entries()].sort((a,c)=>c[1]-a[1]).slice(0,8),
    lights, glowCount: gm.length, grounded, floating,
    yMinHist: gm.map(g=>g.yMin).sort((a,c)=>a-c).filter((_,i,a)=>i%Math.max(1,Math.floor(a.length/12))===0),
    exposure: window.__renderer.toneMappingExposure, tone: window.__renderer.toneMapping,
    glowTri: gm.reduce((s,g)=>s+g.tri,0) };
});
console.log(JSON.stringify(r, null, 1));

await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins{opacity:0!important}' });
await p.waitForTimeout(600);
await p.screenshot({ path: 'qa-out/lan/spawn-clean.png' });

// push the camera down onto the void so a lantern fills more of the frame
await p.evaluate(() => { const c = window.__cam; c.__savedFov = c.fov; c.fov = 16; c.updateProjectionMatrix(); });
await p.waitForTimeout(600);
await p.screenshot({ path: 'qa-out/lan/spawn-zoom.png' });
await b.close();
