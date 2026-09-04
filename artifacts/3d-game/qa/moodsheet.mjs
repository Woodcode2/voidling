// WHAT DOES THE MOUTH LOOK LIKE AT EVERY OPENING? — the gape sheet.
//
//   node qa/gapesheet.mjs [port] [tag]
//
// TEAM HERO, round 3, filed as a blocker: "the bite gape is PORTRAIT and
// NARROWER than the closed grin — the mouth shrinks when it opens". The
// arithmetic agrees, from void3d.ts:
//
//   closed grin   CircleGeometry(0.178, 40, 0, PI) scaled (1.34, 0.76)
//                 -> 0.477 wide, 0.135 tall   (a half-disc spans its diameter)
//   full gape     CircleGeometry(0.20, 56)     scaled (1, 1.15)
//                 -> 0.400 wide, 0.460 tall
//
// The open mouth is SIXTEEN PER CENT NARROWER than the closed one and three and
// a half times taller. A mouth that gets narrower as it opens is a gasp, not a
// chomp — and in a dense world the hero is mid-bite in most frames, so it is
// the face a child mostly sees.
//
// I refused the board's proposed reshape in round 2 by reasoning that portrait
// is right for a full gulp. That was arithmetic against an eye, and the eye was
// right. This sheet exists so the next decision is made from pictures: it pins
// the gape at each opening in turn and crops the face, so the whole range can
// be looked at on one screen instead of argued about.
//
// TRAP: voidUnlocked is a COMMA-JOINED STRING (unlocks.ts:39), not JSON.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.argv[2] || '4177';
const TAG = process.argv[3] || 'now';
const OUT = `qa/out/mood/${TAG}`;
// 0 is the closed grin. The rest span what chomp() actually produces: `wide`
// runs 0.47 for a hydrant to 1.00 for a hotel (void3d.ts chomp).
const STEPS = ['cruise','scared','hurt','frenzy'];

mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForSelector('#btnPlay', { state: 'visible', timeout: 400000 });
await p.evaluate(() => document.getElementById('btnPlay').click());
await p.waitForSelector('#worldRow .wCard[data-world="maple"]', { state: 'visible', timeout: 400000 });
await p.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]').click());
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.waitForTimeout(2500);

// A size that fills enough of the frame to judge the shape, the face held
// still, and the HUD out of the way.
await p.evaluate(() => { window.__setVoidR(6); });
// WAIT IN GAME TIME, NOT WALL TIME. The mood engine lerps every expression at
// k = dt*9, so it needs about a third of a second of MATCH clock to settle —
// and the match clock runs ~14x slower than wall under swiftshader
// (qa/_clockrate.mjs). A flat wall-clock wait photographed the first frame
// mid-lerp, with the maw still carrying the previous mood's value, and the
// sheet reported "smile hidden" for a closed mouth.

await p.addStyleTag({ content:
  '#timer,#board,#coins,#quests,#growth,#banner,#count,#news,#hungerlbl,#hunger,'
  + '#joy,#joyNub,#powers,#evolve,#guide,#hand,#btnQuit,.vb,.vf,.vbN{opacity:0 !important}' });
await p.waitForTimeout(1500);

const box = await p.evaluate(() => {
  const THREE = window.__THREE, cam = window.__cam, g = window.__voidGroup();
  const c = new THREE.Vector3(); g.getWorldPosition(c);
  const q = c.clone().project(cam);
  const cx = (q.x * 0.5 + 0.5) * innerWidth, cy = (-q.y * 0.5 + 0.5) * innerHeight;
  const right = new THREE.Vector3(); cam.getWorldDirection(right);
  right.cross(cam.up).normalize().multiplyScalar(window.__voidState().r);
  const p1 = c.clone().add(right).project(cam);
  const rx = Math.abs((p1.x * 0.5 + 0.5) * innerWidth - cx) || 60;
  // Playwright's clip wants width/height, not w/h — it reports
  // "expected float, got undefined" rather than naming the key.
  return { x: Math.max(0, cx - rx * 1.1), y: Math.max(0, cy - rx * 1.1),
    width: Math.round(rx * 2.2), height: Math.round(rx * 2.2) };
});

for (const v of STEPS) {
  await p.evaluate((m) => { window.__pinGape(0); window.__setMood(m); }, v);
  // settle in GAME time: the mood engine lerps at k = dt*9 and the match clock
  // runs ~14x slower than wall under swiftshader.
  await p.waitForTimeout(3500);
  const name = `mood-${v}.png`;
  await p.screenshot({ path: `${OUT}/${name}`, clip: box });
  const st = await p.evaluate(() => window.__faceState());
  console.log(`  ${name.padEnd(18)} mood ${st.mood.padEnd(8)} smile ${st.smile ? 'shown' : 'hidden'}`);
}
await p.evaluate(() => { window.__pinGape(0); window.__setMood(null); });
await b.close();
console.log('');
console.log(`PASS — wrote ${STEPS.length} frames to ${OUT}/. This sheet does not judge; it is `
  + `the picture the judgement gets made from.`);
