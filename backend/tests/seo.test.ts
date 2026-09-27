import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {productSchema,validGtin,slug,type SeoProduct} from '../../shared/seo/product.js';
import {urlPolicy,hreflangLinks,robotsText} from '../../shared/seo/policy.js';
import {initialHomepage} from '../../shared/homepage.js';
import {storefrontHtml} from '../utils/storefrontHtml.js';
import {merchantFeed} from '../utils/merchantFeed.js';
import {installStorefront} from '../utils/storefrontRoutes.js';
const product:SeoProduct={id:42,slug:'aurelius-tee',name:'VESTIGIA Aurelius Tee',description:'A heavyweight cotton tee.',category:'Clothing',image:'/images/tee.jpg',colors:['Black'],sizes:['M','L'],inventory:{Black_M:3,Black_L:0},prices:{EUR:{priceMinor:6500,isActive:true},USD:{priceMinor:7900,isActive:true}},redirectFrom:['old-tee'],condition:'new'};
const template='<!doctype html><html lang="en"><head><title>Old</title></head><body><div id="root"></div></body></html>';
const snapshot=()=>({config:initialHomepage([42]),products:[product],version:1});
test('schema and feed use the same EUR prices and variant stock without fake identifiers',()=>{
 const schema=productSchema(product) as any,feed=merchantFeed([product],'https://thevestigia.com');
 assert.equal(schema['@type'],'ProductGroup');assert.equal(schema.hasVariant.length,2);
 assert.equal(schema.hasVariant[0].offers.price,'65.00');assert.equal(schema.hasVariant[0].offers.priceCurrency,'EUR');assert.match(schema.hasVariant[1].offers.availability,/OutOfStock$/);
 assert.match(feed.xml,/<g:price>65.00 EUR/);assert.match(feed.xml,/<g:availability>out_of_stock/);assert.doesNotMatch(feed.xml,/79.00|identifier_exists|<g:mpn>|<g:gtin>/);
 assert.equal(schema.hasVariant[0].offers.url.replaceAll('&','&amp;'),feed.xml.match(/<g:link>(.*?)<\/g:link>/)![1]);
});
test('inactive or missing prices never fall back to legacy values, no inventory never invents stock',()=>{
 const p={...product,prices:{EUR:{priceMinor:6500,isActive:false}},inventory:{}};
 assert.equal((productSchema(p) as any).hasVariant[0].offers,undefined);assert.doesNotMatch(merchantFeed([p],'https://thevestigia.com').xml,/<item>/);
 assert.match((productSchema({...p,prices:product.prices}) as any).hasVariant[0].offers.availability,/OutOfStock$/);
 assert.doesNotMatch(merchantFeed([{...product,published:false}],'https://thevestigia.com').xml,/<item>/);
});
test('canonical policies distinguish pagination, facets, tracking and variant parameters',()=>{
 assert.deepEqual(urlPolicy('/shop','?page=2'),{noIndex:false,canonical:'/shop?page=2',page:2});
 assert.equal(urlPolicy('/shop','?search=tee').noIndex,true);assert.equal(urlPolicy('/shop','?utm_source=test').noIndex,false);
 assert.equal(urlPolicy('/product/tee','?color=Black&size=M').canonical,'/product/tee');
 assert.equal(hreflangLinks([]).length,0);assert.doesNotMatch(robotsText('https://thevestigia.com'),/search=|color=|size=/);
 assert.equal(slug('Caff\u00e8 \u00c8lite - T-shirt'),'caffe-elite-t-shirt');assert.equal(validGtin('12345678'),false);assert.equal(validGtin('4006381333931'),true);
});
test('initial product HTML has single metadata, H1, matching money, product schema and safe bootstrap',()=>{
 const html=storefrontHtml(template,snapshot(),'/product/aurelius-tee','?currency=EUR&color=Black&size=L');
 assert.equal((html.match(/<h1[ >]/g)||[]).length,1);assert.equal((html.match(/rel="canonical"/g)||[]).length,1);assert.match(html,/65.00/);assert.match(html,/Out of stock/);assert.match(html,/A heavyweight cotton tee/);assert.doesNotMatch(html,/hreflang=/);
 for(const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>JSON.parse(match[1]));
 const usd=storefrontHtml(template,snapshot(),'/product/aurelius-tee','?currency=USD');assert.match(usd,/79.00/);assert.match(usd,/"priceCurrency":"USD"/);
});
test('real Express routes return correct statuses, aliases, robots and fresh sitemap',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'vestigia-seo-'));await fs.writeFile(path.join(folder,'index.html'),template);
 const previous=process.env.STOREFRONT_DIST;process.env.STOREFRONT_DIST=folder;
 const app=express();let data=snapshot();const source={get:async()=>data,catalog:async()=>data};installStorefront(app,source as any);
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address() as {port:number};const base='http://127.0.0.1:'+address.port;
 try{
 for(const route of ['/','/shop','/collections/clothing','/product/aurelius-tee','/contact','/checkout'])assert.equal((await fetch(base+route)).status,200,route);
 for(const route of ['/product/missing','/collections/missing','/not-real']){const r=await fetch(base+route);assert.equal(r.status,404);assert.equal(r.headers.get('x-robots-tag'),'noindex');}
 for(const route of ['/product/42','/product/old-tee','/shop/product/42']){const r=await fetch(base+route,{redirect:'manual'});assert.equal(r.status,301);assert.equal(r.headers.get('location'),'/product/aurelius-tee');}
 assert.equal((await fetch(base+'/SHOP/',{redirect:'manual'})).status,301);
 let xml=await (await fetch(base+'/sitemap.xml')).text();assert.match(xml,/product\/aurelius-tee/);assert.match(xml,/<lastmod>/);assert.doesNotMatch(xml,/checkout|account|admin/);
 data={...data,products:[]};xml=await(await fetch(base+'/sitemap.xml')).text();assert.doesNotMatch(xml,/product\/aurelius-tee/);
 assert.equal((await fetch(base+'/product/aurelius-tee')).status,404);
 const robots=await(await fetch(base+'/robots.txt')).text();assert.match(robots,/Sitemap:/);assert.doesNotMatch(robots,/sort=/);
 source.catalog=async()=>{throw Error('database unavailable');};assert.equal((await fetch(base+'/product/aurelius-tee')).status,503);assert.equal((await fetch(base+'/sitemap.xml')).status,503);
 }finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));if(previous===undefined)delete process.env.STOREFRONT_DIST;else process.env.STOREFRONT_DIST=previous;}
});
