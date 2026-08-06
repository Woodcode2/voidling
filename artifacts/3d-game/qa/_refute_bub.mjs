// Same frame, twice: once with the selector portrait.mjs USED to carry (.bub,
// which matches nothing) and once with the one it carries now (.vb,.vf).
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
fs.mkdirSync('qa-out/refute', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
const tap = async (sel) => { await p.waitForSelector(sel, { timeout: 300000 });
  await p.evaluate((s) => document.querySelector(s).click(), sel); };
await tap('#btnPlay'); await p.waitForTimeout(2500);
await tap(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 1800000 });

// the OLD selector, verbatim from the commit before 2516e38
const old = await p.addStyleTag({ content: '#news,#hud,#stageBar,.bub,#btnHome,#coins{opacity:0!important}' });
await p.evaluate(() => window.__setVoidR(5));
const S = 620;
const clip = { x: (430 - S / 3) / 2, y: 932 / 2 - S / 6 - 40, width: S / 3, height: S / 3 };

// wait until a bubble is actually up and overlapping the crop, then shoot both
for (let i = 0; i < 60; i++) {
  await p.waitForTimeout(1200);
  const n = await p.evaluate((c) => [...document.querySelectorAll('.vb,.vf')]
    .filter((e) => { const r = e.getBoundingClientRect();
      return r.width && +getComputedStyle(e).opacity > 0.05 &&
        r.right > c.x && r.left < c.x + c.w && r.bottom > c.y && r.top < c.y + c.h; }).length, { x: clip.x, y: clip.y, w: clip.width, h: clip.height });
  if (n) { console.log(`bubble over the crop after ${i} polls`); break; }
}
await p.screenshot({ path: `qa-out/refute/${WORLD}-BUB-oldselector.png`, clip });
await p.evaluate((h) => document.querySelector(`style[data-x="${h}"]`), 0);
await old.evaluate((el) => el.remove());
await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins{opacity:0!important}' });
await p.waitForTimeout(400);
await p.screenshot({ path: `qa-out/refute/${WORLD}-BUB-newselector.png`, clip });
console.log('qa-out/refute/*-BUB-*.png');
await b.close();
