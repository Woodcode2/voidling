// SCRATCH — tile a directory of PNG crops into one labelled contact sheet.
//   node qa/_sheet.mjs qa-out/skinset qa-out/skinset-sheet.png 5 [name,name,...]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const DIR = process.argv[2] || 'qa-out/skinset';
const OUT = process.argv[3] || 'qa-out/sheet.png';
const COLS = Number(process.argv[4] || 5);
const only = process.argv[5] ? process.argv[5].split(',') : null;

let files = fs.readdirSync(DIR).filter((f) => f.endsWith('.png') && !f.startsWith('_'));
if (only) files = only.map((n) => n + '.png').filter((f) => fs.existsSync(path.join(DIR, f)));
files.sort();
const imgs = files.map((f) => ({ name: f.replace(/\.png$/, ''),
  url: 'data:image/png;base64,' + fs.readFileSync(path.join(DIR, f)).toString('base64') }));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
const out = await p.evaluate(async ([list, cols]) => {
  const loaded = await Promise.all(list.map((it) => new Promise((r) => {
    const i = new Image(); i.onload = () => r({ ...it, im: i }); i.src = it.url;
  })));
  const CELL = 190, LAB = 22;
  const rows = Math.ceil(loaded.length / cols);
  const cv = document.createElement('canvas');
  cv.width = cols * CELL; cv.height = rows * (CELL + LAB);
  const x = cv.getContext('2d');
  x.fillStyle = '#101018'; x.fillRect(0, 0, cv.width, cv.height);
  loaded.forEach((it, k) => {
    const cx = (k % cols) * CELL, cy = Math.floor(k / cols) * (CELL + LAB);
    x.drawImage(it.im, cx, cy, CELL, CELL);
    x.fillStyle = '#fff'; x.font = 'bold 13px sans-serif'; x.textAlign = 'center';
    x.fillText(it.name, cx + CELL / 2, cy + CELL + 15);
  });
  return cv.toDataURL('image/png');
}, [imgs, COLS]);
fs.writeFileSync(OUT, Buffer.from(out.split(',')[1], 'base64'));
console.log(`${imgs.length} tiles -> ${OUT}`);
await b.close();
