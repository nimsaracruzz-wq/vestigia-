import { journalArticles } from '../../src/data.js';
import type { Express } from 'express';
import type { PublishedStorefront } from './publishedStorefront.js';
import { SITE,productRoute,canonicalProduct } from '../../shared/seo/product.js';
import { staticPages,robotsText } from '../../shared/seo/policy.js';
import { catalog } from '../../shared/seo/catalog.js';
import { xmlEscape } from './merchantFeed.js';
export function installSeoRoutes(app:Express,published:PublishedStorefront){
 app.use((_req,res,next)=>{if(process.env.SEO_NOINDEX==='true')res.set('X-Robots-Tag','noindex, nofollow');next();});
 const base=(process.env.PUBLIC_SITE_URL||SITE).replace(/\/+$/,'');
 app.get('/robots.txt',(_req,res)=>res.type('text').send(robotsText(base,process.env.SEO_NOINDEX==='true')));
 app.get('/sitemap-index.xml',(_req,res)=>{
  const xml='<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['products','categories','pages','journal','images'].map(s=>'<sitemap><loc>'+xmlEscape(base+'/sitemap-'+s+'.xml')+'</loc><lastmod>2026-09-26</lastmod></sitemap>').join('')+'</sitemapindex>';
  res.set('Cache-Control','no-cache').type('xml').send(xml);
 });
 app.get(/^\/sitemap(?:-(products|categories|pages|journal|images))?\.xml$/,async(req,res)=>{try{
 const snapshot=await published.catalog(),kind=req.params[0],indexable=snapshot.products.filter(p=>p.robotsIndex!==false&&canonicalProduct(p,base)===new URL(productRoute(p),base).href);
 const links=catalog(snapshot.config,indexable,'/shop').links.filter(l=>catalog(snapshot.config,indexable,l.path).items.length);
 if(process.env.SEO_NOINDEX==='true'||!snapshot.config.seo.index){
  res.set('Cache-Control','no-cache').type('xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  return;
 }
 if(kind==='images'){
  const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+indexable.map(p=>{
   const pUrl=xmlEscape(new URL(productRoute(p),base).href);
   const imgs=[...new Set([p.modelImage||p.image,...(p.images||[])].filter(Boolean))];
   const imgTags=imgs.map(img=>'<image:image><image:loc>'+xmlEscape(new URL(img,base).href)+'</image:loc><image:title>'+xmlEscape(p.name)+'</image:title></image:image>').join('');
   return '<url><loc>'+pUrl+'</loc>'+imgTags+'</url>';
  }).join('')+'</urlset>';
  res.set('Cache-Control','no-cache').type('xml').send(xml);
  return;
 }
 const today='2026-09-26';
 const prodMap=new Map(indexable.map(p=>[productRoute(p),p]));
 let paths=kind==='products'?indexable.map(productRoute):kind==='categories'?links.map(l=>l.path):kind==='journal'?journalArticles.map(a=>'/journal/'+a.id):kind==='pages'?Object.keys(staticPages):[...Object.keys(staticPages),...journalArticles.map(a=>'/journal/'+a.id),...links.map(l=>l.path),...indexable.map(productRoute)];
 const unique=[...new Set(paths)];
 if(unique.length>50000)throw Error('Sitemap exceeds 50000 URLs; shard before publishing');
 const urls=unique.map(p=>{
  const loc='<loc>'+xmlEscape(new URL(p,base).href)+'</loc>';
  const prod=prodMap.get(p);
  const lastmod='<lastmod>'+(prod?.updatedAt?new Date(prod.updatedAt).toISOString().split('T')[0]:today)+'</lastmod>';
  const changefreq='<changefreq>'+(p==='/'||p.startsWith('/shop')||p.startsWith('/collections/')?'daily':p.startsWith('/product/')?'weekly':'monthly')+'</changefreq>';
  const priority='<priority>'+(p==='/'?'1.0':p.startsWith('/product/')?'0.8':p.startsWith('/shop')||p.startsWith('/collections/')?'0.9':'0.5')+'</priority>';
  return '<url>'+loc+lastmod+changefreq+priority+'</url>';
 }).join('');
 const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls+'</urlset>';
 res.set('Cache-Control','no-cache').type('xml').send(xml);
 }catch{res.status(503).type('text').send('Sitemap temporarily unavailable');}});
}
