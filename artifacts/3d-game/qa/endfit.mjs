// Does the results panel fit? #end is `display:flex; justify-content:center;
// overflow-y:auto` — when the content is taller than the viewport a centred
// flex column overflows in BOTH directions and the top is unreachable, because
// scrollTop cannot go negative. Measures the real overflow per device.
import { chromium } from 'playwright';
const PORT = process.argv[2] || 4188;
const SIZES = [['iPhone SE', 375, 667], ['iPhone 15 Pro', 393, 852], ['iPhone 15 Pro Max', 430, 932], ['iPad 10.9', 820, 1180]];

const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [name, w, h] of SIZES) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, isMobile: w < 800 });
    p.setDefaultTimeout(180000);
    await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'commit', timeout: 120000 });
    await p.waitForFunction(() => { const l = document.getElementById('loadScr'); return l && !l.classList.contains('boot') && !l.classList.contains('show'); }, null, { timeout: 240000 }).catch(() => {});
    await p.waitForTimeout(2500);
    await p.evaluate(() => { const r = window.__renderer; r.render = () => {}; window.__setVoidR?.(4.5); });
    await p.waitForTimeout(1500);
    await p.evaluate(() => window.__rushClock(0.05));
    await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 120000 }).catch(() => {});
    await p.waitForTimeout(2000);
    const r = await p.evaluate(() => {
      const e = document.getElementById('end');
      const g = (id) => { const n = document.getElementById(id); if (!n) return null; const b = n.getBoundingClientRect(); return { top: +b.top.toFixed(0), bottom: +b.bottom.toFixed(0), h: +b.height.toFixed(0) }; };
      return { scrollH: e.scrollHeight, clientH: e.clientHeight, scrollTop: e.scrollTop,
        hd: g('endHd'), again: g('btnAgain'), home: g('btnHome'), shop: g('endShop'),
        vh: innerHeight };
    });
    const clippedTop = r.hd ? Math.max(0, -r.hd.top) : 0;
    const belowFold = r.home ? Math.max(0, r.home.bottom - r.vh) : 0;
    console.log(`\n### ${name} ${w}x${h}`);
    console.log(`  content ${r.scrollH}px into ${r.clientH}px viewport  -> overflow ${r.scrollH - r.clientH}px`);
    console.log(`  headline #endHd  top=${r.hd?.top} h=${r.hd?.h}   ${clippedTop ? `*** ${clippedTop}px CLIPPED ABOVE THE SCREEN, UNREACHABLE ***` : 'fully visible'}`);
    console.log(`  #btnAgain bottom=${r.again?.bottom} (viewport ${r.vh})`);
    console.log(`  #btnHome  bottom=${r.home?.bottom}  ${belowFold ? `*** ${belowFold}px BELOW THE FOLD ***` : 'visible'}`);
    await p.close();
  }
  await b.close();
};
run().catch((e) => { console.error(e); process.exit(1); });
