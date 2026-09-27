import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const budgets={entryJsGzip:112*1024,entryCssGzip:34*1024,maxJsGzip:112*1024};
const rows=[];let failed=false;
for(const name of await fs.readdir('dist/assets')){if(!/\.(js|css)$/.test(name))continue;const raw=await fs.readFile('dist/assets/'+name),gzip=gzipSync(raw).length;rows.push({name,bytes:raw.length,gzip});const budget=name.startsWith('index-')?(name.endsWith('.js')?budgets.entryJsGzip:budgets.entryCssGzip):name.endsWith('.js')?budgets.maxJsGzip:Infinity;if(gzip>budget){console.error('Budget exceeded',name,gzip,budget);failed=true;}}
console.log(JSON.stringify({budgets,entry:rows.filter(r=>r.name.startsWith('index-')),largestChunks:rows.sort((a,b)=>b.gzip-a.gzip).slice(0,5)},null,2));
process.exitCode=failed?1:0;
