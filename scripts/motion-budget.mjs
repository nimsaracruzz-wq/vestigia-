import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const limits={motionGzip:36*1024,entryGzip:112*1024,productGzip:12*1024,checkoutGzip:22*1024,heroBytes:500*1024};
const assets=await fs.readdir('dist/assets'),checks=[];
for(const [label,pattern,limit] of [['motion',/^motion-.*\.js$/,limits.motionGzip],['entry',/^index-.*\.js$/,limits.entryGzip],['product including gallery',/^ProductDetail-.*\.js$/,limits.productGzip],['checkout',/^Checkout-.*\.js$/,limits.checkoutGzip]]){
 const names=assets.filter(n=>pattern.test(n));if(!names.length)throw Error('Missing bundle: '+label);
 const bytes=(await Promise.all(names.map(async n=>gzipSync(await fs.readFile('dist/assets/'+n)).length))).reduce((a,b)=>a+b,0);
 checks.push({label,gzipBytes:bytes,limit,pass:bytes<=limit});
}
for(const file of ['public/images/products/vestigia-hero-768.jpg','public/images/products/vestigia-hero-1254.jpg']){
 const stat=await fs.stat(file);checks.push({label:file,bytes:stat.size,limit:limits.heroBytes,pass:stat.size<=limits.heroBytes});
}
const report={checks,policy:{maximumStaggerSeconds:.12,maximumStaggerBatch:4,noInfiniteDecorativeAnimations:true,noNewThirdPartyScripts:true,notes:'Drawer and modal code is part of entry; gallery is part of ProductDetail. Runtime node counts depend on viewport and CMS content; verify with a browser trace.'}};
await fs.mkdir('reports',{recursive:true});await fs.writeFile('reports/motion-budget.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(checks.some(c=>!c.pass))process.exitCode=1;
