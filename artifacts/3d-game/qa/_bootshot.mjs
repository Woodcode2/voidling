// SCRATCH — what a child is looking at DURING the synchronous island build.
import { chromium } from 'playwright';
const PORT = process.argv[2] || 4188, W = process.argv[3] || 'gameday';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); } catch {} });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'commit' }).catch(()=>{});
for (const at of [2500, 6000, 11000]) {
  await new Promise(r => setTimeout(r, at === 2500 ? at : 3500));
  try {
    const { data } = await Promise.race([
      cdp.send('Page.captureScreenshot', { format: 'png' }),
      new Promise((_, rj) => setTimeout(() => rj(new Error('screenshot timed out — the main thread is blocked')), 12000)),
    ]);
    const fs = await import('node:fs');
    fs.writeFileSync(`qa-out/_boot-${W}-${at}.png`, Buffer.from(data, 'base64'));
    console.log(`t≈${at}ms  captured qa-out/_boot-${W}-${at}.png`);
  } catch (e) { console.log(`t≈${at}ms  ${e.message}`); }
}
await b.close();
