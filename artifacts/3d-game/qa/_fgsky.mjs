import { PNG } from 'pngjs'; import { readFileSync } from 'node:fs';
for (const f of process.argv.slice(2)) {
  const p=PNG.sync.read(readFileSync(f));
  // the strip just under the status bar, above any terrain: sample rows 150-240
  const bands=[[150,240],[240,330]];
  const out=[];
  for(const [a,b] of bands){let r=0,g=0,bl=0,n=0;
    for(let y=a;y<b;y++)for(let x=0;x<p.width;x++){const i=(y*p.width+x)*4;
      r+=p.data[i];g+=p.data[i+1];bl+=p.data[i+2];n++;}
    out.push(`y${a}-${b}: rgb(${(r/n)|0},${(g/n)|0},${(bl/n)|0})`);}
  console.log(f.split('/').pop().padEnd(24), out.join('  '));
}
