// SKYLARK FIELD census: what actually landed, by kind and by balloon stage.
//   node qa/_skcensus.mjs [port]
import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript((u) => { try { localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidUnlocked', u); } catch { } let s = 7; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, ALL_WORLDS.join(','));
await p.goto(`http://127.0.0.1:${PORT}/?w=skylark`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1500);
await p.evaluate(() => document.querySelector('#worldRow .wCard[data-world="skylark"]')?.click());
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 1, null, { timeout: 600000 });
const c = await p.evaluate(() => {
  const out = { edibles: window.__edibles.length, kinds: {}, stages: {}, qk: {}, tall2: 0, tall5: 0, ppl: 0 };
  for (const e of window.__edibles) {
    const u = e.mesh.userData;
    if (u.kind) out.kinds[u.kind] = (out.kinds[u.kind] || 0) + 1;
    if (u.balloon) out.stages[u.balloon.stage] = (out.stages[u.balloon.stage] || 0) + 1;
    if (u.qk) out.qk[u.qk] = (out.qk[u.qk] || 0) + 1;
  }
  return out;
});
console.log(JSON.stringify(c, null, 1));
await b.close();
