// AUDIT 4 — IS THE GROUND ACTUALLY THERE?
//
// The ground is the largest surface in every frame and the thing a player
// stares at for three minutes. LANTERN NIGHT got a three-octave detail pass;
// the other three were deliberately left on the mix they shipped with, on the
// grounds that they had been tuned by eye against their own bakes. This
// measures whether that was the right call.
//
// The metric is DETAIL ENERGY at the frequencies a phone actually resolves:
// hide every prop so the frame IS the ground, then high-pass a patch of it at
// three radii. That isolates texture from lighting — a smooth gradient scores
// near zero however bright it is, and a grainy surface scores high however
// dark. Reporting three octaves says WHICH one is missing rather than just
// "it looks flat".
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const wid of (process.argv[2] || 'maple,pirate,gameday,lantern').split(',')) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 7, null, { timeout: 600000 });
  // hide every prop and mover and the whole overlay, so what is left IS ground
  await p.evaluate(() => {
    for (const e of window.__edibles) if (e.mesh) e.mesh.visible = false;
    document.querySelectorAll('body > *').forEach((el) => {
      if (el.tagName !== 'CANVAS' && el.tagName !== 'SCRIPT') el.style.visibility = 'hidden';
    });
    window.__setVoidR(3.0);
  });
  await p.waitForTimeout(2600);
  const shot = (await p.screenshot()).toString('base64');
  const r = await p.evaluate(async (b64) => {
    const im = await new Promise((res) => {
      const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64; });
    const c = document.createElement('canvas');
    c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    // a band above the hero: ground only, clear of the void and the chrome
    const X = (im.width * 0.12) | 0, Y = (im.height * 0.10) | 0;
    const W = (im.width * 0.76) | 0, H = (im.height * 0.24) | 0;
    const d = g.getImageData(X, Y, W, H).data;
    const lum = new Float64Array(W * H);
    for (let i = 0, k = 0; i < d.length; i += 4, k++)
      lum[k] = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    let mean = 0; for (let i = 0; i < lum.length; i++) mean += lum[i]; mean /= lum.length;
    const energyAt = (rad) => {
      let s = 0, n = 0;
      for (let y = rad; y < H - rad; y += 2) for (let x = rad; x < W - rad; x += 2) {
        const c0 = lum[y * W + x];
        const avg = (lum[(y - rad) * W + x] + lum[(y + rad) * W + x]
                   + lum[y * W + (x - rad)] + lum[y * W + (x + rad)]) / 4;
        const hp = c0 - avg; s += hp * hp; n++;
      }
      return Math.sqrt(s / (n || 1));
    };
    let v = 0; for (let i = 0; i < lum.length; i++) v += (lum[i] - mean) ** 2;
    return { mean, sd: Math.sqrt(v / lum.length),
      fine: energyAt(1), mid: energyAt(3), coarse: energyAt(8) };
  }, shot);
  console.log(`\n══ ${wid.toUpperCase()} ══  ground mean ${r.mean.toFixed(3)}   spread ${r.sd.toFixed(3)}`);
  console.log(`   detail energy   fine(1px) ${r.fine.toFixed(4)}   mid(3px) ${r.mid.toFixed(4)}   coarse(8px) ${r.coarse.toFixed(4)}`);
  console.log(`   ${(r.mid < 0.006 && r.coarse < 0.012) ? '← reads FLAT at play distance' : 'has texture at play distance'}`);
  await p.close();
}
await b.close();
