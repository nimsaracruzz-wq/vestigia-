import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { installCouponRoutes, normalizeCoupon, validateCoupon, reserveCoupon, redeemCoupon, releaseAbandonedCoupons } from '../utils/coupons.js';
import { PricingService } from '../utils/pricing.js';
import { safeErrorHandler } from '../utils/requestSafety.js';

test('coupon normalization preserves currency precision, bounds, date-only expiry and legacy percentages', () => {
  assert.equal(normalizeCoupon({ code:' save10 ',type:'percentage',discount:10.25 }).percentageBps,1025);
  assert.equal(normalizeCoupon({ code:'EUR5',type:'fixed',discount:'5.25',currency:'EUR' }).amountMinor,525);
  assert.equal(normalizeCoupon({ code:'SHIP',type:'free_shipping' }).target,'shipping');
  assert.equal(normalizeCoupon({ code:'ENDDAY',discount:10,expiry:'2027-01-01' }).expiry,'2027-01-01T23:59:59.999Z');
  for (const input of [{code:'x',discount:10},{code:'OVER',discount:101},{code:'ZERO',discount:0},{code:'BAD',discount:10,maxUses:1.5},{code:'BAD',discount:10,expiry:'2027-02-30'},{code:'JPY1',type:'fixed',currency:'JPY',discount:1.5},{code:'FIXED',type:'fixed',discount:10},{code:'BAD',type:'unknown',discount:10}]) assert.throws(()=>normalizeCoupon(input));
  const legacy={code:'OLD',active:true,type:'percentage',discount:12,percentageBps:null,expiry:'2027-01-01'};
  assert.doesNotThrow(()=>validateCoupon(legacy,'EUR',new Date('2027-01-01T12:00:00Z')));
  assert.throws(()=>validateCoupon(legacy,'EUR',new Date('2027-01-02T00:00:00Z')),/expired/);
});

test('real coupon API and quotes calculate product/shipping discounts, enforce limits and invalidate changed quotes', async () => {
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'vestigia-coupons-')),file=path.join(folder,'test.db');
  const sql=new Database(file),migrations=path.resolve('backend/prisma/migrations');
  for(const name of (await fs.readdir(migrations)).sort())if(name!=='migration_lock.toml')sql.exec(await fs.readFile(path.join(migrations,name,'migration.sql'),'utf8'));
  sql.close();
  const db=new PrismaClient({adapter:new PrismaBetterSqlite3({url:'file:'+file.replaceAll('\\','/')})});
  const region=await db.shippingRegion.create({data:{name:'Coupon tests'}});
  await db.shippingCountry.create({data:{countryCode:'IT',countryName:'Italy',regionId:region.id,taxRateBps:1000}});
  const method=await db.shippingMethod.create({data:{name:'Standard',price:0,estimatedDays:'3 days',regionId:region.id}});
  for(const [market,currency] of [['EU','EUR'],['JP','JPY']]){
    await db.priceList.upsert({where:{id:market+'_RETAIL'},update:{status:'ACTIVE',taxJurisdiction:'*'},create:{id:market+'_RETAIL',name:market,market,currency,taxJurisdiction:'*'}});
    await db.shippingPrice.create({data:{shippingMethodId:method.id,currency,amountMinor:1000}});
  }
  const product=await db.product.create({data:{name:'Coupon test',category:'Clothing',price:1,colors:'["black"]',sizes:'["M"]',image:'test.jpg',images:'[]',alt:'test',description:'Test',details:'[]',care:'[]',inventory:{create:{color:'black',size:'M',stock:10}},prices:{create:[{currency:'EUR',priceListId:'EU_RETAIL',priceMinor:10000},{currency:'JPY',priceListId:'JP_RETAIL',priceMinor:10000}]}}});
  const payload={market:'EU',currency:'EUR',priceListId:'EU_RETAIL',shippingCountryCode:'IT',shippingMethodId:method.id,email:'test@example.invalid',items:[{productId:product.id,quantity:1,color:'black',size:'M'}]};
  const service=new PricingService(db),app=express();app.use(express.json());
  installCouponRoutes(app,db,(req,res,next)=>{if(req.get('authorization')!=='Bearer admin'){res.sendStatus(401);return;}next();});app.use(safeErrorHandler);
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+(server.address() as {port:number}).port;
  const post=(route:string,data:object,admin=false)=>fetch(base+'/api/promos'+route,{method:'POST',headers:{'Content-Type':'application/json',...(admin?{Authorization:'Bearer admin'}:{})},body:JSON.stringify(data)});
  const create=async(data:object)=>{const response=await post('',data,true);assert.equal(response.status,201);return response.json();};
  try{
    assert.equal((await fetch(base+'/api/promos')).status,401);
    assert.equal((await post('',{code:'NOAUTH',discount:10})).status,401);
    const percent=await create({code:'SAVE10',type:'percentage',discount:10});assert.equal(percent.percentageBps,1000);
    const verified=await post('/validate',{code:' save10 ',currency:'EUR'});assert.equal(verified.status,200);assert.deepEqual(await verified.json(),{code:'SAVE10',type:'percentage',target:'items'});
    const q=await service.calculateCart({...payload,promoCode:'save10'});assert.equal(q.discountMinor,1000);assert.equal(q.taxMinor,900);assert.equal(q.shippingMinor,1000);assert.equal(q.totalMinor,10900);assert.equal(q.pricedItems[0].totalMinor+q.shippingMinor,q.totalMinor);
    await create({code:'HALFSHIP',type:'percentage',target:'shipping',discount:50});
    const half=await service.calculateCart({...payload,promoCode:'HALFSHIP'});assert.equal(half.discountMinor,0);assert.equal(half.shippingBaseMinor,1000);assert.equal(half.shippingDiscountMinor,500);assert.equal(half.shippingMinor,500);assert.equal(half.taxMinor,1000);assert.equal(half.totalMinor,11500);
    await create({code:'FREESHIP',type:'free_shipping'});
    const free=await service.createQuote({...payload,promoCode:'FREESHIP'});assert.equal(free.shippingDiscountMinor,1000);assert.equal(free.shippingMinor,0);assert.equal(free.totalMinor,11000);
    await create({code:'SHIP20',type:'fixed',target:'shipping',discount:20,currency:'EUR'});
    assert.equal((await service.calculateCart({...payload,promoCode:'SHIP20'})).shippingDiscountMinor,1000);
    await assert.rejects(()=>service.calculateCart({...payload,market:'JP',currency:'JPY',priceListId:'JP_RETAIL',promoCode:'SHIP20'}),/EUR/);
    await create({code:'JPY200',type:'fixed',discount:200,currency:'JPY'});
    assert.equal((await service.calculateCart({...payload,market:'JP',currency:'JPY',priceListId:'JP_RETAIL',promoCode:'JPY200'})).discountMinor,200);
    const limited=await create({code:'ONCE',type:'percentage',discount:10,maxUses:1});
    const one=await service.createQuote({...payload,promoCode:'ONCE'}),two=await service.createQuote({...payload,promoCode:'ONCE'});
    const attempts=await Promise.allSettled([reserveCoupon(db,one),reserveCoupon(db,two)]);
    assert.equal(attempts.filter(result=>result.status==='fulfilled').length,1);
    const held=await db.couponReservation.findFirstOrThrow({where:{promoId:limited.id,state:'RESERVED'}});
    await reserveCoupon(db,held.checkoutId===one.checkoutId?one:two);
    assert.equal((await db.promoCode.findUniqueOrThrow({where:{id:limited.id}})).uses,0);
    await db.couponReservation.update({where:{checkoutId:held.checkoutId},data:{createdAt:new Date(Date.now()-31*60000)}});
    await db.checkoutSnapshot.update({where:{id:held.checkoutId},data:{providerPaymentId:'pi_test_hold',state:'PAYMENT_CREATED'}});
    await releaseAbandonedCoupons(db,{paymentIntents:{retrieve:async()=>({id:'pi_test_hold',status:'succeeded'})}},false);
    assert.equal((await db.couponReservation.findUniqueOrThrow({where:{checkoutId:held.checkoutId}})).state,'RESERVED');
    await releaseAbandonedCoupons(db,{paymentIntents:{retrieve:async()=>({id:'pi_test_hold',status:'requires_payment_method'}),cancel:async()=>{throw Error('Network unavailable');}}},false);
    assert.equal((await db.couponReservation.findUniqueOrThrow({where:{checkoutId:held.checkoutId}})).state,'RESERVED');
    await releaseAbandonedCoupons(db,{paymentIntents:{retrieve:async()=>({id:'pi_test_hold',status:'requires_payment_method'}),cancel:async()=>({status:'canceled'})}},false);
    assert.equal((await db.couponReservation.findUniqueOrThrow({where:{checkoutId:held.checkoutId}})).state,'RELEASED');
    assert.equal((await db.checkoutSnapshot.findUniqueOrThrow({where:{id:held.checkoutId}})).state,'CANCELED');
    const final=await service.createQuote({...payload,promoCode:'ONCE'});await reserveCoupon(db,final);
    await db.promoCode.update({where:{id:limited.id},data:{active:false}});
    await db.$transaction(tx=>redeemCoupon(tx,final));
    await assert.rejects(()=>db.$transaction(tx=>redeemCoupon(tx,final)),/already completed/);
    assert.equal((await db.promoCode.findUniqueOrThrow({where:{id:limited.id}})).uses,1);
    await db.promoCode.update({where:{id:limited.id},data:{active:true}});
    await assert.rejects(()=>service.calculateCart({...payload,promoCode:'ONCE'}),/usage limit/);
    await db.promoCode.update({where:{code:'FREESHIP'},data:{active:false}});
    await assert.rejects(()=>service.validateCheckout({...payload,promoCode:'FREESHIP',checkoutId:free.checkoutId},true),/disabled/);
    // Paid snapshots remain immutable for completion/history.
    assert.equal((await service.validateCheckout({...payload,promoCode:'FREESHIP',checkoutId:free.checkoutId})).totalMinor,11000);
    await db.shippingPrice.update({where:{shippingMethodId_currency:{shippingMethodId:method.id,currency:'EUR'}},data:{freeThresholdMinor:10000}});
    await assert.rejects(()=>service.calculateCart({...payload,promoCode:'SHIP20'}),/already complimentary/);
    assert.equal((await post('/validate',{code:'VESTIGIA20',currency:'EUR'})).status,400);
    assert.equal((await create({code:'ZEROLEGACY',type:'percentage',discount:1})).uses,0);
  } finally {await new Promise<void>(resolve=>server.close(()=>resolve()));await db.$disconnect();}
});
