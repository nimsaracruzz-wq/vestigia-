import crypto from 'node:crypto';
import type { Express, RequestHandler } from 'express';
import { minor, requireCurrency, resolveMarket, decimalRatio, roundedRatio, toMinor, toMajor, exponent, MARKETS } from '../../shared/money.js';
import { syncPrices, pricingAudit, paymentMatches } from './pricing.js';

export async function processPaymentEvent(db: any, event: any, stripe: any) {
  if (!['payment_intent.succeeded','payment_intent.payment_failed'].includes(event.type)) return;
  const intent = await stripe.paymentIntents.retrieve(event.data.object.id);
  await db.$transaction(async (tx: any) => {
    const previous = await tx.webhookEvent.findUnique({ where: { providerEventId: event.id } });
    if (previous?.processedAt) return;
    const order = await tx.order.findFirst({ where: { stripePaymentIntentId: intent.id } });
    if (order) {
      const mismatch = intent.amount !== order.totalMinor || intent.currency.toUpperCase() !== order.currency || intent.metadata.checkoutId !== order.checkoutId;
      const type = intent.currency.toUpperCase() !== order.currency ? 'PAYMENT_CURRENCY_MISMATCH' : 'PAYMENT_AMOUNT_MISMATCH';
      if (mismatch) {
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAYMENT_MISMATCH' } });
        await tx.pricingAlert.upsert({ where: { key: `webhook:${intent.id}` }, create: { key: `webhook:${intent.id}`, type, details: JSON.stringify({ orderId: order.id, expectedAmount: order.totalMinor, expectedCurrency: order.currency, receivedAmount: intent.amount, receivedCurrency: intent.currency }) }, update: {} });
        await tx.securityEvent.create({ data: { eventType: type, orderId: order.id, actorType: 'stripe', metadata: JSON.stringify({ intentId: intent.id }) } });
      } else if (!['REFUNDED','PARTIALLY_REFUNDED','PAYMENT_MISMATCH'].includes(order.paymentStatus)) {
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: intent.status === 'succeeded' ? 'PAID' : 'FAILED' } });
      }
      // Preserve the provider's actual currency even when it is inconsistent; never relabel evidence.
      const data = { status: mismatch ? 'PAYMENT_MISMATCH' : intent.status, amountMinor: intent.amount, currency: intent.currency.toUpperCase() };
      await tx.payment.upsert({ where: { providerPaymentId: intent.id }, create: { orderId: order.id, provider: 'stripe', providerPaymentId: intent.id, ...data }, update: data });
    }
    await tx.webhookEvent.upsert({ where: { providerEventId: event.id }, create: { provider: 'stripe', providerEventId: event.id, eventType: event.type, processedAt: new Date() }, update: { processedAt: new Date() } });
  });
}

export function installPricingRoutes(app: Express, db: any, auth: RequestHandler, stripe: any, allowMock: boolean) {
  const actor = (req: any) => String(req.admin?.username || req.user?.username || 'admin');
  const route = (fn: any) => async (req: any, res: any) => { try { await fn(req,res); } catch (e: any) { res.status(400).json({ error: e.message }); } };
  app.get('/api/markets', route(async (_req: any,res: any) => res.json(await db.priceList.findMany({ where: { status: 'ACTIVE' } }))));
  app.get('/api/admin/pricing', auth, route(async (_req: any,res: any) => {
    const [lists, prices, products, history, alerts, shippingMethods, shippingPrices, rates] = await Promise.all([db.priceList.findMany(),db.productPrice.findMany(),db.product.findMany({ select: { id:true, name:true, sku:true, baseCurrency:true, basePriceMinor:true } }),db.productPriceHistory.findMany({ orderBy:{ createdAt:'desc' }, take:100 }),pricingAudit(db),db.shippingMethod.findMany(),db.shippingPrice.findMany(),db.exchangeRate.findMany()]);
    res.json({ lists: lists.map((l: any) => ({ ...l, priced: prices.filter((p: any) => p.priceListId===l.id && p.isActive).length, missing: products.filter((p: any) => !prices.some((r: any) => r.productId===p.id && r.priceListId===l.id && r.isActive)).map((p: any) => p.id) })), prices, products, history, alerts, shippingMethods, shippingPrices, rates });
  }));
  app.put('/api/admin/pricing/lists/:id', auth, route(async (req: any,res: any) => {
    const old = await db.priceList.findUnique({ where:{id:req.params.id} });
    if (!old) throw new Error('Unknown price list');
    const taxRateBps=minor(req.body.taxRateBps);
    if(taxRateBps>10000 || !['ACTIVE','DRAFT','INACTIVE'].includes(req.body.status) || !/^(\*|[A-Z]{2}(,[A-Z]{2})*)$/.test(req.body.taxJurisdiction)) throw new Error('Invalid market settings');
    if (!String(req.body.reason || '').trim()) throw new Error('A change reason is required');
    const updated = await db.$transaction(async (tx: any) => {
      const result=await tx.priceList.update({where:{id:old.id},data:{taxRateBps,taxJurisdiction:req.body.taxJurisdiction,status:req.body.status,version:{increment:1}}});
      await tx.securityEvent.create({data:{eventType:'PRICE_LIST_UPDATED',actorType:'admin',actorId:actor(req),metadata:JSON.stringify({before:old,after:result,reason:req.body.reason})}});
      return result;
    }); res.json(updated);
  }));
  app.put('/api/admin/pricing/products/:id', auth, route(async (req: any,res: any) => {
    const id=Number(req.params.id), reason=String(req.body.reason || '');
    await db.$transaction(async (tx: any) => {
      if(req.body.baseCurrency !== undefined) {
        const before=await tx.product.findUnique({where:{id}});
        const baseCurrency=requireCurrency(req.body.baseCurrency),basePriceMinor=minor(req.body.basePriceMinor);
        if(!reason.trim()) throw new Error('A reason is required');
        await tx.product.update({where:{id},data:{baseCurrency,basePriceMinor}});
        await tx.securityEvent.create({data:{eventType:'BASE_PRICE_UPDATED',actorType:'admin',actorId:actor(req),metadata:JSON.stringify({productId:id,oldCurrency:before.baseCurrency,oldAmountMinor:before.basePriceMinor,baseCurrency,basePriceMinor,reason})}});
      }
      await syncPrices(tx,id,req.body.prices,actor(req),reason);
    }); res.json({success:true});
  }));
  app.put('/api/admin/pricing/shipping/:id',auth,route(async(req:any,res:any)=>{
    const currency=requireCurrency(req.body.currency),shippingMethodId=Number(req.params.id),amountMinor=minor(req.body.amountMinor),freeThresholdMinor=req.body.freeThresholdMinor==null?null:minor(req.body.freeThresholdMinor);
    if(!await db.shippingMethod.findUnique({where:{id:shippingMethodId}})) throw new Error('Unknown method');
    if(!String(req.body.reason||'').trim()) throw new Error('A reason is required');
    await db.$transaction(async(tx:any)=>{
      const previous=await tx.shippingPrice.findUnique({where:{shippingMethodId_currency:{shippingMethodId,currency}}});
      await tx.shippingPrice.upsert({where:{shippingMethodId_currency:{shippingMethodId,currency}},create:{shippingMethodId,currency,amountMinor,freeThresholdMinor},update:{amountMinor,freeThresholdMinor}});
      await tx.securityEvent.create({data:{eventType:'SHIPPING_PRICE_UPDATED',actorType:'admin',actorId:actor(req),metadata:JSON.stringify({previous,shippingMethodId,currency,amountMinor,freeThresholdMinor,reason:req.body.reason})}});
    });res.json({success:true});
  }));
  app.post('/api/admin/pricing/rates',auth,route(async(req:any,res:any)=>{
    const sourceCurrency=requireCurrency(req.body.sourceCurrency),targetCurrency=requireCurrency(req.body.targetCurrency),rate=String(req.body.rate),[n]=decimalRatio(rate);
    const fetchedAt=new Date(req.body.fetchedAt);
    if(n===0n || !req.body.provider || Number.isNaN(fetchedAt.getTime()) || fetchedAt>new Date()) throw new Error('Valid rate provenance is required');
    res.json(await db.exchangeRate.create({data:{sourceCurrency,targetCurrency,rate,provider:String(req.body.provider),fetchedAt,createdBy:actor(req)}}));
  }));
  app.post('/api/admin/pricing/convert',auth,route(async(req:any,res:any)=>{
    const rate=await db.exchangeRate.findUnique({where:{id:Number(req.body.rateId)}}),p=await db.product.findUnique({where:{id:Number(req.body.productId)}});
    if(!rate || rate.sourceCurrency!==p?.baseCurrency) throw new Error('Base currency does not match rate');
    const [n,d]=decimalRatio(rate.rate),currency=requireCurrency(rate.targetCurrency);
    res.json({currency,amountMinor:roundedRatio(minor(p.basePriceMinor),n*10n**BigInt(exponent(currency)),d*10n**BigInt(exponent(requireCurrency(p.baseCurrency))))});
  }));
  app.get('/api/admin/pricing/export',auth,route(async(_req:any,res:any)=>{
    const products=await db.product.findMany({include:{prices:true}});
    const cell=(v:any)=>'"'+String(v??'').replaceAll('"','""')+'"';
    const rows=[['productSku','market','currency','price']];
    for(const p of products)for(const r of p.prices){const l=await db.priceList.findUnique({where:{id:r.priceListId||''}});if(l)rows.push([p.sku||String(p.id),l.market,r.currency,String(toMajor(r.priceMinor,requireCurrency(r.currency)))]);}
    res.type('text/csv').send(rows.map(r=>r.map(cell).join(',')).join('\r\n'));
  }));
  app.post('/api/admin/pricing/import',auth,route(async(req:any,res:any)=>{
    if(!Array.isArray(req.body.rows)||req.body.rows.length>1000)throw new Error('Provide up to 1000 validated CSV rows');
    await db.$transaction(async(tx:any)=>{for(const row of req.body.rows){const c=resolveMarket(row.market,row.currency);const product=await tx.product.findFirst({where:{OR:[{sku:String(row.productSku)},{id:Number(row.productSku)||-1}]}});if(!product)throw new Error('Unknown SKU');await syncPrices(tx,product.id,{[c.currency]:{priceMinor:toMinor(String(row.price),c.currency)}},actor(req),String(req.body.reason||''));}});
    res.json({success:true});
  }));
  app.get('/api/orders/:id/refunds',auth,route(async(req:any,res:any)=>res.json(await db.refund.findMany({where:{orderId:req.params.id}}))));
  app.post('/api/orders/:id/refunds',auth,route(async(req:any,res:any)=>{
    const amountMinor=minor(req.body.amountMinor),currency=requireCurrency(req.body.currency),reason=String(req.body.reason||'').trim();
    const id=String(req.body.requestId||'');
    if(!/^[a-zA-Z0-9_-]{16,100}$/.test(id)||!amountMinor||!reason)throw new Error('Refund amount, reason and unique request ID are required');
    const order=await db.order.findUnique({where:{id:req.params.id}});
    if(!order||order.currency!==currency||!order.pricingVersion||!['PAID','PARTIALLY_REFUNDED'].includes(order.paymentStatus))throw new Error('Order requires payment review before refund');
    const refund=await db.$transaction(async(tx:any)=>{
      const existing=await tx.refund.findUnique({where:{id}});
      if(existing){if(existing.orderId!==order.id||existing.amountMinor!==amountMinor||existing.currency!==currency)throw new Error('Refund request ID conflict');return existing;}
      const reserved=await tx.refund.aggregate({where:{orderId:order.id,status:{in:['PENDING','SUCCEEDED']}},_sum:{amountMinor:true}});
      if(amountMinor>order.totalMinor-(reserved._sum.amountMinor||0))throw new Error('Refund exceeds remaining paid amount');
      return tx.refund.create({data:{id,orderId:order.id,amountMinor,currency,status:'PENDING',reason,createdBy:actor(req)}});
    });
    if(refund.status==='SUCCEEDED')return res.json(refund);
    const isMock=order.stripePaymentIntentId?.startsWith('pi_mock_');
    if(isMock&&!allowMock)throw new Error('Mock refunds are disabled');
    let provider:any;
    if(!isMock){
      if(!stripe)throw new Error('Stripe is unavailable; refund remains pending for retry');
      const intent=await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
      if(!paymentMatches(order,intent))throw new Error('Payment does not match original order');
      provider=await stripe.refunds.create({payment_intent:intent.id,amount:amountMinor,metadata:{orderId:order.id,refundId:id}},{idempotencyKey:`refund:${id}`});
      if(provider.currency.toUpperCase()!==currency||provider.amount!==amountMinor)throw new Error('Provider refund mismatch; review required');
    }
    const result=await db.$transaction(async(tx:any)=>{
      const r=await tx.refund.update({where:{id},data:{status:isMock||provider.status==='succeeded'?'SUCCEEDED':provider.status==='failed'?'FAILED':'PENDING',providerRefundId:provider?.id||null}});
      const sum=await tx.refund.aggregate({where:{orderId:order.id,status:'SUCCEEDED'},_sum:{amountMinor:true}});
      if(sum._sum.amountMinor)await tx.order.update({where:{id:order.id},data:{paymentStatus:sum._sum.amountMinor===order.totalMinor?'REFUNDED':'PARTIALLY_REFUNDED',...(sum._sum.amountMinor===order.totalMinor?{status:'refunded'}:{})}});
      await tx.securityEvent.create({data:{eventType:'REFUND_REQUESTED',orderId:order.id,actorType:'admin',actorId:actor(req),metadata:JSON.stringify(r)}});return r;
    });res.json(result);
  }));
}
