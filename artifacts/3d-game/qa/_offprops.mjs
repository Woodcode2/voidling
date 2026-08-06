// WHAT are Pirate Bay's 17 off-map props, and can the player reach them?
// A prop the containment test will not let the void stand near is a prop that
// is decoration wearing an edible's clothes — and three of these are in the
// world's ten-item finale band.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto('http://127.0.0.1:4177/?w=pirate', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click('#worldRow .wCard[data-world="pirate"]');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });
await p.waitForTimeout(9000);
const r = await p.evaluate(() => {
  // the player's own containment predicate, transcribed from prototype3d.ts:4078
  const solid = (x, z, R) => {
    const m = Math.min(R * 0.75, 4 + R * 0.15) + 1.2, d = m * 0.7071;
    return !!window.__biomeAt(x, z) && !window.__inDeepWater3(x, z, m)
      && window.__insideIsland3(x + m, z) && window.__insideIsland3(x - m, z)
      && window.__insideIsland3(x, z + m) && window.__insideIsland3(x, z - m)
      && window.__insideIsland3(x + d, z + d) && window.__insideIsland3(x - d, z - d)
      && window.__insideIsland3(x + d, z - d) && window.__insideIsland3(x - d, z + d);
  };
  const out = [];
  for (const e of window.__edibles) {
    const m2 = e.mesh; if (!m2) continue;
    if (window.__biomeAt(m2.position.x, m2.position.z)) continue;
    // how close can a WORLD ENDER (R=11.46) legally get?
    let best = 1e9;
    for (let a = 0; a < 720; a++) {
      const ang = a / 720 * Math.PI * 2;
      for (let d = 1; d < 90; d += 1) {
        const x = m2.position.x + Math.cos(ang) * d, z = m2.position.z + Math.sin(ang) * d;
        if (solid(x, z, 11.46)) { if (d < best) best = d; break; }
      }
    }
    // name the thing: walk the group for a child mesh name / userData
    const names = new Set(); m2.traverse((o) => { if (o.name) names.add(o.name); });
    out.push({ r: +e.radius.toFixed(2), x: +m2.position.x.toFixed(1), z: +m2.position.z.toFixed(1),
      mover: !!m2.userData.mover, qk: m2.userData.qk || '', vis: m2.visible,
      type: m2.type, kids: m2.children.length, names: [...names].slice(0, 3).join('/'),
      nearestLegal: best === 1e9 ? null : +best.toFixed(1) });
  }
  return out.sort((a, b2) => b2.r - a.r);
});
console.log('pirate — edibles standing off the district map, and how close the void may legally get');
console.log('  radius   position        nearest legal stand   reach at R=11.46 is ~12.7');
for (const q of r) console.log(`  r=${String(q.r).padEnd(6)} (${String(q.x).padStart(6)},${String(q.z).padStart(6)})  ` +
  `nearest legal ${q.nearestLegal === null ? 'NONE within 90u' : q.nearestLegal + 'u'}   mover=${q.mover} vis=${q.vis} kids=${q.kids} ${q.names}`);
await b.close();
