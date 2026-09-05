// does the whale answer her beat? Fire the cue by hand at t>3 and watch her.
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
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });
const whale = () => p.evaluate(() => { const a = window.__asc; const w = a.phases().find((e) => e.stage === 4); const m = a.envs.find((e) => e.stage === 4)?.m; return { ...w, y: m?.position.y, x: m?.position.x, z: m?.position.z, st: a.state(), t: window.__matchState().t }; });
console.log('before cue:', JSON.stringify(await whale()));
await p.evaluate(() => { const m = window.__asc.envs.find((e) => e.stage === 4).m; window.__life.cue('whale', m.position.x, m.position.z); });
const t0 = (await whale()).t;
for (const dt of [3, 6, 10, 14]) {
  await p.waitForFunction((tt) => (window.__matchState?.().t ?? 0) >= tt, t0 + dt, { timeout: 600000 });
  console.log(`+${dt}s:`, JSON.stringify(await whale()));
}
const counts = await p.evaluate(() => { const ph = window.__asc.phases(); const c = {}; for (const e of ph) c[`s${e.stage}p${e.phase}`] = (c[`s${e.stage}p${e.phase}`] || 0) + 1; return c; });
console.log('stage/phase census after the cue:', JSON.stringify(counts));
await b.close();
