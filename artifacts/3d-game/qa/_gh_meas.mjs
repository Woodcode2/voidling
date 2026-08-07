import { chromium } from 'playwright';
import fs from 'node:fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 800, height: 600 } });
const b64 = fs.readFileSync('qa-out/gh/maple-side.png').toString('base64');
const out = await p.evaluate(async (b64) => {
  const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
  const d = x.getImageData(0,0,im.width,im.height).data, w = im.width, h = im.height;
  // gold rim of King Void: rim 0xffd25a. widest horizontal run of gold in the upper half
  let goldMin=1e9, goldMax=-1, goldTop=1e9, goldBot=-1;
  let purMin=1e9, purMax=-1, purTop=1e9, purBot=-1;
  for (let y=0;y<h;y++) for (let xx=0;xx<w;xx++) {
    const j=(y*w+xx)*4, r=d[j], g=d[j+1], bl=d[j+2];
    // gold: strong r+g, low b
    if (r>210 && g>150 && g<210 && bl<110 && y>h*0.16 && y<h*0.34 && xx>w*0.15 && xx<w*0.80) { if(xx<goldMin)goldMin=xx; if(xx>goldMax)goldMax=xx; if(y<goldTop)goldTop=y; if(y>goldBot)goldBot=y; }
    // the hero's violet rim 0xcb99ff-ish
    if (r>150 && r<225 && g>110 && g<180 && bl>220 && y>h*0.42 && y<h*0.62) { if(xx<purMin)purMin=xx; if(xx>purMax)purMax=xx; if(y<purTop)purTop=y; if(y>purBot)purBot=y; }
  }
  return { gold:[goldMin,goldMax,goldTop,goldBot], purple:[purMin,purMax,purTop,purBot], w, h };
}, b64);
console.log(JSON.stringify(out));
const g = out.gold, pu = out.purple;
console.log('gold (King Void rim) span: ' + ((g[1]-g[0])/3).toFixed(0) + ' x ' + ((g[3]-g[2])/3).toFixed(0) + ' CSS px');
console.log('hero violet rim span:      ' + ((pu[1]-pu[0])/3).toFixed(0) + ' x ' + ((pu[3]-pu[2])/3).toFixed(0) + ' CSS px');
await b.close();
