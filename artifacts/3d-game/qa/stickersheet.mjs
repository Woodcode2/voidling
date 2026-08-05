// THE WHOLE BOOK, ON ONE PAGE.
//
//   node qa/stickersheet.mjs
//
// Renders every sticker card that exists on the book's own dark panel, in
// world order, so the set can be judged as a SET — which is the only way it
// matters. A card that is lovely on its own and wrong next to its neighbours
// is a failed card.
import { chromium } from 'playwright';
import fs from 'node:fs';

const src = fs.readFileSync('src/game/stickers.ts', 'utf8');
const all = [...src.matchAll(/\{ id: '([^']+)', world: '([^']+)'/g)].map((m) => ({ id: m[1], world: m[2] }));
const have = all.filter((s) => fs.existsSync(`public/assets/stickers/${s.id}.webp`));
const imgs = have.map((s) => fs.readFileSync(`public/assets/stickers/${s.id}.webp`).toString('base64'));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const out = await p.evaluate(async ({ have, imgs }) => {
  const COLS = 8, S = 190, LBL = 26;
  const rows = Math.ceil(have.length / COLS);
  const c = document.createElement('canvas');
  c.width = COLS * S; c.height = rows * (S + LBL);
  const x = c.getContext('2d');
  x.fillStyle = '#150f24'; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < have.length; i++) {
    const im = new Image(); im.src = 'data:image/webp;base64,' + imgs[i]; await im.decode();
    const cx = (i % COLS) * S, cy = Math.floor(i / COLS) * (S + LBL);
    // the pale plate the real cell draws, so this is what a child sees
    x.save();
    x.beginPath(); x.arc(cx + S / 2, cy + S / 2, S * 0.44, 0, 7); x.closePath();
    x.fillStyle = 'rgba(255,255,255,0.90)'; x.fill();
    x.clip(); x.drawImage(im, cx + S * 0.08, cy + S * 0.08, S * 0.84, S * 0.84);
    x.restore();
    x.fillStyle = '#cbb8e8'; x.font = '600 13px system-ui'; x.textAlign = 'center';
    x.fillText(have[i].id, cx + S / 2, cy + S + 16);
  }
  return c.toDataURL('image/png');
}, { have, imgs });
fs.writeFileSync('qa-out/sticker-book.png', Buffer.from(out.split(',')[1], 'base64'));
console.log(`qa-out/sticker-book.png — ${have.length} of ${all.length}`);
await b.close();
