import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
const [src, ...pts] = process.argv.slice(2);
const p = PNG.sync.read(readFileSync(src));
const lum = (r,g,b)=> (0.2126*Math.pow(r/255,2.2)+0.7152*Math.pow(g/255,2.2)+0.0722*Math.pow(b/255,2.2));
for (const pt of pts) {
  const [x,y] = pt.split(',').map(Number);
  // 3x3 average
  let R=0,G=0,B=0,n=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const i=((y+dy)*p.width+(x+dx))*4;R+=p.data[i];G+=p.data[i+1];B+=p.data[i+2];n++;}
  R=Math.round(R/n);G=Math.round(G/n);B=Math.round(B/n);
  console.log(`${x},${y}  rgb(${R},${G},${B})  #${[R,G,B].map(v=>v.toString(16).padStart(2,'0')).join('')}  srgbLum=${((0.2126*R+0.7152*G+0.0722*B)/255).toFixed(3)} linLum=${lum(R,G,B).toFixed(4)}`);
}
