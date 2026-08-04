// THE DEFINITION SWEEP. Shoots the hero at gameplay size under a set of
// candidate body palettes and tiles them into one contact sheet.
//
//   node qa/voidgrid.mjs [world] [radius]
//
// The owner's note is that hole.io looks "more dialed" and ours does not, and
// on a portrait of the shipped hero the reason is legible: the Classic palette
// runs inner 0x6128ad, mid 0x8f4ce6, rim 0xb678ff — three neighbouring purples.
// There is no dark heart and the "lit rim" is barely a shade off the body, so a
// COLOSSUS renders as one flat bright mass with no silhouette and no interior.
// Every premium skin in the same file already knows better: King Void is
// abyss 0x0d0618 with a gold rim, and its own comment says "body stays dark,
// the RIM is the gold". This sweeps that idea back onto the default.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const R = Number(process.argv[3] || 7);
fs.mkdirSync('qa-out', { recursive: true });

// id, abyss, inner, mid, rim, glow
const SET = [
  ['shipped', 0x321253, 0x6128ad, 0x8f4ce6, 0xb678ff, 0xb875ff],
  ['dark heart', 0x140628, 0x3d1878, 0x7a3ad0, 0xc98cff, 0xb875ff],
  ['deep + hot rim', 0x0d0420, 0x33146a, 0x6d2fc4, 0xdba4ff, 0xc79aff],
  ['near black core', 0x08030f, 0x2a1060, 0x6428bc, 0xd08cff, 0xbe86ff],
  ['high contrast', 0x0a0418, 0x2d1170, 0x7331d4, 0xefc4ff, 0xd0a0ff],
  ['cool abyss', 0x0b0a22, 0x2c1a72, 0x6a3ad2, 0xd6a8ff, 0xc0a0ff],
  ['saturated', 0x120333, 0x3a0f92, 0x7a24e0, 0xd68cff, 0xc47aff],
  ['ink + violet', 0x050308, 0x241055, 0x5f2ab4, 0xcb99ff, 0xb98cff],
];

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
await p.addStyleTag({ content: '#news,#hud,#stageBar,.bub,#btnHome,#coins,#rank{opacity:0!important}' });
await p.evaluate((rr) => window.__setVoidR(rr), R);
await p.waitForTimeout(2400);

const S = 210;                                   // crop side, CSS px
const shots = [];
for (const [name, abyss, inner, mid, rim, glow] of SET) {
  await p.evaluate(([a, i, m, r2, g]) => window.__setSkin(
    { id: 'qa', name: 'qa', abyss: a, inner: i, mid: m, rim: r2, glow: g }),
  [abyss, inner, mid, rim, glow]);
  await p.waitForTimeout(500);
  const buf = await p.screenshot({ clip: { x: (430 - S) / 2, y: 932 / 2 - S / 2 - 40, width: S, height: S } });
  shots.push([name, buf.toString('base64')]);
  console.log(name);
}
await p.close();

// tile
const t = await b.newPage({ viewport: { width: 4 * S * 3 + 5, height: 2 * (S * 3 + 44) } });
const sheet = await t.evaluate(async ({ shots, S }) => {
  const px = S * 3;
  const c = document.createElement('canvas');
  c.width = 4 * px; c.height = 2 * (px + 44);
  const x = c.getContext('2d');
  x.fillStyle = '#15101f'; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < shots.length; i++) {
    const im = new Image(); im.src = 'data:image/png;base64,' + shots[i][1]; await im.decode();
    const cx = (i % 4) * px, cy = Math.floor(i / 4) * (px + 44);
    x.drawImage(im, cx, cy + 44);
    x.fillStyle = '#fff'; x.font = 'bold 26px system-ui';
    x.fillText(shots[i][0], cx + 12, cy + 32);
  }
  return c.toDataURL('image/png');
}, { shots, S });
fs.writeFileSync('qa-out/void-grid.png', Buffer.from(sheet.split(',')[1], 'base64'));
console.log('qa-out/void-grid.png');
await b.close();
