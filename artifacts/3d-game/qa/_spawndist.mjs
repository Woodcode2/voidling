// WHICH DISTRICT DOES EACH WORLD DROP YOU IN, and how far is the nearest
// curio from that drop point? The wander probe says a child's first find is
// 88-119s in; this asks whether that is because the curios are far, or
// because the wanderer is slow.
import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of ALL_WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.removeItem('voidStickers');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  const r = await p.evaluate(() => {
    const vs = window.__voidState();
    const spawnBiome = String(window.__biomeAt ? window.__biomeAt(vs.x, vs.z) : '?');
    const cur = window.__edibles.filter((e) => e.mesh?.userData?.sticker)
      .map((e) => ({ id: e.mesh.userData.sticker, r: +e.radius.toFixed(2),
        d: Math.round(Math.hypot(e.mesh.position.x - vs.x, e.mesh.position.z - vs.z)) }))
      .sort((a, x) => a.d - x.d);
    return { startR: +vs.r.toFixed(2), spawnBiome, cur };
  });
  console.log(`${wid.padEnd(8)} start r=${r.startR}  spawn biome '${r.spawnBiome}'`);
  console.log(`  nearest 5: ${r.cur.slice(0, 5).map((c) => `${c.id}@${c.d}u(r${c.r})`).join('  ')}`);
  console.log(`  distances: ${r.cur.map((c) => c.d).join(' ')}`);
  await p.close();
}
await b.close();
