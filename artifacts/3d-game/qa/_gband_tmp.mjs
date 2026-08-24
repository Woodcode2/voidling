// high-pass energy by radius on a ground patch. radii in DEVICE px of the
// 1290-wide store frame. The frame's own scale: island.ts:2982 records
// "~38.7 screen pixels per unit at the play camera"; measured lane dash
// (2.6 units, island.ts:2965) spans ~77 device px in store/03 => ~30 px/unit.
import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
const [src, sx, sy, sw, sh] = process.argv.slice(2);
const p = PNG.sync.read(readFileSync(src));
const X=+sx,Y=+sy,W=+sw,H=+sh;
const L = new Float64Array(W*H);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=((Y+y)*p.width+(X+x))*4;
  L[y*W+x]=0.2126*p.data[i]+0.7152*p.data[i+1]+0.0722*p.data[i+2];
}
function boxblur(src,r){
  const t=new Float64Array(W*H), o=new Float64Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    let s=0,n=0;
    for(let k=-r;k<=r;k++){const xx=x+k; if(xx<0||xx>=W)continue; s+=src[y*W+xx];n++;}
    t[y*W+x]=s/n;
  }
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    let s=0,n=0;
    for(let k=-r;k<=r;k++){const yy=y+k; if(yy<0||yy>=H)continue; s+=t[yy*W+x];n++;}
    o[y*W+x]=s/n;
  }
  return o;
}
const out=[];
for(const r of [1,2,3,4,6,8,12,16,24,32]){
  if(r*2+1>Math.min(W,H)) break;
  const b=boxblur(L,r);
  let s=0; for(let i=0;i<W*H;i++) s+=Math.abs(L[i]-b[i]);
  out.push(`r${r}:${(s/(W*H)).toFixed(2)}`);
}
let m=0; for(let i=0;i<W*H;i++)m+=L[i]; m/=W*H;
console.log(`${src.split('/').pop()} @${X},${Y} ${W}x${H} L=${m.toFixed(1)}  ${out.join('  ')}`);
