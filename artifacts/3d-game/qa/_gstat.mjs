// THE VALUE AND HUE STRUCTURE OF A REAL MATCH, not of one composed frame.
//   node qa/_gstat.mjs [worlds] [port]
//
// Shoots N frames per world at DPR 1 while the void is actually driven around,
// decodes each in-page (preserveDrawingBuffer is off, so the PNG has to be
// re-decoded as a data URL) and reports, per frame: the p05-p95 luminance
// range, mean saturation, and how many 12ths of the hue wheel hold more than
// 2% of the saturated pixels. The HUD bands are cropped out so this measures
// the GAME, not the chrome.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
const PORT = process.argv[3] || '4231';
const N = +(process.argv[4] || 10);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(300000);
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });
  await p.evaluate(() => window.__pinQuality(0));
  await p.evaluate(() => {
    const cv = document.querySelector('canvas');
    const send = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { pointerId: 1, clientX: x, clientY: y, bubbles: true, isPrimary: true }));
    send('pointerdown', innerWidth / 2, innerHeight * 0.72);
    window.__qaAim = 0;
    window.__qaSteer = () => { window.__qaAim += 0.8;
      send('pointermove', innerWidth / 2 + Math.cos(window.__qaAim) * 110, innerHeight * 0.72 + Math.sin(window.__qaAim) * 110); };
  });
  // hide the DOM chrome so the statistics are of the rendered world only
  await p.addStyleTag({ content: 'body > *:not(canvas){visibility:hidden!important}' });
  const rows = [];
  for (let i = 0; i < N; i++) {
    await p.evaluate(() => window.__qaSteer());
    const t0 = await p.evaluate(() => window.__matchState().t);
    await p.waitForFunction(t => window.__matchState().t > t + 8, t0, { timeout: 300000 });
    const shot = (await p.screenshot()).toString('base64');
    const r = await p.evaluate(async (b64) => {
      const im = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64; });
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, im.width, im.height).data;
      const Ls = []; let satSum = 0, n = 0; const hist = new Array(12).fill(0); let hw = 0;
      for (let i = 0; i < d.length; i += 4 * 7) {   // every 7th pixel is plenty
        const R = d[i] / 255, G = d[i + 1] / 255, B = d[i + 2] / 255;
        const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
        const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
        const s = mx > 0 ? (mx - mn) / mx : 0;
        Ls.push(L); satSum += s; n++;
        if (s > 0.15) { let h;
          const dd = mx - mn;
          if (dd < 1e-6) h = 0; else if (mx === R) h = (((G - B) / dd) % 6 + 6) % 6;
          else if (mx === G) h = (B - R) / dd + 2; else h = (R - G) / dd + 4;
          hist[Math.min(11, Math.floor(h / 6 * 12))] += s; hw += s; }
      }
      Ls.sort((a, b) => a - b);
      const q = f => Ls[Math.floor(Ls.length * f)];
      return { t: +window.__matchState().t.toFixed(0), r: +window.__voidState().r.toFixed(1),
        range: +(q(0.95) - q(0.05)).toFixed(3), mean: +(Ls.reduce((a, x) => a + x, 0) / Ls.length).toFixed(3),
        sat: +(satSum / n).toFixed(3), hues: hist.filter(v => v / Math.max(hw, 1e-6) > 0.02).length };
    }, shot);
    rows.push(r);
  }
  const med = k => { const v = rows.map(x => x[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  console.log(`\n══ ${wid.toUpperCase()} ══ ${rows.length} frames, t=${rows[0]?.t}..${rows.at(-1)?.t}s of match time`);
  console.log(`  median p05-p95 luminance RANGE ${med('range')}   mean luminance ${med('mean')}   saturation ${med('sat')}   hue bins >2%: ${med('hues')}/12`);
  console.log('  ' + rows.map(r => `t${r.t}/r${r.r}:${r.range}`).join('  '));
  await p.close();
}
await b.close();
