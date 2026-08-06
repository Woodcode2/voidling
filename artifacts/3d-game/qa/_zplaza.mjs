// Whole-frame analysis: how much of the frame is the dark-red plaza, what is
// its sd across the WHOLE region (not one patch), and how many emissive pixels
// are on screen.
import { chromium } from 'playwright';
import fs from 'node:fs';
const file = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.goto('about:blank');
const r = await p.evaluate(async ({ u }) => {
  const img = new Image(); img.src = u; await img.decode();
  const W = img.width, H = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H).data;
  // HUD bands to exclude: top 300px (leaderboard/timer), the news card, bottom 200
  const inHud = (x, y) => (y < 430) || (y > H - 190);
  // classify "dark red plaza": r>g, r>b, r in 60..130, g<70
  let plaza = 0, total = 0, sum = 0, sum2 = 0, n = 0;
  let lum = new Float64Array(0);
  const vals = [];
  let hot = 0, warmHot = 0, maxL = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, R = d[i], G = d[i+1], B = d[i+2];
    const L = 0.2126*R + 0.7152*G + 0.0722*B;
    if (!inHud(x, y)) {
      total++;
      if (L > maxL) maxL = L;
      if (L > 150) { hot++; if (R > G && G > B) warmHot++; }
      if (R > G + 18 && R > B + 12 && R >= 55 && R <= 140 && G < 75) {
        plaza++; vals.push(G); sum += G; sum2 += G*G; n++;
      }
    }
  }
  const m = sum/n, sd = Math.sqrt(sum2/n - m*m);
  return { W, H, total, plaza, frac: +(plaza/total).toFixed(4), gMean:+m.toFixed(2), gSd:+sd.toFixed(2),
           hot, hotPct: +(100*hot/total).toFixed(3), warmHot, warmPct: +(100*warmHot/total).toFixed(3), maxL:+maxL.toFixed(1) };
}, { u: 'data:image/png;base64,' + fs.readFileSync(file).toString('base64') });
await b.close();
console.log(file, JSON.stringify(r));
