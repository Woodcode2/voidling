// Diagnostic: with the mood pinned and the void parked somewhere it cannot
// chomp, what does mp.maw actually settle at? Rendering is stubbed so the sim
// runs at full rate; every sample is stamped with __matchState().t.
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
await p.evaluate(() => {
  window.__renderer.render = () => {};
  let smile = null, maw = null;
  window.__scene.traverse((o) => {
    const g = o.geometry && o.geometry.parameters; if (!g) return;
    if (Math.abs(g.radius - 0.165) < 1e-6 && Math.abs((g.thetaLength ?? 0) - Math.PI) < 1e-6) smile = o.parent;
    if (Math.abs(g.radius - 0.2) < 1e-6 && g.segments === 56 && o.parent && Math.abs(o.parent.position.y + 0.3) < 1e-6) maw = o.parent;
  });
  window.__smileG = smile; window.__mawG = maw;
});

for (const m of ['hungry', 'cruise', 'frenzy']) {
  await p.evaluate((mm) => window.__setMood(mm), m);
  await p.waitForTimeout(2000);
  const r = await p.evaluate(() => new Promise((res) => {
    const out = []; const t0 = window.__matchState().t;
    const id = setInterval(() => {
      out.push({ t: +(window.__matchState().t - t0).toFixed(2),
        mo: +window.__mawG.scale.x.toFixed(4), vis: window.__smileG.visible });
      if (out.length >= 40) { clearInterval(id); res(out); }
    }, 100);
  }));
  const mos = r.map(x => x.mo).sort((a, b2) => a - b2);
  const hidden = r.filter(x => !x.vis).length;
  console.log(`${m.padEnd(8)} over ${r[r.length-1].t}s: mo min ${mos[0].toFixed(3)} med ${mos[20].toFixed(3)} max ${mos[mos.length-1].toFixed(3)}   smile hidden in ${hidden}/${r.length} samples`);
  console.log(`         trace: ${r.slice(0, 14).map(x => x.mo.toFixed(2)).join(' ')}`);
}
await b.close();
