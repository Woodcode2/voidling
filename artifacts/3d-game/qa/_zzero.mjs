import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
for (const f of process.argv.slice(2)) {
  const p = PNG.sync.read(readFileSync(f));
  let n=0, black=0, zeroCh=0, near=0;
  // skip HUD bands: top 340px and bottom 300px
  for (let y=340;y<p.height-300;y++) for (let x=0;x<p.width;x++){
    const i=(y*p.width+x)*4, r=p.data[i],g=p.data[i+1],b=p.data[i+2];
    n++;
    if(r===0&&g===0&&b===0) black++;
    else if(r===0||g===0||b===0) zeroCh++;
    if(r<=2&&g<=2&&b<=2) near++;
  }
  console.log(`${f.padEnd(34)} px=${n}  pure-black=${(black/n*100).toFixed(2)}%  one-or-two-channels-zero(non-black)=${(zeroCh/n*100).toFixed(2)}%  <=2 all=${(near/n*100).toFixed(2)}%`);
}
