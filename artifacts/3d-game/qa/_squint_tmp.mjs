import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';
// squint.mjs src dst factorDown reUp  [x y w h]
const [src, dst, fd, ru, sx, sy, sw, sh] = process.argv.slice(2);
const p = PNG.sync.read(readFileSync(src));
const X = sx === undefined ? 0 : +sx, Y = sy === undefined ? 0 : +sy;
const W = sw === undefined ? p.width : +sw, H = sh === undefined ? p.height : +sh;
const F = +fd, U = +ru;
const dw = Math.floor(W / F), dh = Math.floor(H / F);
const small = new Float64Array(dw * dh * 3);
for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
  let r=0,g=0,b=0,n=0;
  for (let j=0;j<F;j++) for (let i=0;i<F;i++){
    const si = ((Y+y*F+j)*p.width + (X+x*F+i))*4;
    r+=p.data[si]; g+=p.data[si+1]; b+=p.data[si+2]; n++;
  }
  const di=(y*dw+x)*3; small[di]=r/n; small[di+1]=g/n; small[di+2]=b/n;
}
const out = new PNG({ width: dw*U, height: dh*U });
for (let y=0;y<dh*U;y++) for (let x=0;x<dw*U;x++){
  const si=((y/U|0)*dw + (x/U|0))*3, di=(y*out.width+x)*4;
  out.data[di]=small[si]; out.data[di+1]=small[si+1]; out.data[di+2]=small[si+2]; out.data[di+3]=255;
}
writeFileSync(dst, PNG.sync.write(out));
console.log(`${dst} ${dw}x${dh} -> ${out.width}x${out.height}`);
