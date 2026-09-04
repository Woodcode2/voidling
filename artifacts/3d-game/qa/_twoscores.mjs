// TWO SCORES AT ONCE? — the owner hears drums under his lantern recording.
// Menu → PLAY → lantern card (the path where the bed now covers the decode),
// then a 25s timeline of {recording srcs, synth bed} — the handover should
// read bed:true → recording lands → bed:false within ~1.5s, never both long.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '0');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=lantern`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(900);
const t0 = Date.now();
await p.click('#worldRow .wCard[data-world="lantern"]');
let both = 0, lastLine = '';
for (let k = 0; k < 50; k++) {
  const m = await p.evaluate(() => window.__music());
  const line = `rec=${m.theme.srcs} bed=${m.synth} ctx=${m.ctx}`;
  if (line !== lastLine) { console.log(`  +${((Date.now() - t0) / 1000).toFixed(1)}s  ${line}`); lastLine = line; }
  if (m.theme.srcs > 0 && m.synth) both++;
  await p.waitForTimeout(500);
}
console.log(`\n  samples with BOTH running: ${both}/50 ${both > 4 ? '← THE OWNER\'S DRUMS' : '(handover ok: ≤4 = crossfade window)'}`);
await b.close();
process.exit(both > 4 ? 1 : 0);
