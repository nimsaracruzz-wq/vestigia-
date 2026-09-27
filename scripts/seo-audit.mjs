// Run against the Express deployment, never Vite's SPA preview server.
import fs from 'node:fs/promises';
const base=(process.argv[2]||'http://127.0.0.1:3001').replace(/\/$/,''),errors=[],warnings=[],pages=[],incoming=new Map(),titles=new Map(),descriptions=new Map(),images=new Set();
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&apos;',"'");
const fetchText=async url=>{const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000)});return {response,html:await response.text()};};
const map=await fetchText(base+'/sitemap.xml');if(map.response.status!==200)throw Error('Sitemap unavailable');
const urls=[...map.html.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>decode(m[1]));
if(!urls.length)errors.push('Sitemap is empty');
const site=urls.length?new URL(urls[0]).origin:'';
for(const url of urls){const u=new URL(url),route=u.pathname+u.search,{response,html}=await fetchText(base+route);if(response.status!==200){errors.push(route+': HTTP '+response.status);continue;}
 const title=html.match(/<title>(.*?)<\/title>/s)?.[1],description=html.match(/<meta name="description" content="([^"]*)"/)?.[1],canonical=[...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map(m=>decode(m[1]));
 if(!title)errors.push(route+': missing title');else{if(titles.has(title))warnings.push(route+': duplicate title with '+titles.get(title));titles.set(title,route);if(title.length>70)warnings.push(route+': long title');}
 if(!description)errors.push(route+': missing description');else{if(descriptions.has(description))warnings.push(route+': duplicate description with '+descriptions.get(description));descriptions.set(description,route);}
 if(canonical.length!==1||canonical[0]!==url)errors.push(route+': canonical mismatch '+canonical.join(', '));
 if(/name="robots" content="noindex/.test(html)||response.headers.get('x-robots-tag')?.includes('noindex'))errors.push(route+': sitemap URL is noindex');
 const h1=(html.match(/<h1[ >]/g)||[]).length;if(h1!==1)(route==='/'||/^\/(product|collections|shop)(\/|$)/.test(route)?errors:warnings).push(route+': initial HTML H1 count '+h1);
 const schemas=[];for(const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)){try{schemas.push(JSON.parse(match[1]));}catch{errors.push(route+': invalid JSON-LD');}}
 if(route.startsWith('/product/')&&!JSON.stringify(schemas).match(/"@type":"Product(?:Group)?"/))errors.push(route+': no product schema');
 for(const match of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)){try{const link=new URL(decode(match[1]),url);if(link.origin===site&&!link.search&&!link.hash&&link.href!==url)incoming.set(link.href,(incoming.get(link.href)||0)+1);}catch{warnings.push(route+': invalid link');}}
 for(const match of html.matchAll(/<img\b[^>]*src="([^"]+)"/g)){try{const image=new URL(decode(match[1]),url);if(image.origin===site)images.add(image.pathname);}catch{errors.push(route+': invalid image URL');}}
 for(const image of html.matchAll(/<img\b[^>]*>/g))if(!/alt="[^"]+"/.test(image[0]))warnings.push(route+': missing image alt');
 pages.push({url,title,canonical:canonical[0],h1});
}
for(const url of urls)if(new URL(url).pathname!=='/'&&!incoming.has(url))warnings.push('Orphan candidate (no link in initial HTML): '+url);
// Check referenced local image files and internal links once each.
const targets=[...incoming.keys()].filter(url=>!urls.includes(url)).slice(0,300);
for(const url of targets){const u=new URL(url);if(/\.(css|js|png|jpe?g|webp|avif|ico)$/.test(u.pathname))continue;const r=await fetch(base+u.pathname,{redirect:'manual',signal:AbortSignal.timeout(10000)});if(r.status>=400)warnings.push('Broken internal link: '+u.pathname+' ('+r.status+')');}
for(const image of images){const response=await fetch(base+image,{method:'HEAD',signal:AbortSignal.timeout(10000)});if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))errors.push('Broken image: '+image);}
const missing=await fetch(base+'/product/seo-audit-nonexistent',{redirect:'manual'});if(missing.status!==404)errors.push('Missing product did not return 404');
const report={base,checked:pages.length,errors,warnings,pages};await fs.mkdir('reports',{recursive:true});await fs.writeFile('reports/seo-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exitCode=errors.length?1:0;
