// How much of each opening frame is COLOURLESS surface (road, paving, roof
// plant, concrete)? chroma < 24 on an 8-bit max-min, HUD strips excluded.
import { PNG } from 'pngjs'; import { readFileSync } from 'node:fs';
for(const f of process.argv.slice(2)){
  const p=PNG.sync.read(readFileSync(f));
  const a=Math.round(p.height*0.11), b=Math.round(p.height*0.91);
  const sr=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
  const L=(r,g,b)=>0.2126*sr(r)+0.7152*sr(g)+0.0722*sr(b);
  let n=0,neu=0;
  for(let y=a;y<b;y++)for(let x=0;x<p.width;x++){
    const i=(y*p.width+x)*4,r=p.data[i],g=p.data[i+1],bl=p.data[i+2];
    n++; const l=L(r,g,bl); if(Math.max(r,g,bl)-Math.min(r,g,bl)<24 && l>0.06 && l<0.55) neu++;
  }
  console.log(f.split('/').pop().padEnd(26), 'LIT colourless surface (grey paving, not shadow)', (100*neu/n).toFixed(1)+'%');
}
