// REFUTE-PASS — (a) what IS on screen during the block, captured with a
// generous timeout instead of a 12 s race; (b) does a compositor-thread CSS
// animation keep ticking through the block? Inject a translateX keyframe loop
// into #loadScr before the module runs and read its progress after.
import { chromium } from 'playwright';
import fs from 'node:fs';
const PORT = process.argv[2] || 4177, W = process.argv[3] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => {
  try { localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); } catch {}
  // the exact fix the finding proposes, injected as early as possible
  document.addEventListener('readystatechange', function once() {
    if (!document.head) return;
    const s = document.createElement('style');
    s.textContent = '@keyframes _rfSlide { from { transform: translateX(-100%); } to { transform: translateX(300%); } }' +
      '#_rfProbe { position: fixed; top: 4px; left: 0; width: 30%; height: 8px; background: #0f0; z-index: 999;' +
      ' animation: _rfSlide 1.2s linear infinite; will-change: transform; }';
    document.head.appendChild(s);
    document.removeEventListener('readystatechange', once);
  });
  document.addEventListener('DOMContentLoaded', () => {
    const d = document.createElement('div'); d.id = '_rfProbe'; document.body.appendChild(d);
    window.__rfAnim = () => { const a = d.getAnimations()[0]; return a ? { t: Math.round(a.currentTime), state: a.playState } : null; };
  });
});
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
const cdp = await ctx.newCDPSession(p);
p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'commit' }).catch(() => {});
const t0 = Date.now();
for (const at of [3000, 8000]) {
  await new Promise(r => setTimeout(r, Math.max(0, at - (Date.now() - t0))));
  const issued = Date.now();
  try {
    const { data } = await Promise.race([
      cdp.send('Page.captureScreenshot', { format: 'png' }),
      new Promise((_, rj) => setTimeout(() => rj(new Error('TIMEOUT at 90 s')), 90000)),
    ]);
    fs.writeFileSync(`qa-out/_rf-${W}-${at}.png`, Buffer.from(data, 'base64'));
    console.log(`issued t≈${at}ms  → returned after ${Date.now() - issued} ms  → qa-out/_rf-${W}-${at}.png`);
  } catch (e) { console.log(`issued t≈${at}ms  ${e.message}`); }
}
await p.waitForFunction(() => !!window.__matchState, null, { timeout: 400000 });
const anim = await p.evaluate(() => window.__rfAnim && window.__rfAnim());
console.log(`block ended at ${Date.now() - t0} ms;  injected composited animation currentTime = ${JSON.stringify(anim)}`);
await b.close();
