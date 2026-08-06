// Do the CANAL LANTERN STRINGS exist and render? Find one in the graph, warp
// the void under it, shoot.
import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('qa-out/lan', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
p.setDefaultTimeout(400000);
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto('http://127.0.0.1:4177/?w=lantern', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
await p.evaluate(() => document.querySelector('#btnPlay').click()); await p.waitForTimeout(2000);
await p.evaluate(() => document.querySelector('#worldRow .wCard[data-world="lantern"]').click());
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000 });

// A lantern string is a Group with exactly 2 children, one merged solid mesh
// with ~14 wire segments and one glow mesh, sitting at y=0 with glow around y=4.
const found = await p.evaluate(() => {
  const THREE = window.__THREE; const hits = [];
  window.__scene.children.forEach((o) => {
    if (!o.isGroup || o.children.length !== 2) return;
    const glow = o.children.find(c => c.material && c.material.type === 'MeshBasicMaterial' && c.material.vertexColors);
    const sol = o.children.find(c => c !== glow);
    if (!glow || !sol) return;
    glow.geometry.computeBoundingBox(); const gb = glow.geometry.boundingBox;
    sol.geometry.computeBoundingBox(); const sb = sol.geometry.boundingBox;
    const spanX = sb.max.x - sb.min.x;
    if (gb.min.y > 2.5 && spanX > 16 && spanX < 18.5 && gb.max.y < 6) {
      const wp = new THREE.Vector3(); o.getWorldPosition(wp);
      hits.push({ x: +wp.x.toFixed(1), z: +wp.z.toFixed(1),
        glowY: [+gb.min.y.toFixed(2), +gb.max.y.toFixed(2)],
        wireY: [+sb.min.y.toFixed(2), +sb.max.y.toFixed(2)], spanX: +spanX.toFixed(1),
        wireTris: (sol.geometry.index ? sol.geometry.index.count : sol.geometry.attributes.position.count)/3 });
    }
  });
  return hits;
});
console.log('lantern strings found:', found.length);
console.log(JSON.stringify(found.slice(0, 4)));
if (found.length) {
  await p.evaluate(({x,z}) => { window.__setVoidR(3.0); window.__warpVoid(x, z + 30); }, found[0]);
  await p.waitForTimeout(2500);
  await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins{opacity:0!important}' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'qa-out/lan/string.png' });
  console.log('wrote qa-out/lan/string.png');
}
await b.close();
