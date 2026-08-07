// THE TOP BAND: at what wallet size does the coin chip reach the clock?
// #timer is `left: 42vw; right: 8px; text-align: center` (index.html:30) and
// #coins is `right: calc(12px + inset)` (index.html:285). Both are content-
// sized on the right, so the collision is a function of the coin COUNT, which
// only grows. Measured on the clock's INK (a Range over its text node), not on
// its box — the box is a fixed lane and always overlaps the chip.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4237';
const DEVICES = [
  [375, 667, { top: 20, bottom: 0, left: 0, right: 0 }, 'SE3     '],
  [375, 812, { top: 44, bottom: 34, left: 0, right: 0 }, '13mini  '],
  [390, 844, { top: 47, bottom: 34, left: 0, right: 0 }, '14      '],
  [430, 932, { top: 59, bottom: 34, left: 0, right: 0 }, '15PM    '],
];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const [W, H, INS, LABEL] of DEVICES) {
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
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });
  await p.evaluate(() => { window.__renderer.render = () => { }; });
  const rows = await p.evaluate(() => {
    const c = document.getElementById('coins'), t = document.getElementById('timer');
    const out = [];
    for (const n of [0, 150, 1000, 5000, 10000, 25000, 99999]) {
      c.textContent = '✦ ' + n;   // the SHIPPED format: prototype3d.ts:1420 is `✦ ${coins}`, no thousands separator
      const a = c.getBoundingClientRect();
      const rg = document.createRange(); rg.selectNodeContents(t);
      const ink = rg.getBoundingClientRect();
      out.push({ n, clock: t.textContent.trim(), gap: Math.round(a.left - ink.right) });
    }
    return out;
  });
  console.log(`${LABEL} ${W}x${H}  clock "${rows[0].clock}"   ` +
    rows.map(r => `${r.n}:${r.gap >= 0 ? ' ' : ''}${r.gap}px`).join('  '));
  const first = rows.find(r => r.gap < 4);
  console.log(`${' '.repeat(8)}   first wallet value with <4px of air between chip and clock: ${first ? String(first.n) : 'none up to 99,999'}`);
  await p.close();
}
await b.close();
