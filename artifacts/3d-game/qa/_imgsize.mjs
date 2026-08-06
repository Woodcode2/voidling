// What size does each vendored image ACTUALLY render at? Downscaling to a
// guess is how art gets soft; downscaling to the measured display size at the
// worst-case device pixel ratio is just removing bytes nobody can see.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.click('#btnPlay'); await p.waitForTimeout(1500);
const r = await p.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('#worldRow .wCard')) {
    const b = el.getBoundingClientRect();
    const bg = getComputedStyle(el).backgroundImage;
    out.push({ w: Math.round(b.width), h: Math.round(b.height), bg: (bg.match(/hf_[0-9_]+/) || ['?'])[0] });
  }
  return out;
});
console.log('world cards at a 430px viewport (CSS px):');
r.forEach((c) => console.log(`  ${String(c.w).padStart(4)} x ${String(c.h).padStart(4)}   ${c.bg}`));
console.log('\nat DPR 3 the widest card needs', Math.max(...r.map((c) => c.w)) * 3, 'device px');
await b.close();
