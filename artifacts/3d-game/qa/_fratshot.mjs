// Look at the tightest pair of big buildings in Game Day. AABB overlap is a
// conservative test on rotated meshes; a photograph is not.
import { chromium } from 'playwright';
const SITES = [['frat', 111.7, 78.3], ['brickhall', 180.8, -23.8]];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto('http://127.0.0.1:4177/?w=gameday', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click('#worldRow .wCard[data-world="gameday"]');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });
await p.waitForTimeout(9000);
for (const [tag, x, z] of SITES) {
  await p.evaluate(([x2, z2]) => { window.__warpVoid(x2, z2 + 34); window.__setVoidR(3.2); }, [x, z]);
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `qa-out/_pair-${tag}.png` });
  console.log(`wrote qa-out/_pair-${tag}.png`);
}
await b.close();
