import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const cdp = await p.context().newCDPSession(p);
console.log('browser', b.version());
try {
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 59, left: 0, bottom: 34, right: 0 } });
  console.log('setSafeAreaInsetsOverride OK');
} catch (e) { console.log('setSafeAreaInsetsOverride FAILED:', e.message.split('\n')[0]); }
await p.setContent('<style>#a{position:fixed;top:env(safe-area-inset-top,0px);height:10px}</style><div id=a></div>');
console.log('computed top:', await p.evaluate(()=>getComputedStyle(document.getElementById('a')).top));
await b.close();
