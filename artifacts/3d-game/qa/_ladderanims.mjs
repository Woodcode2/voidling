// diagnostic: every animation that starts in the menu, and every repaint of
// the ladder, for 20 s after the first pip paints — bar 2 of qa/reveal.mjs's page
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
const SEED = JSON.stringify({ v: 1, seen: 1, w: { maple: { 1: { st: 'open', best: 0, pct: 0, first: '', n: 0 } } } });
await p.addInitScript((lv) => {
  try { localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
    localStorage.setItem('voidLevels', lv); } catch {}
  window.__al = [];
  const t = () => Math.round(performance.now());
  document.addEventListener('animationstart', (e) => window.__al.push(`${t()} start ${e.animationName} @${e.target.id || e.target.className}`), true);
  document.addEventListener('animationend', (e) => window.__al.push(`${t()} end   ${e.animationName} @${e.target.id || e.target.className}`), true);
  const hook = () => { const m = document.getElementById('mlPips'); if (!m) { requestAnimationFrame(hook); return; }
    new MutationObserver((ms) => window.__al.push(`${t()} mut   #mlPips ${ms.length} mutation(s), ${m.children.length} pips`)).observe(m, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); };
  requestAnimationFrame(hook);
}, SEED);
await p.goto(`http://127.0.0.1:${PORT}/?w=maple&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__menuState, null, { timeout: 420000 });
await p.waitForSelector('#mlPips .pip', { timeout: 180000 });
const t0 = await p.evaluate(() => Math.round(performance.now()));
await new Promise((r) => setTimeout(r, 20000));
const log = await p.evaluate(() => window.__al);
console.log(`first pip painted by ${t0} ms`);
for (const l of log) console.log(l);
await b.close();
