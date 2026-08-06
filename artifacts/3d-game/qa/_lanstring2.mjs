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

const dump = await p.evaluate(() => {
  const THREE = window.__THREE; const rows = [];
  for (const o of window.__scene.children) {
    if (!o.isGroup) continue;
    const glow = o.children.find(c => c.isMesh && c.material?.type === 'MeshBasicMaterial' && c.material.vertexColors);
    if (!glow) continue;
    const sol = o.children.find(c => c.isMesh && c !== glow);
    glow.geometry.computeBoundingBox(); const gb = glow.geometry.boundingBox;
    let sb = null; if (sol) { sol.geometry.computeBoundingBox(); sb = sol.geometry.boundingBox; }
    const wp = new THREE.Vector3(); o.getWorldPosition(wp);
    rows.push({ n: o.children.length, x: +wp.x.toFixed(0), y: +wp.y.toFixed(2), z: +wp.z.toFixed(0),
      gy: [+gb.min.y.toFixed(2), +gb.max.y.toFixed(2)], gx: +(gb.max.x-gb.min.x).toFixed(1),
      sy: sb ? [+sb.min.y.toFixed(2), +sb.max.y.toFixed(2)] : null,
      sx: sb ? +(sb.max.x-sb.min.x).toFixed(1) : null,
      ed: !!o.userData?.edible, hasShadow: o.children.length > 2 });
  }
  // lantern strings: NOT edible, wire from ~3.0 to 4.6, glow span ~17, exactly 2 children
  const strings = rows.filter(r => r.n === 2 && r.sx > 15.5 && r.sx < 19 && r.gy[0] > 1.8 && r.gy[1] > 3.8 && r.gy[1] < 5.0 && r.sy && r.sy[0] > 1.8 && r.sy[0] < 2.2 && r.sy[1] < 5);
  const big = rows.filter(r=>r.sx>10).map(r=>({sx:r.sx,gy:r.gy,sy:r.sy})).slice(0,40);
  return { totalGlowGroups: rows.length, strings: strings.length, sample: strings.slice(0,3),
           bigCount: rows.filter(r=>r.sx>10).length, big: big.slice(0,25) };
});
console.log(JSON.stringify(dump, null, 1));
if (dump.strings) {
  const s = dump.sample[0];
  await p.evaluate(({x,z}) => { window.__setVoidR(2.4); window.__warpVoid(x, z + 34); }, s);
  await p.waitForTimeout(3000);
  await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins{opacity:0!important}' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'qa-out/lan/string.png' });
  console.log('shot at', JSON.stringify(s));
}
await b.close();
