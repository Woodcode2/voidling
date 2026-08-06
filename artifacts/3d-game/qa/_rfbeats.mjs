// REFUTATION PROBE — do the three named beats land on the same second every match?
// Match-time stamped (never wall clock). Renderer stubbed. N back-to-back
// matches per page, so the per-match re-roll in beginMatch() is exercised the
// way PLAY AGAIN exercises it.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,gameday').split(',');
const RUNS = Number(process.argv[3] || 3);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const rows = [];
await Promise.all(WORLDS.map(async (wid) => {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => {}; });

  // installed ONCE — survives rematches
  await p.evaluate(() => {
    window.__bt = [];
    const T = () => window.__matchState?.().t ?? -1;
    const push = (kind, text) => window.__bt.push({ run: window.__runIdx|0, t: +T().toFixed(2), kind, text });
    const bn = document.getElementById('banner');
    let last = '';
    new MutationObserver(() => {
      const txt = (bn.textContent||'').replace(/\s+/g,' ').trim();
      if (bn.classList.contains('show') && txt && txt !== last) { last = txt; push('BANNER', txt); }
    }).observe(bn, { attributes: true, childList: true, subtree: true, characterData: true });
    // hunt flag straight off the state, sampled fast
    let huntWas = {};
    setInterval(() => {
      const ms = window.__matchState?.(); if (!ms) return;
      for (const r of ms.rivals) {
        if (r.hunt) huntWas[r.name] = 1;
        else if (huntWas[r.name] === 1) { huntWas[r.name] = 2; push('HUNT_OFF', r.name); }
      }
    }, 40);
    window.__resetHunt = () => { huntWas = {}; last = ''; };
  });

  for (let run = 0; run < RUNS; run++) {
    await p.evaluate((r) => { window.__runIdx = r; }, run);
    await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
      null, { timeout: 1800000 });
    if (run < RUNS - 1) {
      await p.evaluate(() => { window.__resetHunt(); document.getElementById('btnAgain').click(); });
      await p.waitForFunction(() => (window.__matchState?.().t ?? 999) < 5, null, { timeout: 400000 });
      await p.evaluate(() => { window.__renderer.render = () => {}; });
    }
  }
  const ev = await p.evaluate(() => window.__bt);
  rows.push({ wid, ev });
  await p.close();
}));

const pick = (ev, run, re) => { const e = ev.find(x => x.run === run && re.test(x.text||x.kind)); return e ? e.t : null; };
console.log('world     run   HUNT_OFF   too-full-card   35SEC-card   FINALE-card   all beat cards');
const agg = { hunt: [], warn: [], fin: [] };
for (const { wid, ev } of rows) {
  const runs = [...new Set(ev.map(e => e.run))].sort();
  for (const run of runs) {
    const mine = ev.filter(e => e.run === run);
    const hoff = mine.find(e => e.kind === 'HUNT_OFF');
    const full = mine.find(e => /is too full/.test(e.text || ''));
    const warn = mine.find(e => /35 SECONDS/.test(e.text || ''));
    const beats = mine.filter(e => /×[23]$/.test((e.text||'').trim()));
    const fin = beats.filter(e => /×3$/.test(e.text.trim())).pop();
    if (hoff) agg.hunt.push(hoff.t); if (warn) agg.warn.push(warn.t); if (fin) agg.fin.push(fin.t);
    console.log(`${wid.padEnd(9)} ${String(run).padEnd(5)} ${String(hoff?.t ?? '-').padStart(8)} ${String(full?.t ?? '-').padStart(15)} ${String(warn?.t ?? '-').padStart(12)} ${String(fin?.t ?? '-').padStart(13)}   ${beats.map(x=>x.t+'@'+x.text.split(' ')[0]).join(' ')}`);
  }
}
const u = a => [...new Set(a.map(x=>x.toFixed(1)))].join(',');
console.log('\nHUNT_OFF  :', u(agg.hunt));
console.log('35 SECONDS:', u(agg.warn));
console.log('FINALE x3 :', u(agg.fin), ' — distinct values:', new Set(agg.fin.map(x=>x.toFixed(1))).size, 'of', agg.fin.length);
await b.close();
