// _bug1 — COLD BOOT + PANEL SWEEP at 320px (iPhone SE) and 768px (iPad).
// Opens every reachable panel, records console errors, and measures every
// interactive control for (a) being outside the viewport, (b) being under
// 44x44 CSS px, (c) horizontal page overflow.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const W = +(process.argv[3] || 320), H = +(process.argv[4] || 568);
const COLD = process.argv[5] !== 'warm';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2,
  hasTouch: true, isMobile: true });
const errs = [];
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') {
  const t = m.text(); if (/403|Forbidden|ERR_(FAILED|BLOCKED)/.test(t)) return;
  errs.push(m.type().toUpperCase() + ' ' + t.slice(0, 200)); } });
p.on('pageerror', e => errs.push('PAGEERROR ' + String(e.stack || e).slice(0, 300)));
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
if (!COLD) await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForTimeout(2500);

const audit = async (label) => {
  return await p.evaluate((label) => {
    const vw = innerWidth, vh = innerHeight;
    const out = { label, vw, vh, scrollW: document.documentElement.scrollWidth,
      offscreen: [], small: [], shown: [] };
    document.querySelectorAll('*').forEach(e => {
      if (e.classList.contains('show')) out.shown.push(e.id || e.className);
    });
    const sel = 'button, [role=button], input, .wCard, .navCard, .setRow, .bkCard, .shopCard, .sCard';
    document.querySelectorAll(sel).forEach(e => {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
      // is it inside a hidden ancestor?
      let a = e, hidden = false;
      while (a && a !== document.body) { const c = getComputedStyle(a);
        if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) { hidden = true; break; }
        a = a.parentElement; }
      if (hidden) return;
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const id = (e.id || e.className || e.tagName) + '“' + (e.textContent || '').trim().slice(0, 22) + '”';
      if (r.bottom > vh + 1 || r.top < -1 || r.right > vw + 1 || r.left < -1)
        out.offscreen.push({ id, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] });
      if (r.width < 44 || r.height < 44) out.small.push({ id, w: Math.round(r.width), h: Math.round(r.height) });
    });
    return out;
  }, label);
};
const rep = [];
const shot = async n => p.screenshot({ path: `qa-out/_bug/${W}-${n}.png` });
const open = async (btn, name, closeBtn) => {
  const ok = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false;
    e.click(); return true; }, btn);
  if (!ok) { rep.push({ label: name, missing: btn }); return; }
  await p.waitForTimeout(900);
  rep.push(await audit(name)); await shot(name);
  if (closeBtn) { await p.evaluate(s => document.querySelector(s)?.click(), closeBtn); await p.waitForTimeout(700); }
};
rep.push(await audit('boot')); await shot('boot');
// dismiss whatever cold boot put up
await p.evaluate(() => { document.getElementById('dailyClaim')?.click(); });
await p.waitForTimeout(900);
rep.push(await audit('afterDaily')); await shot('afterDaily');
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
await p.waitForTimeout(400);
rep.push(await audit('menu')); await shot('menu');
await open('#btnBook','book','#bookClose');
await open('#btnShop','shop','#btnBack');
await open('#btnTrophies','trophies','.metaScr#trophies .mBack, #trophies button');
await p.evaluate(() => document.querySelectorAll('#trophies.show,#topvoids.show,#shop.show,#book.show').forEach(e=>e.classList.remove('show')));
await open('#btnTop','topvoids', null);
await p.evaluate(() => document.querySelectorAll('#topvoids.show').forEach(e=>e.classList.remove('show')));
await open('#btnSettings','settings','#setClose');
await open('#btnWorlds','worlds', null);
await p.evaluate(() => document.querySelectorAll('#worlds.show').forEach(e=>e.classList.remove('show')));
await open('#gift','gift', null);
await b.close();

console.log(`\n  PANEL SWEEP @ ${W}x${H} ${COLD ? '(COLD)' : '(warm)'}\n`);
for (const r of rep) {
  if (r.missing) { console.log(`  ${r.label}: BUTTON MISSING ${r.missing}`); continue; }
  const ov = r.scrollW > r.vw ? `  H-OVERFLOW scrollW=${r.scrollW} > ${r.vw}` : '';
  console.log(`  ${r.label}  shown=[${r.shown.join(',')}]${ov}`);
  for (const o of r.offscreen) console.log(`      OFFSCREEN ${o.id} rect=${o.rect}`);
  for (const s of r.small) console.log(`      SMALL ${s.w}x${s.h} ${s.id}`);
}
console.log(`\n  console errors/warnings: ${errs.length}`);
[...new Set(errs)].slice(0, 25).forEach(e => console.log('     ' + e));
