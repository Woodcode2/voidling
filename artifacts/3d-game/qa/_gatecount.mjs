import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of ALL_WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  const reqs = { glb: 0, ok: 0, fail: 0 };
  p.on('response', (r) => { if (r.url().endsWith('.glb')) { reqs.glb++; r.status() < 400 ? reqs.ok++ : reqs.fail++; } });
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:4188/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForTimeout(8000);
  const placed = await p.evaluate(() => Object.keys(window.__glbCount || {}).length);
  console.log(`${wid.padEnd(9)} glb requests ${String(reqs.glb).padStart(3)}  (${reqs.ok} ok, ${reqs.fail} failed)   distinct names placed ${placed}`);
  await p.close();
}
await b.close();
