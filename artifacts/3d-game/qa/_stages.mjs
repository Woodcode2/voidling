// WHERE SHOULD THE MENU'S CAMERA STAND? Ask the world, do not guess.
//
// The first MENU_STAGE table was hand-typed coordinates and it put Pirate Bay's
// camera behind a building. Every world already carries authored points the
// game itself uses to frame it: COPY.hero (what the establishing shot flies to),
// island.spawn (where the void lands), and the biggest prop near the hero. This
// prints them, plus what the void can see from a few candidate stand-offs, so
// the table can be written from the island instead of at it.
//
//   node qa/_stages.mjs [port]
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const WORLDS = ['maple', 'pirate', 'gameday', 'lantern', 'powder', 'skylark'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
console.log('\n  AUTHORED POINTS, PER WORLD\n');
for (const w of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear();
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark');
  } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState && !!window.__edibles, null, { timeout: 420000 });
  const r = await p.evaluate(() => {
    const hero = window.__heroPoint?.() ?? null;
    const spawn = window.__spawn?.() ?? null;
    const at = hero ?? spawn ?? { x: 0, z: 0 };
    // how much stuff, and how big, within a few radii of the candidate point —
    // a stage wants DENSITY in frame and nothing enormous right on the lens
    const ring = (r0, r1) => {
      let n = 0, big = 0, maxR = 0;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible) continue;
        const d = Math.hypot(e.mesh.position.x - at.x, e.mesh.position.z - at.z);
        if (d < r0 || d > r1) continue;
        n++; if (e.radius > 3) big++; maxR = Math.max(maxR, e.radius);
      }
      return { n, big, maxR: +maxR.toFixed(1) };
    };
    return { hero, spawn, at,
      near: ring(0, 14), mid: ring(14, 40), far: ring(40, 90),
      // the biggest thing standing very close to the aim point is what a low
      // camera ends up looking at the back of
      lens: ring(0, 9),
      onLand: window.__insideIsland3 ? window.__insideIsland3(at.x, at.z) : null };
  });
  await p.close();
  console.log(`  ${w.padEnd(9)} hero ${JSON.stringify(r.hero)}  spawn ${JSON.stringify(r.spawn)}`);
  console.log(`            aim (${r.at.x.toFixed(0)}, ${r.at.z.toFixed(0)})  onLand ${r.onLand}`);
  console.log(`            lens<9 ${JSON.stringify(r.lens)}   near<14 ${JSON.stringify(r.near)}   mid<40 ${JSON.stringify(r.mid)}   far<90 ${JSON.stringify(r.far)}`);
}
await b.close();
console.log('');
