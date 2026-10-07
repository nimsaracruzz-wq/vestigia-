import { saveInventory } from '../utils/inventoryManagement.js';
import { variantQuantityLimit } from '../../shared/stock.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PricingService, syncPrices, paymentMatches, pricingAudit } from '../utils/pricing.js';
import { processPaymentEvent, installPricingRoutes } from '../utils/pricingRoutes.js';
import { formatMoney, toMinor, roundedRatio, allocate, resolveMarket } from '../../shared/money.js';
import express from 'express';
import { normalizeCountryTaxRate, calculateCountryTax } from '../utils/countryTax.js';

test('country percentage validation, rounding, zero override and market fallback', () => {
 assert.deepEqual(calculateCountryTax(100,7999,'JPY',2000),{taxMinor:80,taxRateBps:100});
 assert.deepEqual(calculateCountryTax(100,6500,'EUR',2000),{taxMinor:65,taxRateBps:100});
 assert.equal(calculateCountryTax(100,7999,'USD',0).taxMinor,80);
 assert.equal(calculateCountryTax(0,7999,'JPY',2000).taxMinor,0);
 assert.equal(calculateCountryTax(null,10000,'GBP',2000).taxMinor,2000);
 assert.equal(calculateCountryTax(100,0,'JPY',0).taxMinor,0);
 for (const value of [-1,10001,1.1,NaN,'100',Infinity]) assert.throws(()=>normalizeCountryTaxRate(value));
});
let db: any, sql: Database.Database, folder: string, product: any, method: any;
before(async()=>{
 folder=fs.mkdtempSync(path.join(os.tmpdir(),'vestigia-pricing-'));
 const target=path.join(folder,'test.sqlite');sql=new Database(target);
 const migrations=fs.readdirSync('prisma/migrations').filter(name=>fs.existsSync('prisma/migrations/'+name+'/migration.sql')).sort();
 for(const name of migrations)sql.exec(fs.readFileSync('prisma/migrations/'+name+'/migration.sql','utf8'));
 db=new PrismaClient({adapter:new PrismaBetterSqlite3({url:target})});
 for(const [market,currency]of [['JP','JPY'],['EU','EUR'],['US','USD'],['UK','GBP']])await db.priceList.upsert({where:{id:market+'_RETAIL'},update:{status:'ACTIVE',taxJurisdiction:'*'},create:{id:market+'_RETAIL',market,name:market,currency,status:'ACTIVE',taxJurisdiction:'*'}});
 const region=await db.shippingRegion.create({data:{name:'Test region'}});
 for(const [countryCode,countryName]of [['JP','Japan'],['FR','France']])await db.shippingCountry.create({data:{regionId:region.id,countryCode,countryName,taxRateBps:null}});
 method=await db.shippingMethod.create({data:{regionId:region.id,name:'Standard',price:999,estimatedDays:'3 days'}});
 for(const currency of ['JPY','EUR','USD','GBP'])await db.shippingPrice.create({data:{shippingMethodId:method.id,currency,amountMinor:0}});
 product=await db.product.create({data:{name:'Vestigia Example',category:'Clothing',price:1,baseCurrency:'JPY',basePriceMinor:7999,colors:'["black"]',sizes:'["M"]',image:'test.png',images:'[]',alt:'Test',description:'Test',details:'[]',care:'[]',inventory:{create:{color:'black',size:'M',stock:10}}}});
 await db.$transaction((tx:any)=>syncPrices(tx,product.id,{JPY:{priceMinor:7999},EUR:{priceMinor:6500}},'test-admin','Acceptance fixture'));
});
after(async()=>{await db?.$disconnect();sql?.close();/* Preserve failed-run artifacts for diagnosis; temporary directory is isolated. */});
function payload(currency='JPY',market='JP'){return {currency,market,priceListId:market+'_RETAIL',email:'test@example.invalid',shippingCountryCode:'JP',shippingMethodId:method.id,items:[{productId:product.id,quantity:1,size:'M',color:'black',unitPriceMinor:7999,currency,priceListId:market+'_RETAIL',priceVersion:1}]};}

test('country tax affects quote and line totals; changed rates invalidate unpaid quotes only',async()=>{
 const service=new PricingService(db),p=payload();
 try {
  await db.shippingCountry.update({where:{countryCode:'JP'},data:{taxRateBps:100}});
  const quote=await service.createQuote(p);
  assert.equal(quote.taxMinor,80);assert.equal(quote.totalMinor,8079);
  assert.equal(quote.pricedItems[0].taxMinor,80);
  assert.equal(quote.pricedItems[0].totalMinor,8079);
  assert.equal((await service.calculateCart(payload('EUR','EU'))).taxMinor,65);
  await db.shippingCountry.update({where:{countryCode:'JP'},data:{taxRateBps:200}});
  await assert.rejects(()=>service.validateCheckout({...p,checkoutId:quote.checkoutId},true),/prices changed/);
  assert.equal((await service.validateCheckout({...p,checkoutId:quote.checkoutId})).taxMinor,80);
  assert.equal((await service.calculateCart(p)).taxMinor,160);
 } finally { await db.shippingCountry.update({where:{countryCode:'JP'},data:{taxRateBps:null}}); }
});
test('JPY and two-decimal units, rounding, unsafe values',()=>{
 assert.equal(toMinor('7999','JPY'),7999);assert.equal(toMinor('79.99','EUR'),7999);assert.equal(toMinor('65.00','EUR'),6500);
 assert.match(formatMoney(7999,'JPY'),/7,999/);assert.doesNotMatch(formatMoney(7999,'JPY'),/\.00/);assert.match(formatMoney(7999,'EUR'),/79\.99/);
 assert.equal(roundedRatio(7999,1200n,10000n),960);assert.deepEqual(allocate(2,[1,1,1]),[1,1,0]);
 assert.throws(()=>toMinor('1.1','JPY'));assert.throws(()=>toMinor('-1','USD'));assert.throws(()=>toMinor('9007199254740992','JPY'));
});
test('Japan 7999 / Europe 6500 use independent fixed prices, regardless of address',async()=>{
 const service=new PricingService(db);assert.equal((await service.calculateCart(payload())).totalMinor,7999);
 const eu=await service.calculateCart(payload('EUR','EU'));assert.equal(eu.totalMinor,6500);assert.equal(eu.currency,'EUR');
});
test('reject tampered market/currency; ignore browser price; require real price and variant',async()=>{
 assert.throws(()=>resolveMarket('JP','EUR','JP_RETAIL'));
 const p=payload();p.items[0].unitPriceMinor=1;assert.equal((await new PricingService(db).calculateCart(p)).totalMinor,7999);
 await assert.rejects(()=>new PricingService(db).calculateCart({...p,currency:'EUR'}),/match/);
 await assert.rejects(()=>new PricingService(db).calculateCart(payload('USD','US')),/no active/);
 await assert.rejects(()=>new PricingService(db).calculateCart({...p,items:[...p.items,...p.items]}),/Duplicate/);
 await assert.rejects(()=>new PricingService(db).calculateCart({...p,items:[{...p.items[0],size:'FAKE'}]}),/Variant/);
});
test('quote changes require review and paid historical snapshot survives a price change',async()=>{
 const service=new PricingService(db),p=payload(),q=await service.createQuote(p);
 assert.equal(q.priceChanged,false);
 await db.$transaction((tx:any)=>syncPrices(tx,product.id,{JPY:{priceMinor:8499}},'admin','Seasonal pricing'));
 await assert.rejects(()=>service.validateCheckout({...p,checkoutId:q.checkoutId},true),/prices changed/);
 const historical=await service.validateCheckout({...p,checkoutId:q.checkoutId});assert.equal(historical.totalMinor,7999);
 assert.equal((await service.calculateCart(p)).totalMinor,8499);
 assert.equal((await service.calculateCart(p)).priceChanged,true);
 await db.$transaction((tx:any)=>syncPrices(tx,product.id,{JPY:{priceMinor:7999}},'admin','Restore test price'));
});
test('currency-specific discounts and deterministic line totals',async()=>{
 await db.promoCode.create({data:{code:'JPY1000',discount:999,type:'fixed',currency:'JPY',amountMinor:1000}});
 const q=await new PricingService(db).calculateCart({...payload(),promoCode:'JPY1000'});assert.equal(q.totalMinor,6999);assert.equal(q.pricedItems[0].totalMinor,6999);
 await assert.rejects(()=>new PricingService(db).calculateCart({...payload('EUR','EU'),promoCode:'JPY1000'}),/currency/);
});
async function order(id:string,intentId:string){return db.order.create({data:{id,customer:'Test',email:'test@example.invalid',date:new Date().toISOString(),address:'Test',subtotal:7999,shipping:0,tax:0,total:7999,currency:'JPY',subtotalMinor:7999,totalMinor:7999,pricingVersion:1,paymentStatus:'PAID',stripePaymentIntentId:intentId,checkoutId:id+'-checkout',items:{create:{productId:product.id,productName:'Original name',image:'test.png',size:'M',color:'black',quantity:1,price:7999,unitPriceMinor:7999,subtotalMinor:7999,totalMinor:7999,currency:'JPY'}}}});}
test('webhook currency mismatch blocks fulfillment, preserves evidence and records alert; retries are idempotent',async()=>{
 const o=await order('mismatch-order','pi_test_mismatch');
 const intent={id:o.stripePaymentIntentId,amount:7999,currency:'eur',status:'succeeded',metadata:{checkoutId:o.checkoutId}};
 assert.equal(paymentMatches(o,intent),false);
 const stripe={paymentIntents:{retrieve:async()=>intent}};
 const event={id:'evt_test_mismatch',type:'payment_intent.succeeded',data:{object:{id:intent.id}}};
 await processPaymentEvent(db,event,stripe);await processPaymentEvent(db,event,stripe);
 assert.equal((await db.order.findUnique({where:{id:o.id}})).paymentStatus,'PAYMENT_MISMATCH');
 assert.equal((await db.order.findUnique({where:{id:o.id}})).currency,'JPY');
 assert.equal(await db.securityEvent.count({where:{eventType:'PAYMENT_CURRENCY_MISMATCH'}}),1);
 assert.equal((await db.payment.findUnique({where:{providerPaymentId:intent.id}})).currency,'EUR');
 const alerts=await pricingAudit(db);assert.ok(alerts.some((a:any)=>a.type==='PAYMENT_CURRENCY_MISMATCH'));
});
test('database rejects currency relabelling and immutable total changes',async()=>{
 const o=await order('immutable-order','pi_test_immutable');
 await assert.rejects(()=>db.order.update({where:{id:o.id},data:{currency:'EUR'}}));
 await assert.rejects(()=>db.order.update({where:{id:o.id},data:{totalMinor:1}}));
 await assert.rejects(()=>db.refund.create({data:{id:'bad-refund',orderId:o.id,currency:'EUR',amountMinor:1,status:'PENDING',reason:'test',createdBy:'test'}}));
});
test('partial refunds use original JPY amount, enforce remaining balance and idempotent retries',async()=>{
 const o=await order('refund-order','pi_mock_refund');
 const app=express();app.use(express.json());installPricingRoutes(app,db,(_req,_res,next)=>next(),null,true);
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 const port=(server.address() as any).port;
 const post=async(body:any)=>{const r=await fetch(`http://127.0.0.1:${port}/api/orders/${o.id}/refunds`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 try{
 const body={requestId:'test-refund-00000001',amountMinor:2000,currency:'JPY',reason:'Partial return'};
 const result=await post(body);assert.equal(result.status,200);assert.equal(result.data.amountMinor,2000);assert.equal(result.data.currency,'JPY');
 assert.equal((await post(body)).status,200);assert.equal(await db.refund.count({where:{orderId:o.id}}),1);
 assert.equal((await db.order.findUnique({where:{id:o.id}})).paymentStatus,'PARTIALLY_REFUNDED');
 assert.equal((await post({...body,requestId:'test-refund-00000002',amountMinor:6000})).status,400);
 assert.equal((await post({...body,requestId:'test-refund-00000003',currency:'EUR'})).status,400);
 }finally{server.close();}
});

test('unpublished products cannot receive a payable quote',async()=>{await db.product.update({where:{id:product.id},data:{published:false}});try{await assert.rejects(()=>new PricingService(db).calculateCart(payload()),/unavailable/);}finally{await db.product.update({where:{id:product.id},data:{published:true}});}});


test('inventory saves real quantities, rejects invalid and stale edits, and rolls back partial saves', async () => {
 const original = await db.inventory.findFirst({where:{productId:product.id}});
 try {
  const saved = await saveInventory(db, product.id, {black_M:7}, {black_M:10});
  assert.equal(saved.inventory[0].stock,7);
  assert.equal(saved.prices.find((p:any)=>p.currency==='JPY').priceMinor,7999);
  await assert.rejects(()=>saveInventory(db,product.id,{black_M:8},{black_M:10}),/Stock changed/);
  for (const value of [-1,1.5,100001,'9',null]) await assert.rejects(()=>saveInventory(db,product.id,{black_M:value},{black_M:7}),/whole stock/);
  await assert.rejects(()=>saveInventory(db,product.id,{black_M:3,invalid_M:2},{black_M:7,invalid_M:0}),/whole stock/);
  assert.equal((await db.inventory.findUnique({where:{id:original.id}})).stock,7);
  await saveInventory(db,product.id,{black_M:0},{black_M:7});
  await assert.rejects(()=>new PricingService(db).calculateCart(payload()),/stock/i);
 } finally { await db.inventory.update({where:{id:original.id},data:{stock:original.stock}}); }
});

test('bag limits use real variant stock and cap order quantities at 99',()=>{
 assert.equal(variantQuantityLimit(undefined,'black','M'),0);
 assert.equal(variantQuantityLimit({black_M:4},'black','M'),4);
 assert.equal(variantQuantityLimit({black_M:400},'black','M'),99);
 for(const stock of [-1,NaN,1.5])assert.equal(variantQuantityLimit({black_M:stock},'black','M'),0);
 assert.equal(variantQuantityLimit({black_M:4},'black','L'),0);
});
