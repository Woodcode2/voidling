// The HUD is laid out in vw units (#timer left:42vw, #board max-width:38vw,
// #growth min(92vw,460px)). Does it still hold together on an iPad, which the
// App Store requires? Measures the same elements at four device sizes.
import { chromium } from 'playwright';
const PORT = process.argv[2] || 4188;
const SIZES = [
  ['iPhone SE      ', 375, 667],
  ['iPhone 15 Pro  ', 393, 852],
  ['iPhone 15 P Max', 430, 932],
  ['iPad 10.9 port ', 820, 1180],
  ['iPad 12.9 land ', 1366, 1024],
];
const PICK = ['timer', 'board', 'coins', 'growth', 'news', 'btnQuit', 'guide'];

const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [name, w, h] of SIZES) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, isMobile: w < 800 });
    p.setDefaultTimeout(180000);
    await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'commit', timeout: 120000 });
    await p.waitForFunction(() => { const l = document.getElementById('loadScr'); return l && !l.classList.contains('boot') && !l.classList.contains('show'); }, null, { timeout: 240000 }).catch(() => {});
    await p.waitForTimeout(3000);
    await p.evaluate(() => { window.__setVoidR?.(3.0); window.__news?.(); });
    await p.waitForTimeout(1500);
    const r = await p.evaluate((ids) => {
      const o = {};
      for (const id of ids) {
        const n = document.getElementById(id);
        if (!n) continue;
        const c = getComputedStyle(n);
        const b = n.getBoundingClientRect();
        o[id] = { x: +b.x.toFixed(0), y: +b.y.toFixed(0), w: +b.width.toFixed(0), h: +b.height.toFixed(0),
          cx: +(b.x + b.width / 2).toFixed(0), fs: c.fontSize, hidden: c.display === 'none' || +c.opacity < 0.05 };
      }
      o._screen = { w: innerWidth, h: innerHeight, cx: innerWidth / 2 };
      return o;
    }, PICK);
    console.log(`\n### ${name} ${w}x${h}  (screen centre x=${r._screen.cx})`);
    for (const id of PICK) {
      const e = r[id]; if (!e) continue;
      const off = e.cx - r._screen.cx;
      console.log(`  #${id.padEnd(9)} ${String(e.x).padStart(5)},${String(e.y).padStart(5)} ${String(e.w).padStart(5)}x${String(e.h).padStart(4)} `
        + `centre ${String(e.cx).padStart(5)} (${off >= 0 ? '+' : ''}${off.toFixed(0)} from screen centre) ${e.fs.padStart(8)}${e.hidden ? '  [hidden]' : ''}`);
    }
    await p.close();
  }
  await b.close();
};
run().catch((e) => { console.error(e); process.exit(1); });
