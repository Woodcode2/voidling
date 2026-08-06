// WHAT IS THE PROCEDURAL SKY TEXTURE ACTUALLY MADE OF?
// Reads scene.background's source canvas and reports the mean colour of the
// zenith, middle and nadir bands, plus the colours island.ts derives from
// WORLD.space. The camera in this game only ever looks DOWN, so which end of
// the gradient sits at the nadir is the whole question.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'lantern';
const PORT = process.argv[3] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
p.setDefaultTimeout(400000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

const r = await p.evaluate(() => {
  const tex = window.__scene.background;
  const img = tex.image;
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const band = (y0, y1) => {
    const d = g.getImageData(0, y0, img.width, y1 - y0).data;
    let R = 0, G = 0, B = 0; const n = d.length / 4;
    for (let i = 0; i < n; i++) { R += d[i*4]; G += d[i*4+1]; B += d[i*4+2]; }
    const hx = v => Math.round(v/n).toString(16).padStart(2,'0');
    return `#${hx(R)}${hx(G)}${hx(B)}  mean ${Math.round((R+G+B)/(3*n))}/255`;
  };
  return {
    size: `${img.width}x${img.height}`, flipY: tex.flipY, mapping: tex.mapping,
    rowTOP_of_canvas: band(0, 40),
    row25: band(250, 290),
    row50: band(500, 540),
    row75: band(760, 800),
    rowBOTTOM_of_canvas: band(984, 1024),
  };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
