// diagnose the menu -> match path so the robustness probes can drive it
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4271;
const WORLD = process.argv[2] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
pg.on('pageerror', e => console.log('PAGEERROR', e.message));
await pg.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await pg.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); } catch {} });
await pg.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
const vis = () => pg.evaluate(() => {
  const ids = ['menu','worlds','loadScr','tut','end','daily','book','settings','pause','gate','shop','trophies','topvoids'];
  const o = {};
  for (const id of ids) { const e = document.getElementById(id); if (!e) { o[id] = 'MISSING'; continue; }
    const cs = getComputedStyle(e); o[id] = `${cs.display}/${cs.opacity}/${e.className}`; }
  o._body = document.body.className;
  o._state = (() => { try { const m = window.__matchState(); return `t=${m.t.toFixed(1)} clock=${m.clock.toFixed(1)}`; } catch (e) { return 'ERR ' + e.message; } })();
  return o;
});
console.log('AFTER BOOT', await vis());
const cards = await pg.evaluate(() => {
  const row = document.getElementById('worldRow');
  return row ? [...row.children].map(c => ({ tag: c.tagName, cls: c.className, data: JSON.stringify(c.dataset), txt: (c.textContent||'').slice(0,40) })) : 'no row';
});
console.log('WORLD CARDS', cards);
await pg.evaluate(() => document.getElementById('btnPlay').click());
await pg.waitForTimeout(1500);
console.log('AFTER PLAY', await vis());
console.log('WORLD CARDS 2', await pg.evaluate(() => {
  const row = document.getElementById('worldRow');
  return row ? [...row.querySelectorAll('*')].slice(0,20).map(c => `${c.tagName}.${c.className}|${JSON.stringify(c.dataset)}|${(c.textContent||'').slice(0,25)}`) : 'no row';
}));
await b.close();
