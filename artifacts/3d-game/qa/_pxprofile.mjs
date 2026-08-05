// A LUMINANCE PROFILE ACROSS A SHOT, so "the hero is a hole and the rival is a
// lamp" stops being an opinion.
//
//   node qa/_pxprofile.mjs <png> <y-fraction> [samples]
//
// Prints relative luminance along one horizontal scanline, plus the darkest and
// brightest run in it. A void that is a PIT has its minimum in the middle of
// its own disc and its maximum at the silhouette; a void that is a BALL does
// not. Decoding happens in a blank page's canvas because that is the only PNG
// decoder this repo has (see the note at the top of qa/artaudit.mjs).
import { chromium } from 'playwright';
import fs from 'node:fs';

const FILE = process.argv[2];
const YF = Number(process.argv[3] ?? 0.5);
const N = Number(process.argv[4] || 120);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
const uri = `data:image/png;base64,${fs.readFileSync(FILE).toString('base64')}`;
const out = await p.evaluate(async ([u, yf, n]) => {
  const im = new Image(); im.src = u; await im.decode();
  const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
  const x = cv.getContext('2d'); x.drawImage(im, 0, 0);
  const y = Math.round(im.height * yf);
  const d = x.getImageData(0, y, im.width, 1).data;
  const row = [];
  for (let i = 0; i < n; i++) {
    const px = Math.round((i / (n - 1)) * (im.width - 1));
    const o = px * 4;
    row.push([px, +(0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2]).toFixed(1),
      `${d[o]},${d[o + 1]},${d[o + 2]}`]);
  }
  return { w: im.width, h: im.height, y, row };
}, [uri, YF, N]);
console.log(`${FILE}  ${out.w}x${out.h}  scanline y=${out.y}`);
const L = out.row.map((r) => r[1]);
console.log(`min ${Math.min(...L).toFixed(1)}  max ${Math.max(...L).toFixed(1)}`);
console.log('x,lum,rgb');
for (const r of out.row) console.log(r.join(','));
await b.close();
