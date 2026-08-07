// Remaining robustness questions:
//  1. WebGL context loss mid-match — the handler reloads. What does the child lose?
//  2. Rotation mid-match — does the HUD survive landscape?
//  3. The daily panel dismissed by backdrop tap: does it stay dismissed next launch?
//  4. Pause -> settings -> policy: can a child stack the in-match sheets and get out?
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4271;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const newPage = async (opts = {}) => {
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, ...opts });
  pg.on('pageerror', e => console.log('  PAGEERROR', e.message));
  await pg.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  return pg;
};
const primed = () => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} };
const boot = async (pg, w = 'maple') => {
  await pg.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
  await pg.waitForTimeout(1500);
};
const play = async (pg, w = 'maple') => {
  await pg.evaluate(() => document.getElementById('btnPlay').click());
  await pg.waitForTimeout(400);
  await pg.evaluate((x) => document.querySelector(`#worldRow .wCard[data-world="${x}"]`).click(), w);
  await pg.waitForFunction(() => { try { return window.__matchState().t > 1; } catch { return false; } }, null, { timeout: 200000 });
};

// ── 3. daily dismissal persistence ─────────────────────────────────────────
console.log('\n=== 3. daily panel: dismissed by backdrop, then reload ===');
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await ctx.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await ctx.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); } catch {} });
  const pg = await ctx.newPage();
  await boot(pg);
  console.log('  launch 1, daily shown:', await pg.evaluate(() => document.getElementById('daily').classList.contains('show')));
  await pg.evaluate(() => document.getElementById('daily').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await pg.waitForTimeout(300);
  console.log('  after backdrop tap, shown:', await pg.evaluate(() => document.getElementById('daily').classList.contains('show')));
  console.log('  voidDailyLast written:', await pg.evaluate(() => localStorage.getItem('voidDailyLast')));
  await pg.reload({ waitUntil: 'domcontentloaded', timeout: 300000 });
  await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
  await pg.waitForTimeout(1500);
  console.log('  launch 2 (same day, already dismissed), daily shown again:',
    await pg.evaluate(() => document.getElementById('daily').classList.contains('show')));
  await ctx.close();
}

// ── 2. rotation mid-match ──────────────────────────────────────────────────
console.log('\n=== 2. rotate mid-match ===');
{
  const pg = await newPage();
  await pg.addInitScript(primed);
  await boot(pg);
  await play(pg);
  await pg.waitForTimeout(1500);
  await pg.screenshot({ path: 'qa-out/_rb_portrait.png' });
  await pg.setViewportSize({ width: 844, height: 390 });
  await pg.waitForTimeout(2500);
  const land = await pg.evaluate(() => {
    const r = (id) => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect();
      return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height),
        offscreen: b.right > innerWidth + 1 || b.bottom > innerHeight + 1 || b.left < -1 || b.top < -1 }; };
    const c = document.querySelector('canvas');
    return { vw: innerWidth, vh: innerHeight,
      canvas: { w: c.width, h: c.height, cssW: Math.round(c.getBoundingClientRect().width), cssH: Math.round(c.getBoundingClientRect().height) },
      timer: r('timer'), board: r('board'), growth: r('growth'), hunger: r('hunger'), powers: r('powers'), quit: r('btnQuit') };
  });
  console.log('  landscape:', JSON.stringify(land, null, 1));
  await pg.screenshot({ path: 'qa-out/_rb_landscape.png' });
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.waitForTimeout(1500);
  const back = await pg.evaluate(() => { const c = document.querySelector('canvas');
    return { vw: innerWidth, vh: innerHeight, cw: c.width, ch: c.height,
      cssW: Math.round(c.getBoundingClientRect().width), cssH: Math.round(c.getBoundingClientRect().height),
      aspectOk: Math.abs(window.__cam.aspect - innerWidth / innerHeight) < 0.01, camAspect: +window.__cam.aspect.toFixed(3) }; });
  console.log('  back to portrait:', JSON.stringify(back));
  await pg.screenshot({ path: 'qa-out/_rb_portrait2.png' });
  await pg.close();
}

// ── 4. in-match sheet stacking ─────────────────────────────────────────────
console.log('\n=== 4. pause -> policy stacking, and getting out ===');
{
  const pg = await newPage();
  await pg.addInitScript(primed);
  await boot(pg);
  await play(pg);
  await pg.evaluate(() => { window.__renderer.render = () => {}; });
  const shown = () => pg.evaluate(() => ['pause','settings','policy','gate','end','menu'].filter(i =>
    getComputedStyle(document.getElementById(i)).display !== 'none'));
  await pg.evaluate(() => document.getElementById('btnQuit').click());
  await pg.waitForTimeout(400);
  console.log('  after ⌂:', await shown());
  // spam the three toggle rows 20x each — do they desync or throw?
  await pg.evaluate(() => { for (let i = 0; i < 20; i++) { ['pauseSound','pauseHaptics','pauseMotion'].forEach(x => document.getElementById(x).click()); } });
  await pg.waitForTimeout(300);
  console.log('  after 60 toggle taps:', await shown(),
    await pg.evaluate(() => ['pauseSound','pauseHaptics','pauseMotion'].map(i => document.getElementById(i).querySelector('b').textContent)));
  await pg.evaluate(() => document.getElementById('pauseResume').click());
  await pg.waitForTimeout(400);
  console.log('  after KEEP PLAYING:', await shown(),
    'clock advancing:', await pg.evaluate(async () => { const a = window.__matchState().t; await new Promise(r => setTimeout(r, 600)); return window.__matchState().t > a; }));
  await pg.close();
}

// ── 1. WebGL context loss mid-match ────────────────────────────────────────
console.log('\n=== 1. WebGL context loss mid-match ===');
{
  const pg = await newPage();
  await pg.addInitScript(primed);
  await boot(pg);
  await play(pg);
  await pg.evaluate(() => { window.__renderer.render = () => {}; });
  await pg.waitForFunction(() => { try { return window.__matchState().t > 8; } catch { return false; } }, null, { timeout: 300000 });
  const before = await pg.evaluate(() => ({ t: +window.__matchState().t.toFixed(1), score: Math.round(window.__matchState().score),
    matches: JSON.parse(localStorage.getItem('voidStats') || '{}').matches }));
  console.log('  before loss:', JSON.stringify(before));
  const nav = pg.waitForNavigation({ timeout: 30000 }).catch(() => null);
  await pg.evaluate(() => {
    const gl = document.querySelector('canvas').getContext('webgl2') || document.querySelector('canvas').getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext(); else document.querySelector('canvas').dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  });
  await nav;
  await pg.waitForTimeout(4000);
  const after = await pg.evaluate(() => ({ url: location.href, menu: getComputedStyle(document.getElementById('menu')).display,
    body: document.body.className, matches: JSON.parse(localStorage.getItem('voidStats') || '{}').matches,
    anyMessage: [...document.querySelectorAll('#banner,#news,#loadScr .lTip')].map(e => e.textContent.trim()).filter(Boolean).slice(0, 3) }));
  console.log('  after loss:', JSON.stringify(after));
  await pg.close();
}
await b.close();
