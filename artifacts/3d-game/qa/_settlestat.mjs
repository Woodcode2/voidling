// what settleFootprints() did at match start, per world: node /tmp/settle.mjs <world> [port]
import { chromium } from 'playwright';
const W = process.argv[2] || 'maple', PORT = process.argv[3] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
const logs = [];
p.on('console', (m) => { const t = m.text(); if (/placement sweep|settle/i.test(t)) logs.push(t); });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidFirstNom', '1'); localStorage.setItem('voidMute', '1'); localStorage.setItem('voidDailyLast', new Date().toDateString()); localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${W}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.5, null, { timeout: 400000 });
const s = await p.evaluate(() => ({ settle: (window.__settle ?? window.__dbg?.__settle)?.(), edibles: (window.__edibles ?? window.__dbg?.__edibles)?.length }));
console.log(W, JSON.stringify(s), '| console:', logs.join(' || ').slice(0, 400));
await b.close();
