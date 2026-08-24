import { PNG } from 'pngjs'; import { readFileSync } from 'node:fs';
const D='/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/';
const sr=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
const L=(r,g,b)=>0.2126*sr(r)+0.7152*sr(g)+0.0722*sr(b);
// art boxes (device px) for the top 58% of each card's poster — above all type
const A=747; // art height in device px
const boxes={ maple:[50,290], pirate:[666,290], gameday:[50,1102], lantern:[666,1102], powder:[50,1897] };
function m(file,label){
  const p=PNG.sync.read(readFileSync(file));
  const rows=[];
  for(const [k,[x0,y0]] of Object.entries(boxes)){
    let l=0,c=0,n=0,bright=0;
    for(let y=y0+8;y<y0+Math.round(A*0.58);y++)for(let x=x0+8;x<x0+566;x++){
      const i=(y*p.width+x)*4,r=p.data[i],g=p.data[i+1],b=p.data[i+2];
      l+=L(r,g,b); c+=Math.max(r,g,b)-Math.min(r,g,b); n++;
      if(L(r,g,b)>0.35) bright++;
    }
    rows.push(`${k.padEnd(8)} L=${(l/n).toFixed(4)} chroma=${(c/n).toFixed(1)} bright>0.35=${(100*bright/n).toFixed(1)}%`);
  }
  console.log('== '+label); rows.forEach(r=>console.log('   '+r));
}
m('store/02-worlds.png','ALL UNLOCKED (store/02-worlds.png)');
m(D+'picker-real.png','SHIPPED LOCK  saturate(0.28) brightness(0.62)');
m(D+'picker-candidate.png','CANDIDATE     saturate(0.62) brightness(0.85)');
