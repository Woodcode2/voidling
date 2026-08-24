import { PNG } from 'pngjs'; import { readFileSync } from 'node:fs';
const p = PNG.sync.read(readFileSync(process.argv[2]));
const CELL=64, GW=Math.ceil(p.width/CELL), GH=Math.ceil(p.height/CELL);
const h=new Int32Array(GW*GH);
for(let y=220;y<p.height-260;y++)for(let x=0;x<p.width;x++){
  const i=(y*p.width+x)*4,r=p.data[i],g=p.data[i+1],b=p.data[i+2];
  if(b>g+18 && r>g+6 && b>50) h[((y/CELL)|0)*GW+((x/CELL)|0)]++;
}
const top=[...h].map((v,i)=>[v,i]).sort((a,b)=>b[0]-a[0]).slice(0,8);
console.log(process.argv[2].split('/').pop());
for(const [v,i] of top) console.log('  cell', (i%GW)*CELL, ((i/GW)|0)*CELL, 'count', v);
