import { renderToString } from 'react-dom/server';
import PublicStorefront from '../../shared/PublicStorefront.js';
import type { PublicSnapshot } from './publishedStorefront.js';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const safeJson=(data:unknown)=>JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
export function storefrontHtml(template:string,snapshot:PublicSnapshot,pathname='/',search='') {
 const seo=snapshot.config.seo,home=pathname==='/',base=process.env.PUBLIC_SITE_URL||(seo.canonical.startsWith('https://')?seo.canonical:'https://thevestigia.com/');
 const canonical=new URL(home?seo.canonical||'/':pathname,base).href;
 const title=home?seo.title:'Shop | VESTIGIA';
 const image=new URL(seo.image,base).href;
 const head=`<title>${escape(title)}</title><meta name="description" content="${escape(seo.description)}"><link rel="canonical" href="${escape(canonical)}"><meta name="robots" content="${seo.index&&!search?'index, follow':'noindex, follow'}"><meta property="og:type" content="website"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(seo.description)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${escape(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(seo.description)}"><meta name="twitter:image" content="${escape(image)}"><link rel="stylesheet" href="/public-document.css"><script type="application/ld+json">${safeJson({'@context':'https://schema.org','@graph':[{'@type':'Organization',name:'VESTIGIA',url:new URL('/',base).href},{'@type':'WebSite',name:'VESTIGIA',url:new URL('/',base).href}]})}</script>`;
 const markup=renderToString(<PublicStorefront config={snapshot.config} products={snapshot.products} pathname={pathname} search={search}/>);
 return template.replace(/<title>[\s\S]*?<\/title>/gi,'').replace(/<meta\b[^>]*(?:name|property)=["'](?:description|robots|og:[^"']*|twitter:[^"']*)["'][^>]*>/gi,'').replace(/<link\b[^>]*rel=["'](?:canonical|alternate)["'][^>]*>/gi,'').replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,'').replace('</head>',()=>head+'</head>').replace(/<div id="root"><\/div>/,()=>`<div id="root">${markup}</div><script id="vestigia-public-data" type="application/json">${safeJson(snapshot)}</script>`);
}
