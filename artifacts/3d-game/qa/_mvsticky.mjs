// Does the sticky PLAY AGAIN row actually SHOW the content underneath it, or
// does its gradient cover it? Box overlap alone proves nothing — a sticky row
// always overlaps what it is pinned over. So: shoot the sticky band, hide the
// content that sits under it, shoot again, and count the pixels that changed.
// Changed pixels inside the band = content visible through/around the row.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4237';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const [W, H, INS, L] of [
  [375, 667, { top: 20, bottom: 0, left: 0, right: 0 }, 'SE3'],
  [375, 812, { top: 44, bottom: 34, left: 0, right: 0 }, '13mini'],
  [430, 932, { top: 59, bottom: 34, left: 0, right: 0 }, '15PM'],
]) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: INS });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  await p.click('#worldRow .wCard[data-world="maple"]');
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2, null, { timeout: 600000 });
  await p.evaluate(() => { window.__renderer.render = () => { }; window.__setVoidR(14); window.__rushClock(4); });
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000 });
  await p.waitForTimeout(2000);
  const clip = await p.evaluate(() => { const g = document.querySelector('#end .endGo').getBoundingClientRect();
    return { x: Math.round(g.x), y: Math.round(g.y), width: Math.round(g.width), height: Math.round(g.height) }; });
  const a = (await p.screenshot({ clip })).toString('base64');
  await p.evaluate(() => { for (const id of ['endQuests', 'endNext', 'endStats'])
    { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; } });
  await p.waitForTimeout(300);
  const c = (await p.screenshot({ clip })).toString('base64');
  // decode in-page: node has no image decoder here, and drawImage from the live
  // WebGL canvas is empty anyway (preserveDrawingBuffer is off) — but a PNG
  // data URL decodes fine
  const { n, total } = await p.evaluate(async ([A, C]) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
    const ia = await load(A), ic = await load(C);
    const g = (im) => { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
      const x = cv.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data; };
    const da = g(ia), dc = g(ic);
    let n = 0;
    for (let i = 0; i < da.length; i += 4)
      if (Math.abs(da[i] - dc[i]) + Math.abs(da[i + 1] - dc[i + 1]) + Math.abs(da[i + 2] - dc[i + 2]) > 24) n++;
    return { n, total: ia.width * ia.height };
  }, [a, c]);
  console.log(`${L.padEnd(7)} ${W}x${H}  sticky row ${clip.width}x${clip.height} @y${clip.y}: ${n} of ${total} px (${(n / total * 100).toFixed(1)}%) change when the content beneath it is hidden` +
    `  -> ${n / total > 0.01 ? 'CONTENT IS VISIBLE INSIDE THE BUTTON ROW' : 'covered'}`);
  await p.evaluate(() => { for (const id of ['endQuests', 'endNext', 'endStats'])
    { const e = document.getElementById(id); if (e) e.style.visibility = ''; } });
  await p.screenshot({ path: `qa-out/mv/sticky-${L}.png`, clip });
  await p.close();
}
await b.close();
