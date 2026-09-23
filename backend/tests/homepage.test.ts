import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {PrismaClient} from '@prisma/client';
import {PrismaBetterSqlite3} from '@prisma/adapter-better-sqlite3';
import express from 'express';
import type {Server} from 'node:http';
import {initialHomepage,validateHomepage,orderedSections,newSection} from '../../shared/homepage.js';
import {selectHomepageProducts} from '../../shared/homepageProducts.js';
import {heroImageSources,heroMediaStyle} from '../../shared/heroMedia.js';
import {installHomepageRoutes} from '../utils/homepageRoutes.js';

let db:PrismaClient,server:Server,base:string;
before(async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'vestigia-homepage-')),target=path.join(folder,'test.db'),sql=new Database(target);
 const source=new Database(path.resolve('vestigia-dev.db'),{readonly:true});
 const schema=source.prepare("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END").all() as {sql:string}[];
 sql.pragma('foreign_keys=OFF');for(const row of schema)sql.exec(row.sql);sql.close();source.close();
 db=new PrismaClient({adapter:new PrismaBetterSqlite3({url:target})});
 const app=express();app.use(express.json());
 installHomepageRoutes(app,db,(req,res,next)=>{if(req.headers.authorization!=='Bearer test-admin'){res.status(401).json({error:'Unauthorized'});return;}(req as any).admin={username:'CMS test'};next();},(_req,_res,next)=>next(),p=>p);
 server=await new Promise<Server>(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
});
after(async()=>{await new Promise<void>(resolve=>server?.close(()=>resolve()));await db?.$disconnect();});
async function request(route:string,method='GET',body?:unknown,auth=true) {
 const res=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer test-admin'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,data:await res.json(),cache:res.headers.get('cache-control'),etag:res.headers.get('etag')};
}
test('section schema rejects unsafe links, arbitrary CSS, invalid settings and structural deletion',()=>{
 const good=initialHomepage([1,2]);assert.doesNotThrow(()=>validateHomepage(good));
 for(const modify of [(c:any)=>{c.sections[1].settings.cta.url='javascript:alert(1)';},(c:any)=>{c.sections[1].settings.style='position:fixed';},(c:any)=>{c.sections[1].settings.heading='<img src=x>';},(c:any)=>{c.sections[2].settings.mobileItems=6;},(c:any)=>{c.sections=c.sections.filter((s:any)=>s.type!=='hero');},(c:any)=>{c.sections[1].settings.mobileImage='//evil.invalid/image.png';},(c:any)=>{c.sections[2].settings.productIds=[1,1];}]){const config=structuredClone(good);modify(config);assert.throws(()=>validateHomepage(config));}
});

test('hero art direction preserves mobile source and uses independent focal positions',()=>{
 const hero=newSection('hero','hero').settings;
 hero.image='/images/desktop.jpg';hero.mobileImage='/images/mobile.jpg';
 hero.desktopFocalX=55;hero.desktopFocalY=28;hero.tabletFocalY=30;hero.mobileFocalY=50;
 assert.deepEqual(heroImageSources(hero),{desktop:'/images/desktop.jpg',mobile:'/images/mobile.jpg'});
 assert.equal(heroMediaStyle(hero)['--hero-desktop-y'],'28%');assert.equal(heroMediaStyle(hero)['--hero-tablet-y'],'30%');assert.equal(heroMediaStyle(hero)['--hero-mobile-y'],'50%');
 hero.mobileImage='';assert.equal(heroImageSources(hero).mobile,hero.image);
 const config=initialHomepage();const stored=config.sections.find(s=>s.type==='hero')!;
 if(stored.type==='hero'){assert.equal(stored.settings.mobileImage,'/images/products/vestigia-hero-768.jpg');assert.equal(stored.settings.desktopFocalY,0);stored.settings.desktopFocalY=101;}
 assert.throws(()=>validateHomepage(config),/0–100/);
});

test('art-direction migration preserves draft copy, section order and custom image choices',()=>{
 const sql=new Database(':memory:');sql.exec('CREATE TABLE Homepage (draft TEXT,published TEXT,revision INTEGER,publishedRevision INTEGER)');
 const config=initialHomepage();const hero=config.sections.find(s=>s.type==='hero')!;
 if(hero.type==='hero'){hero.settings.heading='Preserve my draft';hero.settings.mobileImage='';for(const key of ['desktopFocalX','desktopFocalY','tabletFocalX','tabletFocalY','mobileFocalX','mobileFocalY'])delete (hero.settings as any)[key];}
 sql.prepare('INSERT INTO Homepage VALUES (?,?,1,1)').run(JSON.stringify(config),JSON.stringify(config));
 for(const name of ['20260924000002_homepage_hero_art_direction','20260924000003_homepage_mobile_source'])sql.exec(fs.readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8'));
 const row=sql.prepare('SELECT * FROM Homepage').get() as any;const draft=JSON.parse(row.draft);assert.equal(draft.sections[1].settings.heading,'Preserve my draft');assert.equal(draft.sections[1].settings.mobileImage,'/images/products/vestigia-hero-768.jpg');assert.equal(draft.sections[1].settings.desktopFocalY,0);assert.equal(row.revision,2);assert.deepEqual(draft.sections.map((s:any)=>s.id),config.sections.map(s=>s.id));assert.doesNotThrow(()=>validateHomepage(draft));sql.close();
});
test('all draft, preview, write and product/media picker endpoints require authentication',async()=>{
 for(const [route,method] of [['/admin/homepage','GET'],['/admin/homepage/preview','GET'],['/admin/homepage/draft','PUT'],['/admin/homepage/publish','POST'],['/admin/homepage/products','GET'],['/admin/homepage/media','GET'],['/admin/homepage/categories','GET']])assert.equal((await request(route,method,undefined,false)).status,401);
});
test('draft remains private, preview reflects edits, publish updates public version and order',async()=>{
 const original=await request('/storefront/homepage','GET',undefined,false),admin=await request('/admin/homepage');
 const config=admin.data.draft;
 config.sections.find((s:any)=>s.type==='hero').settings.heading='A PRIVATE DRAFT';
 config.sections.find((s:any)=>s.id==='craft').enabled=false;
 config.sections.find((s:any)=>s.id==='manifesto').sortOrder=99;
 const save=await request('/admin/homepage/draft','PUT',{config,revision:admin.data.revision});assert.equal(save.status,200);
 assert.deepEqual((await request('/storefront/homepage','GET',undefined,false)).data,original.data);
 const preview=await request('/admin/homepage/preview');assert.match(preview.cache!,/no-store/);assert.equal(preview.data.config.sections[1].settings.heading,'A PRIVATE DRAFT');
 const conflict=await request('/admin/homepage/draft','PUT',{config,revision:admin.data.revision});assert.equal(conflict.status,409);
 assert.equal((await request('/admin/homepage/publish','POST',{revision:admin.data.revision})).status,409);
 assert.equal((await request('/admin/homepage/publish','POST',{revision:save.data.revision})).status,200);
 const live=await request('/storefront/homepage','GET',undefined,false);assert.notEqual(live.etag,original.etag);assert.equal(live.data.config.sections[1].settings.heading,'A PRIVATE DRAFT');
 const sections=orderedSections(live.data.config);assert.equal(sections.at(-1)?.id,'manifesto');assert(!sections.some(s=>s.id==='craft'));
});
test('deleted product references produce warnings and are skipped without replacing manual order',async()=>{
 const record=await request('/admin/homepage');const config=record.data.draft;const carousel=config.sections.find((s:any)=>s.type==='product_carousel');carousel.settings.source='manual';carousel.settings.productIds=[999999];
 const save=await request('/admin/homepage/draft','PUT',{config,revision:record.data.revision});assert.equal(save.status,200);assert.match(save.data.warnings.join(),/999999/);
});
test('manual feeds retain exact order; automatic feeds sort actual market prices and categories',()=>{
 const products=[{id:1,category:'Clothing',prices:{JPY:{priceMinor:900},EUR:{priceMinor:200}}},{id:2,category:'Clothing',prices:{JPY:{priceMinor:300},EUR:{priceMinor:800}}},{id:3,category:'Accessories',prices:{JPY:{priceMinor:500,isActive:false}}}];
 const settings=newSection('product_carousel','test').settings;settings.productIds=[2,999,1];
 assert.deepEqual(selectHomepageProducts(products,settings,'JPY',[]).map(p=>p.id),[2,1]);
 settings.source='newest';settings.sort='price_asc';assert.deepEqual(selectHomepageProducts(products,settings,'JPY',[]).map(p=>p.id),[2,1]);assert.deepEqual(selectHomepageProducts(products,settings,'EUR',[]).map(p=>p.id),[1,2]);
 settings.source='category';settings.category='Accessories';assert.equal(selectHomepageProducts(products,settings,'JPY',[]).length,0);
 settings.source='best_selling';assert.equal(selectHomepageProducts(products,settings,'JPY',[]).length,0);assert.deepEqual(selectHomepageProducts(products,settings,'JPY',[1,2]).map(p=>p.id),[1,2]);
});

test('product search is paginated and searches real SKUs and categories',async()=>{
 for(let i=0;i<14;i++)await db.product.create({data:{name:`CMS fixture ${i}`,sku:`CMS-SKU-${i}`,category:i%2?'Clothing':'Accessories',price:1,colors:'[]',sizes:'[]',image:'/test.png',images:'[]',alt:'Test image',description:'Test fixture',details:'[]',care:'[]'}});
 const first=await request('/admin/homepage/products'),second=await request('/admin/homepage/products?page=1');
 assert.equal(first.data.items.length,12);assert.equal(second.data.items.length,2);assert.equal(first.data.total,14);
 const sku=await request('/admin/homepage/products?q=CMS-SKU-13');assert.equal(sku.data.items.length,1);assert.equal(sku.data.items[0].sku,'CMS-SKU-13');
 const categories=await request('/admin/homepage/categories?q=Clothing');assert.equal(categories.data[0].count,7);
 const config=initialHomepage();const carousel=config.sections.find(s=>s.type==='product_carousel')!;
 if(carousel.type==='product_carousel'){carousel.settings.source='category';carousel.settings.category='Deleted category';}
 const record=await request('/admin/homepage');const saved=await request('/admin/homepage/draft','PUT',{config,revision:record.data.revision});assert.match(saved.data.warnings.join(),/Deleted category/);
});

test('best-selling feed is empty without sales and excludes unpaid or refunded orders',async()=>{
 assert.deepEqual((await request('/storefront/homepage/best-sellers')).data,[]);
 const products=await db.product.findMany({take:2,orderBy:{id:'asc'}});
 for(const [id,paymentStatus,status,productId,quantity] of [['cms-paid','PAID','delivered',products[1].id,2],['cms-unpaid','PENDING','pending',products[0].id,20],['cms-refunded','PAID','refunded',products[0].id,10]] as const){
    await db.order.create({data:{id,customer:'Test',email:'test@example.invalid',date:new Date().toISOString(),address:'Test',subtotal:100,shipping:0,tax:0,total:100,currency:'JPY',paymentStatus,status,items:{create:{productId,productName:'Test',image:'/test.png',size:'M',color:'black',quantity,price:100,currency:'JPY'}}}});
 }
 assert.deepEqual((await request('/storefront/homepage/best-sellers')).data,[products[1].id]);
});

test('media listing exposes image metadata only and registration rejects outside paths',async()=>{
 const media=await request('/admin/homepage/media');assert.equal(media.status,200);assert(media.data.items.every((item:any)=>item.mime.startsWith('image/')&&item.bytes>0));
 assert.equal((await request('/admin/homepage/media','POST',{url:'/../../.env',width:100,height:100})).status,400);
 assert.equal((await request('/admin/homepage/media','POST',{url:'/images/../../../backend/.env',width:100,height:100})).status,400);
});
