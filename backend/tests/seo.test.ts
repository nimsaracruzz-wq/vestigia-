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
import {installMerchantFeedRoutes,MERCHANT_FEED_PATHS,merchantFeed} from '../utils/merchantFeed.js';
import {installStorefront} from '../utils/storefrontRoutes.js';
const product:SeoProduct={id:42,slug:'aurelius-tee',name:'VESTIGIA Aurelius Tee',description:'A heavyweight cotton tee.',fitDescription:'Relaxed shoulder with an oversized fit.',fabricDetails:'Heavyweight cotton jersey.\nMade for a structured drape.',details:['Ribbed collar'],care:['Wash cold inside out'],material:'Cotton',category:'Clothing',image:'/images/tee.jpg',colors:['Black'],sizes:['M','L'],gender:'unisex',ageGroup:'adult',inventory:{Black_M:3,Black_L:0},prices:{EUR:{priceMinor:6500,isActive:true},USD:{priceMinor:7900,isActive:true}},redirectFrom:['old-tee'],condition:'new'};
const template='<!doctype html><html lang="en"><head><title>Old</title></head><body><div id="root"></div></body></html>';
const snapshot=()=>({config:initialHomepage([42]),products:[product],version:1});
test('schema and feed use the same EUR prices and variant stock without fake identifiers',()=>{
 const schema=productSchema(product) as any,feed=merchantFeed([product],'https://thevestigia.com');
 assert.equal(schema['@type'],'ProductGroup');assert.equal(schema.hasVariant.length,2);
 assert.equal(schema.hasVariant[0].offers.price,'65.00');assert.equal(schema.hasVariant[0].offers.priceCurrency,'EUR');assert.match(schema.hasVariant[1].offers.availability,/OutOfStock$/);
 assert.match(feed.xml,/<g:price>65.00 EUR/);assert.match(feed.xml,/<g:availability>out_of_stock/);assert.match(feed.xml,/<g:identifier_exists>no<\/g:identifier_exists>/);assert.match(feed.xml,/<g:gender>unisex<\/g:gender>/);assert.match(feed.xml,/<g:age_group>adult<\/g:age_group>/);assert.doesNotMatch(feed.xml,/79.00|<g:mpn>|<g:gtin>|<g:shipping>|return_policy_label/);
 assert.equal(schema.hasVariant[0].offers.url.replaceAll('&','&amp;'),feed.xml.match(/<g:link>(.*?)<\/g:link>/)![1]);
});
test('inactive or missing prices never fall back to legacy values, no inventory never invents stock',()=>{
 const p={...product,prices:{EUR:{priceMinor:6500,isActive:false}},inventory:{}};
 assert.equal((productSchema(p) as any).hasVariant[0].offers,undefined);assert.doesNotMatch(merchantFeed([p],'https://thevestigia.com').xml,/<item>/);
 assert.match((productSchema({...p,prices:product.prices}) as any).hasVariant[0].offers.availability,/OutOfStock$/);
 assert.doesNotMatch(merchantFeed([{...product,published:false}],'https://thevestigia.com').xml,/<item>/);
});
test('apparel without required demographic attributes is excluded from the feed',()=>{
 const result=merchantFeed([{...product,gender:null,ageGroup:null}],'https://thevestigia.com');
 assert.doesNotMatch(result.xml,/<item>/);assert.match(result.warnings.join(' '),/missing or invalid apparel gender\/age group/);
});
test('invalid GTIN values are warned and excluded rather than emitted or ignored',()=>{
 const result=merchantFeed([{...product,gtin:'12345678'}],'https://thevestigia.com');
 assert.doesNotMatch(result.xml,/<item>/);assert.match(result.warnings.join(' '),/invalid GTIN/);
});
test('Google feed is public at the canonical URL and legacy aliases',async()=>{
 const app=express();installMerchantFeedRoutes(app,async()=>[product],()=> 'https://thevestigia.com');
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address() as {port:number};const base='http://127.0.0.1:'+address.port;
 try{for(const route of MERCHANT_FEED_PATHS){const response=await fetch(base+route);assert.equal(response.status,200,route);assert.match(response.headers.get('content-type')||'',/application\/xml/);const xml=await response.text();assert.match(xml,/<g:identifier_exists>no<\/g:identifier_exists>/,route);}}
 finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
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
 assert.equal((html.match(/<h1[ >]/g)||[]).length,1);assert.equal((html.match(/rel="canonical"/g)||[]).length,1);assert.match(html,/65.00/);assert.match(html,/Out of stock/);assert.match(html,/A heavyweight cotton tee/);assert.match(html,/Relaxed shoulder with an oversized fit/);assert.match(html,/Heavyweight cotton jersey/);assert.match(html,/Wash cold inside out/);assert.doesNotMatch(html,/hreflang=/);
 for(const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>JSON.parse(match[1]));
 const usd=storefrontHtml(template,snapshot(),'/product/aurelius-tee','?currency=USD');assert.match(usd,/79.00/);assert.match(usd,/"priceCurrency":"USD"/);
});

test('regional prices keep the same canonical URL and match initial HTML structured offers',()=>{
 const regional={...product,prices:{...product.prices,JPY:{priceMinor:12000,isActive:true}}};
 for(const [currency,price] of [['JPY','12000'],['EUR','65.00'],['USD','79.00']] as const){
  const data={...snapshot(),products:[regional]};
  const html=storefrontHtml(template,data,'/product/aurelius-tee','?currency='+currency);
  assert.match(html,new RegExp('"priceCurrency":"'+currency+'"'));
  const schema=productSchema(regional,currency) as any;
  assert.equal(schema.hasVariant[0].offers.price,price);
  assert.match(html,/rel="canonical" href="https:\/\/thevestigia.com\/product\/aurelius-tee"/);
  assert.equal(urlPolicy('/product/aurelius-tee','?currency='+currency).noIndex,false);
  assert.equal(urlPolicy('/','?currency='+currency).canonical,'/');
 }
});
test('real Express routes return correct statuses, aliases, robots and fresh sitemap',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'vestigia-seo-'));await fs.writeFile(path.join(folder,'index.html'),template);
 const previous=process.env.STOREFRONT_DIST;process.env.STOREFRONT_DIST=folder;
 const app=express();let data=snapshot();const source={get:async()=>data,catalog:async()=>data,journal:async()=>[]};installStorefront(app,source as any);
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address() as {port:number};const base='http://127.0.0.1:'+address.port;
 try{
 for(const route of ['/','/shop','/collections/clothing','/product/aurelius-tee','/contact','/checkout','/verify-email','/confirm-email-change'])assert.equal((await fetch(base+route)).status,200,route);
 for(const route of ['/verify-email','/confirm-email-change'])assert.equal((await fetch(base+route)).headers.get('x-robots-tag'),'noindex');
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
