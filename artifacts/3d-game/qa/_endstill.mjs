// WHAT IS MOVING ON THE END CARD, and is #btnAgain one of it?
//
// econ's PLAY AGAIN click has now timed out twice in this repo's life with
// "element is not stable" — once from the end card's "you are here" ring
// pulsing forever, and once here. Both times the question was the same and both
// times the first answer was a guess. The browser knows: getAnimations() names
// every running animation and its target, and the box either moves or it does
// not.
//
//   node qa/_endstill.mjs [port]
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.clear();
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate');
} catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple&len=8&g=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForSelector('#end.show', { timeout: 600000 });
console.log('  end card up\n');
for (const wait of [0, 1500, 3000, 6000, 12000]) {
  if (wait) await new Promise((r) => setTimeout(r, wait === 1500 ? 1500 : 1500));
  const r = await p.evaluate(() => {
    const el = document.getElementById('btnAgain');
    const bx = el ? el.getBoundingClientRect() : null;
    const live = document.getAnimations().filter((a) => a.playState === 'running').map((a) => {
      const t = a.effect && a.effect.target;
      const id = t ? (t.id || t.className || t.tagName) : '?';
      const ps = a.effect && a.effect.pseudoElement || '';
      const d = a.effect && a.effect.getTiming ? a.effect.getTiming().duration : '?';
      const it = a.effect && a.effect.getTiming ? a.effect.getTiming().iterations : '?';
      return `${a.animationName || a.constructor.name}@${id}${ps} (${d}ms x${it})`;
    });
    return { box: bx ? { x: +bx.x.toFixed(2), y: +bx.y.toFixed(2), w: +bx.width.toFixed(2), h: +bx.height.toFixed(2) } : null,
      live, sub: (document.getElementById('endSub')?.textContent || '').slice(0, 70) };
  });
  console.log(`  +${wait}ms  btnAgain ${JSON.stringify(r.box)}`);
  console.log(`           running(${r.live.length}): ${r.live.join(', ') || '(none)'}`);
}
await b.close();
