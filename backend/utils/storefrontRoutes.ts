import { journalArticles } from '../../src/data.js';
import { installSeoRoutes } from './seoRoutes.js';
import { productRoute } from '../../shared/seo/product.js';
import { catalog } from '../../shared/seo/catalog.js';
import { staticPages,privateRoute,urlPolicy } from '../../shared/seo/policy.js';
import type { Express } from 'express';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import type { PublishedStorefront } from './publishedStorefront.js';
import { storefrontHtml,fallbackHtml } from './storefrontHtml.js';
export function installStorefront(app:Express,published:PublishedStorefront){
 installSeoRoutes(app,published);
 const directory=path.resolve(process.env.STOREFRONT_DIST||'../dist'),file=path.join(directory,'index.html');
 if(!fs.existsSync(file)){if(process.env.SERVE_STOREFRONT==='true')throw Error('Storefront build missing: run the root production build first');return;}
 const template=fs.readFileSync(file,'utf8');
 const headers=(_req:unknown,res:any,next:()=>void)=>{res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:; frame-src https://js.stripe.com https://hooks.stripe.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");next();};
 app.use(headers);
 app.get('/assets/:name',(req,res,next)=>{const name=String(req.params.name);if(path.basename(name)!==name||!/\.(js|css)$/.test(name))return next();const encoding=req.acceptsEncodings('br','gzip','identity');const suffix=encoding==='br'?'.br':encoding==='gzip'?'.gz':'';const target=path.join(directory,'assets',name+suffix);if(!suffix||!fs.existsSync(target))return next();res.vary('Accept-Encoding').set('Content-Encoding',encoding==='br'?'br':'gzip').set('Cache-Control','public, max-age=31536000, immutable').type(name.endsWith('.js')?'application/javascript':'text/css').sendFile(target);});
 app.use('/assets',express.static(path.join(directory,'assets'),{immutable:true,maxAge:'1y'}));
 app.use((req,res,next)=>{if(req.method!=='GET'||req.path.startsWith('/api/')||req.path.startsWith('/assets/')||req.path.startsWith('/uploads/')||req.path.startsWith('/images/')||/\.[a-z0-9]+$/i.test(req.path))return next();const normalized=req.path==='/'?'/':req.path.replace(/\/+$/,'').toLowerCase();if(normalized!==req.path)return res.redirect(301,normalized+new URL(req.originalUrl,'https://local.invalid').search);next();});
 app.get(/^\/(?:shop|collections\/[^/]+|(?:shop\/)?product\/[^/]+)?$/,async(req,res)=>{try{
 const snapshot=req.path==='/'?await published.get():await published.catalog(),search=new URL(req.originalUrl,'https://local.invalid').search;
 const token=/^\/(?:shop\/)?product\/([^/]+)$/.exec(req.path)?.[1];
 if(token){const key=decodeURIComponent(token);const product=snapshot.products.find(p=>p.slug===key||String(p.id)===key)||snapshot.products.find(p=>p.redirectFrom?.includes(key));
 if(!product)return res.status(404).set('X-Robots-Tag','noindex').type('html').send(fallbackHtml(template,req.path,true));
 if(req.path!==productRoute(product))return res.redirect(301,productRoute(product)+search);
 }else if(req.path.startsWith('/collections/')&&!catalog(snapshot.config,snapshot.products,req.path).exists)return res.status(404).set('X-Robots-Tag','noindex').type('html').send(fallbackHtml(template,req.path,true));
 if(!token&&req.path!=='/'){const listing=catalog(snapshot.config,snapshot.products,req.path,search),page=urlPolicy(req.path,search).page;if(page>1&&(page-1)*listing.pageSize>=listing.items.length)return res.status(404).set('X-Robots-Tag','noindex').type('html').send(fallbackHtml(template,req.path,true));}
 res.set('Cache-Control','no-cache').type('html').send(storefrontHtml(template,snapshot,req.path,search));
 }catch{res.status(503).set('Retry-After','60').set('X-Robots-Tag','noindex').type('text').send('Store temporarily unavailable. Please try again.');}});
 app.use(express.static(directory,{index:false,maxAge:'1h'}));
 app.get(/^(?!\/api(?:\/|$)|\/uploads(?:\/|$)|\/assets(?:\/|$)).*/,(req,res)=>{const article=journalArticles.find(a=>req.path==='/journal/'+a.id);const missing=!staticPages[req.path]&&!privateRoute(req.path)&&!article;if(missing||privateRoute(req.path)||process.env.SEO_NOINDEX==='true')res.set('X-Robots-Tag','noindex');res.status(missing?404:200).set('Cache-Control','no-store').type('html').send(fallbackHtml(template,req.path,missing));});
}
