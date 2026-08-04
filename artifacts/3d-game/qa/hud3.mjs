// Pass 3: the RETURNING-player menu (first launch skips it entirely — see
// prototype3d.ts "FIRST LAUNCH: no menu"), the world picker, and the results
// screen — reached by stubbing the renderer so the sim runs at its real rate
// instead of swiftshader's 1/9-1/40.
import { chromium } from 'playwright';
import fs from 'node:fs';
const PORT = process.argv[2] || 4188;
const OUT = 'qa-out';
fs.mkdirSync(OUT, { recursive: true });
const VP = { width: 393, height: 852 };

const MEASURE = () => {
  const out = [];
  const vis = (n) => { let e = n; while (e && e !== document.documentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false; e = e.parentElement; } return true; };
  for (const n of document.body.querySelectorAll('*')) {
    if (n.tagName === 'SVG' || n.closest('svg')) continue;
    if (!vis(n)) continue;
    const r = n.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.bottom < -40 || r.top > innerHeight + 40 || r.right < 0 || r.left > innerWidth) continue;
    const c = getComputedStyle(n);
    out.push({ id: n.id || null, cls: typeof n.className === 'string' ? n.className : null, tag: n.tagName.toLowerCase(),
      x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), cx: +(r.x + r.width / 2).toFixed(1),
      z: c.zIndex, fs: c.fontSize, fw: c.fontWeight, color: c.color,
      btn: n.tagName === 'BUTTON' || c.cursor === 'pointer',
      txt: (n.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 62) });
  }
  return out;
};
const fmt = (e) => `${(e.id ? '#' + e.id : '.' + (e.cls || e.tag)).slice(0, 24).padEnd(25)}`
  + `${String(e.x).padStart(6)},${String(e.y).padStart(6)} ${String(e.w).padStart(6)}x${String(e.h).padStart(5)} `
  + `cx${String(e.cx).padStart(6)} z${(e.z || '-').padEnd(4)} ${e.fs.padStart(7)}/${e.fw.padEnd(3)}${e.btn ? ' BTN' : '    '} ${e.txt ? '"' + e.txt + '"' : ''}`;
const dump = (t, a) => { console.log(`\n=== ${t} ===`); for (const e of a) console.log(fmt(e)); };
const small = (t, a) => { const s = a.filter((e) => e.btn && (e.w < 44 || e.h < 44)); if (s.length) { console.log(`\n-- ${t}: tap targets under 44pt --`); for (const e of s) console.log(`   ${(e.id || e.cls)} ${e.w}x${e.h} "${e.txt}"`); } };

const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: VP, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  p.setDefaultTimeout(180000);
  // returning player: menu exists, tutorial already seen
  await p.addInitScript(() => {
    localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidXP', '260');       // mid-ladder, so the rank chip has something to say
    localStorage.setItem('voidCoins', '480');
    localStorage.setItem('voidLastDay', new Date().toDateString());  // suppress the daily modal
  });
  await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'commit', timeout: 120000 });
  await p.waitForFunction(() => { const l = document.getElementById('loadScr'); return l && !l.classList.contains('boot') && !l.classList.contains('show'); }, null, { timeout: 240000 }).catch(() => console.log('! boot never lifted'));
  await p.waitForTimeout(2500);

  const menu = await p.evaluate(MEASURE);
  dump('MENU (returning player)', menu); small('MENU', menu);
  await p.screenshot({ path: `${OUT}/hud3-menu.png`, animations: 'disabled', timeout: 180000 });

  // the daily-reward modal gates the menu on the first session of a day
  await p.evaluate(() => document.getElementById('dailyClaim')?.click());
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('daily')?.classList.remove('show'));
  await p.waitForTimeout(400);
  await p.click('#btnPlay');
  await p.waitForTimeout(1200);
  const picker = await p.evaluate(MEASURE);
  dump('WORLD PICKER (what PLAY opens)', picker); small('PICKER', picker);
  await p.screenshot({ path: `${OUT}/hud3-picker.png`, animations: 'disabled', timeout: 180000 });

  await p.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]').dispatchEvent(new Event('click', { bubbles: true })));
  await p.waitForTimeout(15000);
  await p.evaluate(() => { window.__setVoidR?.(3.4); });
  await p.waitForTimeout(3000);

  // stub the renderer so the sim runs at its true rate, then run the clock out
  await p.evaluate(() => { const r = window.__renderer; window.__realRender = r.render.bind(r); r.render = () => {}; window.__rushClock(0.05); });
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 120000 })
    .then(() => console.log('\nRESULTS SHOWN: true'))
    .catch(() => console.log('\nRESULTS SHOWN: false (timed out)'));
  await p.evaluate(() => { if (window.__realRender) window.__renderer.render = window.__realRender; });
  await p.waitForTimeout(3500);

  const end = await p.evaluate(MEASURE);
  dump('RESULTS SCREEN', end); small('RESULTS', end);
  await p.screenshot({ path: `${OUT}/hud3-end.png`, animations: 'disabled', timeout: 180000 });
  const sc = await p.evaluate(() => { const e = document.getElementById('end'); return { scrollH: e.scrollHeight, clientH: e.clientHeight, top: e.scrollTop }; });
  console.log('RESULTS SCROLL:', JSON.stringify(sc));
  if (sc.scrollH > sc.clientH + 4) {
    await p.evaluate(() => { document.getElementById('end').scrollTop = 9999; });
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/hud3-end-bottom.png`, animations: 'disabled', timeout: 180000 });
    console.log('  -> results screen OVERFLOWS by', sc.scrollH - sc.clientH, 'px; captured bottom');
    dump('RESULTS (scrolled)', await p.evaluate(MEASURE));
  }
  await b.close();
};
run().catch((e) => { console.error(e); process.exit(1); });
