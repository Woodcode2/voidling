// Is "YOUR SHARE" on the results screen a true statement? Plays a full-length
// match with the renderer stubbed (so the sim runs at its real rate), then
// compares the headline stat against the actual bookkeeping.
import { chromium } from 'playwright';
const PORT = process.argv[2] || 4188;

const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  p.setDefaultTimeout(180000);
  // NO voidPlayed: a first run auto-starts straight into a match (no menu)
  await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'commit', timeout: 120000 });
  await p.waitForFunction(() => { const l = document.getElementById('loadScr'); return l && !l.classList.contains('boot') && !l.classList.contains('show'); }, null, { timeout: 240000 });
  await p.waitForTimeout(2000);
  // stub the renderer: the sim then runs at its intended rate under swiftshader
  await p.evaluate(() => { const r = window.__renderer; window.__real = r.render.bind(r); r.render = () => {}; });

  // let a genuine full match play out
  for (let i = 0; i < 40; i++) {
    await p.waitForTimeout(3000);
    const s = await p.evaluate(() => window.__matchState());
    if (s.clock <= 1) break;
    if (i % 4 === 0) console.log(`t=${s.t.toFixed(0)}s clock=${s.clock.toFixed(0)} score=${Math.round(s.score)} r=${s.r.toFixed(2)} graze=${s.graze} ate=${JSON.stringify(s.ate)}`);
  }
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 180000 })
    .catch(() => console.log('! end never shown'));
  await p.waitForTimeout(1500);

  const r = await p.evaluate(() => {
    const st = window.__matchState();
    const edibles = window.__edibles || [];
    let total = 0, gone = 0, byPlayer = 0, shrinking = 0;
    for (const e of edibles) {
      total++;
      const hidden = e.eaten || !e.mesh.visible;
      const claimed = e.mesh.userData.eaten;      // rivals mark THIS, not e.eaten
      if (hidden) gone++;
      if (e.mesh.userData.byPlayer) byPlayer++;
      if (claimed && !hidden) shrinking++;         // eaten by a rival, still animating out
    }
    return {
      headlineShare: document.querySelector('#endStats .es b')?.textContent,
      endStats: [...document.querySelectorAll('#endStats .es')].map((n) => n.textContent),
      place: document.getElementById('endHd')?.textContent,
      rivals: st.rivals.map((v) => `${v.name}:${Math.round(v.score)}`).join(' '),
      grazeBites: st.graze,
      playerScore: Math.round(st.score),
      counted: { total, gone, byPlayer, shrinkingUncounted: shrinking },
    };
  });
  console.log('\n=== RESULTS BOOKKEEPING ===');
  console.log(JSON.stringify(r, null, 2));
  const { gone, byPlayer } = r.counted;
  console.log(`\nreported YOUR SHARE = ${r.headlineShare}`);
  console.log(`byPlayer/gone       = ${byPlayer}/${gone} = ${gone ? Math.round(byPlayer / gone * 100) : 0}%`);
  console.log(`rival larder bites NOT in the edible bookkeeping at all: ${r.grazeBites}`);
  await b.close();
};
run().catch((e) => { console.error(e); process.exit(1); });
