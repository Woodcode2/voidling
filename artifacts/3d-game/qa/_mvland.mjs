// LANDSCAPE: is anything actually unreachable, or just below a fold you can
// scroll to? Tests the menu the way a child would: try to scroll it, try to
// tap SCRAPBOOK, and read back what happened.
//
// SCOPE NOTE, established before this was run: ios/App/App/Info.plist declares
// UISupportedInterfaceOrientations = [Portrait] only, and TARGETED_DEVICE_FAMILY
// = "1" (iPhone), so the SHIPPING iOS BINARY CANNOT REACH LANDSCAPE. This is a
// finding about the web/PWA build served from vercel.json — Safari does not
// implement the manifest `orientation` member, so a phone browser rotates.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4237';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const [W, H, INS, LABEL] of [
  [812, 375, { top: 0, bottom: 21, left: 44, right: 44 }, '13mini-L'],
  [844, 390, { top: 0, bottom: 21, left: 47, right: 47 }, '14-L'],
  [932, 430, { top: 0, bottom: 21, left: 59, right: 59 }, '15PM-L'],
]) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: INS });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => { try { window.__renderer.render = () => { }; } catch { } });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const m = document.getElementById('menu');
    const cs = getComputedStyle(m);
    const before = m.scrollTop;
    m.scrollTop = 9999;               // try to scroll it the way a finger would
    const after = m.scrollTop;
    m.scrollTop = before;
    const btns = ['btnPlay', 'btnWorlds', 'btnSolo', 'btnBook', 'btnShop', 'btnTrophies', 'btnTop', 'btnSettings']
      .map((id) => { const e = document.getElementById(id); if (!e) return null;
        const b = e.getBoundingClientRect();
        const vis = Math.max(0, Math.min(innerWidth, b.right) - Math.max(0, b.left))
          * Math.max(0, Math.min(innerHeight, b.bottom) - Math.max(0, b.top)) / (b.width * b.height);
        return { id, y: Math.round(b.top), h: Math.round(b.height), vis: Math.round(vis * 100) }; })
      .filter(Boolean);
    return { VW: innerWidth, VH: innerHeight, overflowY: cs.overflowY,
      scrollH: m.scrollHeight, clientH: m.clientHeight, scrolled: after - before,
      docScrollH: document.documentElement.scrollHeight, docClientH: document.documentElement.clientHeight,
      bodyOverflow: getComputedStyle(document.body).overflow, btns };
  });
  console.log(`\n${LABEL} ${W}x${H}`);
  console.log(`  #menu overflow-y:${r.overflowY}  content ${r.scrollH}px in ${r.clientH}px (${r.scrollH - r.clientH}px below the fold)`);
  console.log(`  scrollTop moved by ${r.scrolled}px when driven to 9999   document ${r.docScrollH}px in ${r.docClientH}px, body overflow:${r.bodyOverflow}`);
  for (const x of r.btns) console.log(`     ${x.id.padEnd(12)} top ${String(x.y).padStart(4)}  h${x.h}  visible ${x.vis}%`);
  // and try actually tapping SCRAPBOOK
  let tapped = 'not attempted';
  try { await p.click('#btnBook', { timeout: 4000 }); await p.waitForTimeout(500);
    tapped = await p.evaluate(() => document.getElementById('book').classList.contains('show') ? 'opened' : 'click landed, book did not open');
  } catch (e) { tapped = 'UNTAPPABLE — ' + e.message.split('\n')[0].slice(0, 60); }
  console.log(`  tap SCRAPBOOK: ${tapped}`);
  await p.screenshot({ path: `qa-out/mv/land-${LABEL}.png` });
  await p.close();
}
await b.close();
