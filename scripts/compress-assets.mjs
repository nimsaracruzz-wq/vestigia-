import fs from 'node:fs/promises';
import {brotliCompressSync,gzipSync,constants} from 'node:zlib';
for(const name of await fs.readdir('dist/assets')){if(!/\.(js|css)$/.test(name))continue;const bytes=await fs.readFile('dist/assets/'+name);await fs.writeFile('dist/assets/'+name+'.br',brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:9}}));await fs.writeFile('dist/assets/'+name+'.gz',gzipSync(bytes,{level:9}));}
console.log('Generated Brotli and gzip assets.');
