// Side-by-side of the same hero at the same size under pinned moods, plus an
// unpinned gameplay frame at real framing (no crop, no 3x) so the difference
// can be judged the way a child sees it rather than the way a portrait does.
import { chromium } from 'playwright';
import fs from 'node:fs';
const WORLD = process.argv[2] || 'maple';
const R = Number(process.argv[3] || 8);
const TAG = process.argv[4] || '';
fs.mkdirSync('qa-out/smile', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 600000 });
await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins{opacity:0!important}' });
await p.evaluate((rr) => window.__setVoidR(rr), R);
await p.waitForTimeout(2500);

const S = 620;
const clip = { x: (430 - S / 3) / 2, y: 932 / 2 - S / 6 - 40, width: S / 3, height: S / 3 };
for (const m of ['cruise', 'hungry', 'frenzy', 'victory']) {
  await p.evaluate((mm) => window.__setMood(mm), m);
  await p.waitForTimeout(3000);   // well past the 0.33s the maw lerp needs
  await p.screenshot({ path: `qa-out/smile/${WORLD}-r${R}-${m}${TAG}.png`, clip });
  console.log(`qa-out/smile/${WORLD}-r${R}-${m}${TAG}.png`);
}
// and the same two moods at REAL gameplay framing — whole phone, nothing hidden
await p.evaluate(() => document.querySelectorAll('style').forEach(() => {}));
for (const m of ['cruise', 'hungry']) {
  await p.evaluate((mm) => window.__setMood(mm), m);
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `qa-out/smile/${WORLD}-r${R}-${m}${TAG}-full.png` });
  console.log(`qa-out/smile/${WORLD}-r${R}-${m}${TAG}-full.png`);
}
await b.close();
