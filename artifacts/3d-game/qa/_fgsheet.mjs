import { PNG } from 'pngjs'; import { readFileSync, writeFileSync } from 'node:fs';
const D='/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/';
const files = {
 maple:'hf_20260801_130607_c92a52e5-8c1c-4a60-a566-ba19583fd532.png',
 pirate:'hf_20260801_130624_b1d4e117-1a45-4447-9bb8-e7f764565975.png',
 gameday:'hf_20260801_053403_0dc79112-b8fd-4304-9d15-8630620b2218.png',
 lantern:'hf_20260802_020636_0bc97a9d-a168-4667-bf5d-76ac9418bff1.png',
 powder:'hf_20260730_000329_762b5f44-3c3d-4030-8429-099f02691b5e.png'};
const CW=200, CH=268, GAP=8;
const rows=[Object.keys(files).map(k=>'public/assets/hf/'+files[k]), Object.keys(files).map(k=>D+'locked-'+k+'.png')];
const W=5*CW+6*GAP, H=2*CH+3*GAP;
const out=new PNG({width:W,height:H});
out.data.fill(20);
for(let i=0;i<out.data.length;i+=4) out.data[i+3]=255;
rows.forEach((row,ri)=>row.forEach((f,ci)=>{
  const p=PNG.sync.read(readFileSync(f));
  const ox=GAP+ci*(CW+GAP), oy=GAP+ri*(CH+GAP);
  const fx=p.width/CW, fy=p.height/CH;
  for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){
    let r=0,g=0,b=0,n=0;
    for(let j=0;j<Math.ceil(fy);j++)for(let i2=0;i2<Math.ceil(fx);i2++){
      const sxp=Math.min(p.width-1,(x*fx|0)+i2), syp=Math.min(p.height-1,(y*fy|0)+j);
      const si=(syp*p.width+sxp)*4; r+=p.data[si];g+=p.data[si+1];b+=p.data[si+2];n++;
    }
    const di=((oy+y)*W+ox+x)*4; out.data[di]=r/n;out.data[di+1]=g/n;out.data[di+2]=b/n;out.data[di+3]=255;
  }
}));
writeFileSync(D+'poster-sheet.png',PNG.sync.write(out));
console.log('ok',W,H);
