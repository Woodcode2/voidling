// IS THE MENU'S NAV ROW ACTUALLY READABLE? .navRow was 474px of content with
// flex-wrap: nowrap, and document.scrollWidth === innerWidth — so there was
// nothing to scroll to and the overflow was simply gone. SCRAPBOOK, the
// headline feature of this whole pass, rendered as "OOK".
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4188';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
let bad = 0;
for (const [w, h, label] of [[375, 812, 'SE / mini'], [390, 844, 'iPhone 15'], [430, 932, 'Pro Max']]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForTimeout(1200);
  const r = await p.evaluate((vw) => [...document.querySelectorAll('.navRow .navCard')].map((el) => {
    const b = el.getBoundingClientRect();
    const left = Math.max(0, b.left), right = Math.min(vw, b.right);
    return { t: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 18),
      vis: b.width > 0 ? Math.max(0, right - left) / b.width : 0 };
  }), w);
  const cut = r.filter((c) => c.vis < 0.995);
  if (cut.length) bad++;
  console.log(`${label.padEnd(11)} ${r.map((c) => `${c.t} ${Math.round(c.vis * 100)}%`).join('  |  ')}${cut.length ? '   <-- CLIPPED' : ''}`);
  await p.close();
}
await b.close();
console.log(bad ? `\n${bad} size(s) clip a nav card` : '\nevery nav card fully on screen at every size');
process.exit(bad ? 1 : 0);
