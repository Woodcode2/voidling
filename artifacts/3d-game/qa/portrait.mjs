// A PORTRAIT OF THE HERO, big enough to actually judge.
//
//   node qa/portrait.mjs [world] [radius...]
//
// Every fidelity argument about the void has been had at gameplay size, where
// he is a couple of hundred pixels across and everything looks fine. This
// frames him tight and shoots at 3x so the silhouette, the rim, the interior
// and the face can be judged the way a reviewer with a big phone judges them.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const RS = process.argv.slice(3).map(Number).filter((n) => n > 0);
const radii = RS.length ? RS : [1.4, 5, 10];
fs.mkdirSync('qa-out/portrait', { recursive: true });

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
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 600000 });
// the ticker and the bubbles crowd the frame and none of them are the subject
await p.addStyleTag({ content: '#news,#hud,#stageBar,.bub,#btnHome,#coins{opacity:0!important}' });

for (const r of radii) {
  await p.evaluate((rr) => window.__setVoidR(rr), r);
  await p.waitForTimeout(2600);
  // he sits at screen centre by construction; crop a square around him
  const S = 620;
  await p.screenshot({ path: `qa-out/portrait/${WORLD}-r${r}.png`,
    clip: { x: (430 - S / 3) / 2, y: 932 / 2 - S / 6 - 40, width: S / 3, height: S / 3 } });
  console.log(`qa-out/portrait/${WORLD}-r${r}.png`);
}
await b.close();
