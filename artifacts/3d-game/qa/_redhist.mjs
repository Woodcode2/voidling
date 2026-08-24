import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
const src = process.argv[2];
const p = PNG.sync.read(readFileSync(src));
const hist = new Array(16).fill(0);
let red=0, zeroGB=0, total=0, zeroG=0, zeroB=0;
const sat = [];
for (let i=0;i<p.data.length;i+=4){
  const r=p.data[i],g=p.data[i+1],b=p.data[i+2];
  total++;
  if (r>40 && r>g*1.8 && r>b*1.8){ red++; hist[Math.min(15,r>>4)]++;
    if(g===0&&b===0) zeroGB++;
    if(g===0) zeroG++; if(b===0) zeroB++;
  }
}
console.log(`${src}\n  total ${total}  red-dominant ${red} (${(100*red/total).toFixed(1)}%)`);
console.log(`  of the red pixels: G==0 ${(100*zeroG/red).toFixed(1)}%   B==0 ${(100*zeroB/red).toFixed(1)}%   both ${(100*zeroGB/red).toFixed(1)}%`);
console.log('  R histogram (16 buckets of 16):');
hist.forEach((n,i)=>{ if(n) console.log(`   R ${(i*16).toString().padStart(3)}-${(i*16+15).toString().padStart(3)}  ${String(n).padStart(7)}  ${'#'.repeat(Math.round(60*n/Math.max(...hist)))}`); });
