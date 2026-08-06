// STORE AUDIT probe 3 (scratch): does the MENU — the frame that becomes App
// Store screenshot 01 — fit the phone? Measured at three real iPhone widths.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const WIDTHS = [
  { name: 'iPhone SE / 13 mini', w: 375, h: 812 },
  { name: 'iPhone 15/16 (6.1")', w: 393, h: 852 },
  { name: 'iPhone 16 Pro Max (6.9")', w: 440, h: 956 },
  { name: 'shoot-store viewport', w: 430, h: 932 },
];

for (const dev of WIDTHS) {
  const p = await b.newPage({ viewport: { width: dev.w, height: dev.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidCoins', '2400'); localStorage.setItem('voidXP', '900');
    localStorage.setItem('voidStreak', '6');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch {} });
  await p.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForTimeout(3500);
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift', 'titlecard'].includes(e.id)) e.classList.remove('show'); }));
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const vw = innerWidth;
    const out = [];
    for (const id of ['btnPlay', 'btnWorlds', 'btnSolo', 'btnBook', 'btnShop', 'btnTrophies', 'btnTop', 'btnSettings']) {
      const e = document.getElementById(id); if (!e) { out.push({ id, missing: true }); continue; }
      const b = e.getBoundingClientRect();
      // the visible LABEL, not just the tile
      const lab = [...e.querySelectorAll('*')].map((c) => c.getBoundingClientRect())
        .concat([b]).reduce((a, c) => ({ l: Math.min(a.l, c.left), r: Math.max(a.r, c.right) }), { l: 1e9, r: -1e9 });
      out.push({ id, left: +b.left.toFixed(1), right: +b.right.toFixed(1),
        labL: +lab.l.toFixed(1), labR: +lab.r.toFixed(1),
        clipL: +Math.max(0, -lab.l).toFixed(1), clipR: +Math.max(0, lab.r - vw).toFixed(1),
        h: +b.height.toFixed(1) });
    }
    const build = document.getElementById('build');
    return { vw, out, build: build ? { txt: build.textContent.trim(), vis: build.offsetParent !== null } : null,
      docScrollW: document.documentElement.scrollWidth };
  });
  console.log(`\n== ${dev.name}  ${dev.w}x${dev.h} (vw=${r.vw}, scrollW=${r.docScrollW}) ==`);
  for (const o of r.out) {
    const flag = (o.clipL > 0.5 || o.clipR > 0.5) ? `  <<< CLIPPED L${o.clipL} R${o.clipR}` : '';
    console.log(`  ${(o.id + '        ').slice(0, 12)} tile[${o.left}..${o.right}] label[${o.labL}..${o.labR}] h${o.h}${flag}`);
  }
  console.log('  build stamp:', JSON.stringify(r.build));
  await p.screenshot({ path: `qa-out/store/menu-${dev.w}.png` });
  await p.close();
}
await b.close();
