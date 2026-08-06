// BEFORE / AFTER on the hero's definition, same frame, same second.
//
//   node qa/voidab.mjs [world] [r1] [r2]
//
// Both panels are the LIVE build; the left one is repainted back to the palette
// that shipped through the QA skin hook, so nothing about the comparison
// depends on rebuilding or on my memory of what it used to look like.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const RS = [Number(process.argv[3] || 3), Number(process.argv[4] || 8)];
const OLD = { id: 'qa', name: 'qa', abyss: 0x321253, inner: 0x6128ad, mid: 0x8f4ce6, rim: 0xb678ff, glow: 0xb875ff };
const NEW = { id: 'qa', name: 'qa', abyss: 0x050308, inner: 0x241055, mid: 0x5f2ab4, rim: 0xcb99ff, glow: 0xb98cff };

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
await p.addStyleTag({ content: '#news,#hud,#stageBar,.vb,.vf,#btnHome,#coins,#rank{opacity:0!important}' });

const S = 240;
const cells = [];
for (const r of RS) {
  await p.evaluate((rr) => window.__setVoidR(rr), r);
  await p.waitForTimeout(3200);                       // let the camera finish easing
  for (const [tag, skin] of [['BEFORE', OLD], ['AFTER', NEW]]) {
    await p.evaluate((s) => window.__setSkin(s), skin);
    await p.waitForTimeout(600);
    const buf = await p.screenshot({ clip: { x: (430 - S) / 2, y: 932 / 2 - S / 2 - 40, width: S, height: S } });
    cells.push([`${tag}  r=${r}`, buf.toString('base64')]);
  }
}
await p.close();

const t = await b.newPage({ viewport: { width: 2 * S * 3, height: 2 * (S * 3 + 46) } });
const sheet = await t.evaluate(async ({ cells, S }) => {
  const px = S * 3;
  const c = document.createElement('canvas');
  c.width = 2 * px; c.height = 2 * (px + 46);
  const x = c.getContext('2d');
  x.fillStyle = '#120e1c'; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < cells.length; i++) {
    const im = new Image(); im.src = 'data:image/png;base64,' + cells[i][1]; await im.decode();
    const cx = (i % 2) * px, cy = Math.floor(i / 2) * (px + 46);
    x.drawImage(im, cx, cy + 46);
    x.fillStyle = i % 2 ? '#8ef0a0' : '#ff9a9a';
    x.font = 'bold 28px system-ui';
    x.fillText(cells[i][0], cx + 14, cy + 34);
  }
  return c.toDataURL('image/png');
}, { cells, S });
fs.writeFileSync('qa-out/void-ab.png', Buffer.from(sheet.split(',')[1], 'base64'));
console.log('qa-out/void-ab.png');
await b.close();
