// Tile the portraits _gh_hero.mjs wrote into one contact sheet, every void
// scaled to the SAME square so the character can be compared across size and
// world by eye as well as by number.
//
//   node qa/_gh_sheet.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLDS = ['maple', 'pirate', 'gameday', 'lantern'];
const RADII = ['1.2', '3', '6', '9', '12'];
const cells = [];
for (const w of WORLDS) for (const r of RADII) {
  const f = `qa-out/gh/${w}-r${r}.png`;
  cells.push({ w, r, b64: fs.existsSync(f) ? fs.readFileSync(f).toString('base64') : null });
}
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 1400, height: 1200 } });
const png = await p.evaluate(async ({ cells, RADII, WORLDS }) => {
  const S = 300, PAD = 46;
  const c = document.createElement('canvas');
  c.width = RADII.length * S + 120; c.height = WORLDS.length * (S + PAD) + 40;
  const x = c.getContext('2d');
  x.fillStyle = '#12101a'; x.fillRect(0, 0, c.width, c.height);
  x.font = 'bold 24px system-ui'; x.fillStyle = '#fff';
  RADII.forEach((r, i) => x.fillText('r=' + r, 120 + i * S + S / 2 - 24, 30));
  for (let k = 0; k < cells.length; k++) {
    const row = Math.floor(k / RADII.length), col = k % RADII.length;
    const cy = 40 + row * (S + PAD), cx = 120 + col * S;
    if (col === 0) {
      x.save(); x.translate(24, cy + S / 2); x.rotate(-Math.PI / 2);
      x.font = 'bold 22px system-ui'; x.fillStyle = '#cfc4e8';
      x.textAlign = 'center'; x.fillText(cells[k].w.toUpperCase(), 0, 0); x.restore();
      x.textAlign = 'left';
    }
    if (!cells[k].b64) continue;
    const im = new Image(); im.src = 'data:image/png;base64,' + cells[k].b64; await im.decode();
    x.drawImage(im, cx + 4, cy + 4, S - 8, S - 8);
  }
  return c.toDataURL('image/png');
}, { cells, RADII, WORLDS });
fs.writeFileSync('qa-out/gh/CONTACT-SHEET.png', Buffer.from(png.split(',')[1], 'base64'));
console.log('qa-out/gh/CONTACT-SHEET.png');
await b.close();
