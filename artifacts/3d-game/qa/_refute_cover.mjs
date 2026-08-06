// REFUTE-PASS — two things the finding rests on:
//  (1) WHAT the child actually sees: hold the module back 6 s, screenshot the
//      untouched boot cover.
//  (2) WHETHER the proposed fix works: put the finding's own remedy — a
//      transform keyframe loop on a composited layer — on a STATIC element in
//      the initial markup, then screencast through the block and see whether
//      compositor frames keep arriving and the layer keeps moving.
import { chromium } from 'playwright';
import fs from 'node:fs';
const PORT = process.argv[2] || 4177, W = process.argv[3] || 'maple';
const MODE = process.argv[4] || 'cover';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => {
  try { localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); } catch {}
  // readyState hits "interactive" BEFORE deferred module scripts run, so this
  // lands before the block starts, on an element that is already in the markup.
  document.addEventListener('readystatechange', function once() {
    if (document.readyState !== 'interactive' || !document.head) return;
    document.removeEventListener('readystatechange', once);
    const s = document.createElement('style');
    s.textContent =
      '@keyframes _rfSlide { from { transform: translateX(-110%); } to { transform: translateX(360%); } }' +
      '#lBar { width: 30% !important; animation: _rfSlide 1.4s linear infinite; will-change: transform; }';
    document.head.appendChild(s);
    window.__rfAnim = () => {
      const el = document.getElementById('lBar'); if (!el) return null;
      const a = el.getAnimations()[0];
      return a ? { currentTime: Math.round(a.currentTime), playState: a.playState } : null;
    };
  });
});
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
if (MODE === 'cover') {
  // hold the heavy module back so the cover can be photographed on its own
  await p.route('**/assets/main-*.js', async r => { await new Promise(x => setTimeout(x, 20000)); r.continue(); });
}
const cdp = await ctx.newCDPSession(p);
const frames = [];
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 60, everyNthFrame: 1 });
cdp.on('Page.screencastFrame', async ev => {
  frames.push({ t: Date.now(), data: ev.data });
  try { await cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }); } catch {}
});
const t0 = Date.now();
p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'commit' }).catch(() => {});

if (MODE === 'cover') {
  await new Promise(r => setTimeout(r, 8000));
  const f = frames[frames.length - 1];
  if (f) { fs.writeFileSync(`qa-out/_rf-cover-${W}.jpg`, Buffer.from(f.data, 'base64')); console.log(`cover frame at t=${f.t - t0}ms → qa-out/_rf-cover-${W}.jpg (${frames.length} frames so far)`); }
  else console.log('NO screencast frames at all in 8 s');
  await b.close();
} else {
  await p.waitForFunction(() => !!window.__matchState, null, { timeout: 400000 });
  const end = Date.now() - t0;
  const anim = await p.evaluate(() => window.__rfAnim && window.__rfAnim());
  console.log(`block ended ${end} ms.  ${frames.length} compositor frames total.`);
  // bucket frames per second so gaps are visible
  const buckets = {};
  for (const f of frames) { const s = Math.floor((f.t - t0) / 1000); buckets[s] = (buckets[s] || 0) + 1; }
  console.log('  frames per second-bucket:', JSON.stringify(buckets));
  let biggest = 0, at = 0;
  for (let i = 1; i < frames.length; i++) { const g = frames[i].t - frames[i-1].t; if (g > biggest) { biggest = g; at = frames[i-1].t - t0; } }
  console.log(`  largest gap between compositor frames: ${biggest} ms starting at t=${at} ms`);
  console.log(`  #lBar animation after the block: ${JSON.stringify(anim)}`);
  // dump three frames from the middle of the block
  const mid = frames.filter(f => f.t - t0 > 2500 && f.t - t0 < end - 1500);
  [0, Math.floor(mid.length / 2), mid.length - 1].forEach((i, n) => {
    if (mid[i]) { fs.writeFileSync(`qa-out/_rf-anim-${n}.jpg`, Buffer.from(mid[i].data, 'base64')); console.log(`  mid-block frame ${n} at t=${mid[i].t - t0}ms → qa-out/_rf-anim-${n}.jpg`); }
  });
  await b.close();
}
