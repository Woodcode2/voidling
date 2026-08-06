import { chromium } from 'playwright';

const SIZES = [
  ['iPhone SE', 375, 667],
  ['iPhone 14', 390, 844],
  ['Pro Max', 430, 932],
];

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});

for (const [name, w, h] of SIZES) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); } catch(e){} });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:4177/?w=maple', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => {
    const m = document.getElementById('menu');
    const l = document.getElementById('loadScr');
    return m && m.getBoundingClientRect().width > 0 && (!l || getComputedStyle(l).display === 'none' || l.style.display === 'none' || +getComputedStyle(l).opacity === 0);
  }, null, { timeout: 240000 });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const out = {};
    const row = document.querySelector('.navRow');
    if (row) {
      const rb = row.getBoundingClientRect();
      out.navRow = { left: Math.round(rb.left), right: Math.round(rb.right), w: Math.round(rb.width) };
      out.cards = [...row.children].map(c => {
        const b = c.getBoundingClientRect();
        const label = (c.textContent || '').trim().replace(/\s+/g, ' ');
        const visL = Math.max(0, b.left), visR = Math.min(innerWidth, b.right);
        return { label, l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width),
                 visible: Math.round(Math.max(0, visR - visL)),
                 pctVisible: Math.round(100 * Math.max(0, visR - visL) / b.width) };
      });
      out.wraps = getComputedStyle(row).flexWrap;
    }
    out.vw = innerWidth;
    // does the page scroll horizontally?
    out.docScrollW = document.documentElement.scrollWidth;
    // menu vertical fit
    const menu = document.getElementById('menu');
    if (menu) out.menuScrollH = menu.scrollHeight, out.menuClientH = menu.clientHeight;
    return out;
  });
  console.log(name, w + 'x' + h, JSON.stringify(r, null, 1));
  await ctx.close();
}
await b.close();
