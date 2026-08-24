// WHAT IS THE LOUDEST THING ON THE WORLD PICKER? A crude but honest saliency
// proxy: share of the screen's total relative luminance carried by each region.
import { PNG } from 'pngjs'; import { readFileSync } from 'node:fs';
const p=PNG.sync.read(readFileSync(process.argv[2]));
const sr=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
const L=(r,g,b)=>0.2126*sr(r)+0.7152*sr(g)+0.0722*sr(b);
// PLAY pill boxes measured off the shipped frame (device px)
const pills=[[186,928,304,90],[1010,928,304,90],[186,1740,304,90],[1010,1740,304,90],[186,2535,304,90]];
const inPill=(x,y)=>pills.some(([a,b,w,h])=>x>=a&&x<a+w&&y>=b&&y<b+h);
let tot=0, pill=0, pn=0, bright=0, brightPill=0;
for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
  const i=(y*p.width+x)*4, l=L(p.data[i],p.data[i+1],p.data[i+2]);
  tot+=l; if(inPill(x,y)){pill+=l;pn++;}
  if(l>0.45){bright++; if(inPill(x,y))brightPill++;}
}
console.log(process.argv[2].split('/').pop());
console.log(`  PLAY pills: ${(100*pn/(p.width*p.height)).toFixed(1)}% of the screen AREA,`,
  `${(100*pill/tot).toFixed(1)}% of its total luminance,`,
  `${(100*brightPill/bright).toFixed(1)}% of every pixel brighter than L=0.45`);
