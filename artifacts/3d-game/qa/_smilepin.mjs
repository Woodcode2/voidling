// Direct state readout of the two mouth groups under each pinned mood.
// Also dumps the shipped colours and sizes so nothing has to be eyeballed.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });

console.log(await p.evaluate(() => {
  let smile = null, maw = null;
  window.__scene.traverse((o) => {
    const g = o.geometry && o.geometry.parameters; if (!g) return;
    if (Math.abs(g.radius - 0.165) < 1e-6 && Math.abs((g.thetaLength ?? 0) - Math.PI) < 1e-6) smile = o.parent;
    if (Math.abs(g.radius - 0.2) < 1e-6 && g.segments === 56 && o.parent && Math.abs(o.parent.position.y + 0.3) < 1e-6) maw = o.parent;
  });
  window.__smileG = smile; window.__mawG = maw;
  const dump = (n, g) => g ? `${n}: kids=${g.children.length} pos=(${g.position.x.toFixed(2)},${g.position.y.toFixed(2)},${g.position.z.toFixed(2)}) ` +
    g.children.map(c => `[${c.geometry.type} r=${c.geometry.parameters.radius} #${c.material.color.getHexString()}]`).join(' ') : `${n}: NOT FOUND`;
  return dump('SMILE', smile) + '\n' + dump('MAW', maw) +
    `\ntoneMapping=${window.__renderer.toneMapping} exposure=${window.__renderer.toneMappingExposure} outputColorSpace=${window.__renderer.outputColorSpace}`;
}));

for (const m of [null, 'cruise', 'hungry', 'frenzy', 'victory', 'scared']) {
  await p.evaluate((mm) => window.__setMood(mm), m);
  await p.waitForTimeout(2500);
  const s = await p.evaluate(() => {
    const sm = window.__smileG, mw = window.__mawG;
    // world-space widths, so the two are directly comparable on screen
    const bb = (o) => { const box = new window.__THREE.Box3().setFromObject(o);
      return o.visible && isFinite(box.min.x) ? `${(box.max.x-box.min.x).toFixed(3)}w x ${(box.max.y-box.min.y).toFixed(3)}h` : 'hidden/none'; };
    return { vis: sm.visible, mawScale: +mw.scale.x.toFixed(4),
      smileScale: `${sm.scale.x.toFixed(3)},${sm.scale.y.toFixed(3)}`,
      smileBox: bb(sm), mawBox: mw.scale.x > 0.005 ? bb(mw) : 'closed' };
  });
  console.log(`${String(m).padEnd(8)} smile.visible=${String(s.vis).padEnd(5)} maw=${String(s.mawScale).padEnd(7)} smileScale=${s.smileScale.padEnd(13)} smileWorld=${String(s.smileBox).padEnd(22)} mawWorld=${s.mawBox}`);
}
await b.close();
