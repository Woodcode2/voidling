// DOES THE LOADING BAR EVER SHOW A NON-NUMBER? Game Day and Lantern Night
// place no pack meshes, so the "how much is loaded" fraction is 0/0 for them —
// and NaN survives a `pct <= loadPct` guard because every comparison with NaN
// is false. It reached an App Store screenshot at 1290x2796 before anyone saw
// it, which is the whole argument for this probe existing.
import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';
const PORT = process.argv[2] || '4188';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
let bad = 0;
for (const wid of ALL_WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  // sample the label from the very first paint, not after it settles
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  const seen = new Set();
  const grab = async () => {
    const t = await p.evaluate(() => document.getElementById('lPct')?.textContent ?? '');
    if (t) seen.add(t);
  };
  for (let i = 0; i < 40; i++) { await grab(); await p.waitForTimeout(250); }
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.click('#btnPlay').catch(() => { });
  await p.waitForTimeout(1200);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`).catch(() => { });
  for (let i = 0; i < 40; i++) { await grab(); await p.waitForTimeout(250); }
  const junk = [...seen].filter((t) => !/^\d{1,3}%$/.test(t.trim()));
  if (junk.length) bad++;
  console.log(`${wid.padEnd(9)} saw: ${[...seen].join(' ') || '(never visible)'}${junk.length ? '   <-- NOT A PERCENTAGE' : ''}`);
  await p.close();
}
await b.close();
console.log(bad ? `\n${bad} world(s) printed something that is not a percentage` : '\nevery label was a plain percentage');
process.exit(bad ? 1 : 0);
