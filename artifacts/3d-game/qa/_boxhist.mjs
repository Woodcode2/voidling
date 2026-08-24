import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
const [src,X,Y,W,H] = [process.argv[2],+process.argv[3],+process.argv[4],+process.argv[5],+process.argv[6]];
const p = PNG.sync.read(readFileSync(src));
const h=new Map(); let n=0;
for(let y=Y;y<Y+H;y++)for(let x=X;x<X+W;x++){
  const i=(y*p.width+x)*4; const k=`${p.data[i]},${p.data[i+1]},${p.data[i+2]}`;
  h.set(k,(h.get(k)||0)+1); n++;
}
const top=[...h.entries()].sort((a,b)=>b[1]-a[1]).slice(0,14);
console.log(`box ${X},${Y} ${W}x${H}  ${n} px`);
for(const [k,v] of top){ const [r,g,b]=k.split(',').map(Number);
  console.log(`  rgb(${k})  ${v}  ${(100*v/n).toFixed(1)}%  sRGBmax=${Math.max(r,g,b)}`); }
