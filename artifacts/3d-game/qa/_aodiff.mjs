import { chromium } from 'playwright';
import fs from 'node:fs';
const S = '/tmp/claude-0/-home-user-voidling/1f93d8f7-3ff2-5559-8b0b-a74b62b39437/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
const r = await p.evaluate(async ([on, off]) => {
  const load = (d) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + d; });
  const A = await load(on), B = await load(off);
  const c = document.createElement('canvas'); c.width = A.width; c.height = A.height;
  const x = c.getContext('2d');
  x.drawImage(A, 0, 0); const da = x.getImageData(0, 0, A.width, A.height).data;
  x.clearRect(0, 0, c.width, c.height);
  x.drawImage(B, 0, 0); const db = x.getImageData(0, 0, A.width, A.height).data;
  // SEPARATE THE SIGNAL FROM THE ANIMATION. The crowd walks, bubbles pop and
  // the void breathes between two runs, so a raw diff measures those: the
  // largest single-pixel change came back at 238/255, which no contact shading
  // produces. Baked AO can only ever DARKEN, and only near a prop's base, so
  // the signal is small one-directional changes. Anything past 40/255 is a
  // pedestrian who moved and is excluded.
  let small = 0, tot = 0, darker = 0, lighter = 0, sumD = 0, big = 0;
  for (let i = 0; i < da.length; i += 4) {
    const la = da[i] * 0.299 + da[i + 1] * 0.587 + da[i + 2] * 0.114;
    const lb = db[i] * 0.299 + db[i + 1] * 0.587 + db[i + 2] * 0.114;
    tot++;
    const d = lb - la;               // positive = AO made it darker
    if (Math.abs(d) > 40) { big++; continue; }
    if (Math.abs(d) > 2) {
      small++; sumD += d;
      if (d > 0) darker++; else lighter++;
    }
  }
  return { small: small / tot, big: big / tot, darker, lighter, meanShift: sumD / (small || 1) };
}, [fs.readFileSync(S + 'ao-on.png').toString('base64'), fs.readFileSync(S + 'ao-off.png').toString('base64')]);
console.log(`small changes (2-40/255) : ${(r.small * 100).toFixed(1)}% of frame`);
console.log(`  of those, AO made DARKER : ${r.darker}   lighter: ${r.lighter}   (${(100 * r.darker / (r.darker + r.lighter)).toFixed(0)}% darker)`);
console.log(`  mean shift               : ${r.meanShift.toFixed(2)}/255 darker`);
console.log(`excluded as animation (>40): ${(r.big * 100).toFixed(1)}% of frame`);
await b.close();
