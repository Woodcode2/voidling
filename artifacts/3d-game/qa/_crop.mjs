// Crop and magnify a region of a shot so a character can be judged at the size
// a reviewer's eye judges it, rather than at whatever the page happened to be.
//
//   node qa/_crop.mjs <png> <cx> <cy> <size> [zoom] [out]
//
// cx/cy/size are in the PNG's own pixels. Nearest-neighbour on purpose: a
// smooth upscale invents edges, and edges are the thing under review.
import { chromium } from 'playwright';
import fs from 'node:fs';

const [FILE, CX, CY, S, Z = 3, OUT = 'qa-out/family/_crop.png'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
const uri = `data:image/png;base64,${fs.readFileSync(FILE).toString('base64')}`;
const png = await p.evaluate(async ([u, cx, cy, s, z]) => {
  const im = new Image(); im.src = u; await im.decode();
  const cv = document.createElement('canvas'); cv.width = s * z; cv.height = s * z;
  const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  x.drawImage(im, cx - s / 2, cy - s / 2, s, s, 0, 0, s * z, s * z);
  return cv.toDataURL('image/png');
}, [uri, +CX, +CY, +S, +Z]);
fs.writeFileSync(OUT, Buffer.from(png.split(',')[1], 'base64'));
console.log(OUT);
await b.close();
