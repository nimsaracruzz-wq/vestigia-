import type { Express } from 'express';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import type { PublishedStorefront } from './publishedStorefront.js';
import { storefrontHtml } from './storefrontHtml.js';
export function installStorefront(app:Express,published:PublishedStorefront){
 const directory=path.resolve(process.env.STOREFRONT_DIST||'../dist'),file=path.join(directory,'index.html');
 if(!fs.existsSync(file)){if(process.env.SERVE_STOREFRONT==='true')throw Error('Storefront build missing: run the root production build first');return;}
 const template=fs.readFileSync(file,'utf8');
 const headers=(_req:unknown,res:any,next:()=>void)=>{res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:; frame-src https://js.stripe.com https://hooks.stripe.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");next();};
 app.use(headers);
 app.use('/assets',express.static(path.join(directory,'assets'),{immutable:true,maxAge:'1y'}));
 app.get(/^\/(?:shop\/?|collections\/[^/]+\/?)?$/,async(req,res,next)=>{try{const snapshot=await published.get();res.set('Cache-Control','public, max-age=0, must-revalidate').type('html').send(storefrontHtml(template,snapshot,req.path,new URL(req.originalUrl,'https://local.invalid').search));}catch(e){next(e);}});
 app.use(express.static(directory,{index:false,maxAge:'1h'}));
 app.get(/^(?!\/api(?:\/|$)|\/uploads(?:\/|$)|\/assets(?:\/|$)).*/,(_req,res)=>{res.set('Cache-Control','no-store').type('html').send(template);});
}
