// THE GATE, MEASURED. World-switch reload path (voidAutoPlay=1) — the exact
// route to GAME DAY / LANTERN NIGHT. Records the loading bar's trace against
// performance.now() inside the page, so the number is network/parse time, not
// swiftshader render time. A jump straight to 100% from a low number means the
// 12-second bail-out won, i.e. the child sat on the cover for the full cap.
import { chromium } from 'playwright';
const PORT = process.argv[2] || 4177;
const WORLD = process.argv[3] || 'gameday';
const DELAY = Number(process.argv[4] || 0);
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox'],
});
const ctx = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, hasTouch:true, isMobile:true });
await ctx.addInitScript(() => {
  try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidAutoPlay','1'); } catch {}
  window.__barTrace = [];
  const iv = setInterval(() => {
    const p = document.getElementById('lPct');
    if (!p) return;
    const v = p.textContent;
    const last = window.__barTrace[window.__barTrace.length-1];
    if (!last || last.v !== v) window.__barTrace.push({ t: Math.round(performance.now()), v });
    if (v === '100%') clearInterval(iv);
  }, 20);
});
const page = await ctx.newPage();
await page.route('**/functions/v1/ingest-events', (r)=>r.fulfill({status:200,body:'{}'}));
let n = 0;
await page.route('**/assets/hf3d/**', async (r) => { n++; if (DELAY) await new Promise((s)=>setTimeout(s,DELAY)); r.fulfill({status:404,body:''}); });
await page.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil:'commit' });
await page.waitForFunction(() => (window.__barTrace||[]).some((e)=>e.v==='100%'), null, { timeout: 200000 });
const trace = await page.evaluate(() => window.__barTrace);
const hit100 = trace.find((e)=>e.v==='100%');
const prev = trace[trace.indexOf(hit100)-1];
console.log(JSON.stringify({ world:WORLD, perAssetDelayMs:DELAY, glbRequests:n,
  gateReleasedAtMs: hit100.t, barBeforeRelease: prev ? prev.v : null,
  bailoutWon: !!(prev && prev.v !== '100%' && Number(String(prev.v).replace('%','')) < 97 && hit100.t > 11500),
  trace: trace.slice(-6) }));
await browser.close();
