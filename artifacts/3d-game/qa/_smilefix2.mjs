// The two HUNGRY steady states, held still for the camera by clamping the two
// mouth groups at render time to exactly what each code path would produce:
//   before  maw 0.26, smile off   (shipped: 0.26 >= the 0.25 threshold)
//   after   maw 0.20, smile on    (proposed fix option 1)
//   thr     maw 0.26, smile on    (proposed fix option 2: threshold -> 0.30)
import { chromium } from 'playwright';
import fs from 'node:fs';
const WORLD = process.argv[2] || 'maple';
const R = Number(process.argv[3] || 8);
fs.mkdirSync('qa-out/smile', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
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
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 600000 });
await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins{opacity:0!important}' });

await p.evaluate((rr) => {
  window.__setVoidR(rr); window.__setMood('hungry');
  let smile = null, maw = null;
  window.__scene.traverse((o) => {
    const g = o.geometry && o.geometry.parameters; if (!g) return;
    if (Math.abs(g.radius - 0.165) < 1e-6 && Math.abs((g.thetaLength ?? 0) - Math.PI) < 1e-6) smile = o.parent;
    if (Math.abs(g.radius - 0.2) < 1e-6 && g.segments === 56 && o.parent && Math.abs(o.parent.position.y + 0.3) < 1e-6) maw = o.parent;
  });
  window.__mode = 'before';
  const orig = window.__renderer.render.bind(window.__renderer);
  window.__renderer.render = (s, c) => {
    if (window.__mode === 'before') { maw.scale.setScalar(0.26); smile.visible = false; }
    if (window.__mode === 'after')  { maw.scale.setScalar(0.20); smile.visible = true; }
    if (window.__mode === 'thr')    { maw.scale.setScalar(0.26); smile.visible = true; }
    if (window.__mode === 'shut')   { maw.scale.setScalar(0.001); smile.visible = true; }
    orig(s, c);
  };
}, R);

const S = 620;
const clip = { x: (430 - S / 3) / 2, y: 932 / 2 - S / 6 - 40, width: S / 3, height: S / 3 };
for (const m of ['before', 'after', 'thr', 'shut']) {
  await p.evaluate((mm) => { window.__mode = mm; }, m);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `qa-out/smile/hungry-${WORLD}-r${R}-${m}.png`, clip });
  console.log(`qa-out/smile/hungry-${WORLD}-r${R}-${m}.png`);
}
await b.close();
