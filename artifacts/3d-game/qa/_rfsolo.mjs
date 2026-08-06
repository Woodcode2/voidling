// SOLO RUN (matchLen 120): do beats 3 and 4 fire out of authored order?
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto('http://127.0.0.1:4177/?w=maple', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnSolo');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.evaluate(() => {
  window.__renderer.render = () => {};
  window.__bt = [];
  const bn = document.getElementById('banner'); let last = '';
  new MutationObserver(() => {
    const t = window.__matchState?.().t ?? -1;
    const txt = (bn.textContent||'').replace(/\s+/g,' ').trim();
    if (bn.classList.contains('show') && txt && txt !== last) { last = txt; window.__bt.push({ t:+t.toFixed(2), txt }); }
  }).observe(bn, { attributes:true, childList:true, subtree:true, characterData:true });
  // sample the live multiplier badge
  window.__mul = [];
  setInterval(() => { const ms = window.__matchState?.(); if(!ms) return;
    const m = document.getElementById('mult'); 
    window.__mul.push({ t:+ms.t.toFixed(1), badge: (m?.textContent||'').trim() }); }, 250);
});
await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000 });
const out = await p.evaluate(() => ({ bt: window.__bt, end: window.__matchState?.().t }));
console.log('SOLO matchLen=120, banner cards:');
for (const e of out.bt) if (/×[23]/.test(e.txt) || /SECONDS/.test(e.txt)) console.log(' ', String(e.t).padStart(7), e.txt.slice(0,64));
console.log('match ended at t =', out.end);
await b.close();
