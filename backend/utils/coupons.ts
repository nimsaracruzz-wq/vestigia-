import type { Express, RequestHandler } from 'express';
import type { PrismaClient } from '@prisma/client';
import { minor, requireCurrency, roundedRatio, toMinor, toMajor, type Currency } from '../../shared/money.js';
import { PublicError, createRateLimiter } from './requestSafety.js';

const invalid = (message: string): never => { throw new PublicError(400, 'COUPON_INVALID', message); };
export function normalizeCoupon(input: any) {
  const code = String(input.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code)) invalid('Use a code of 2–40 letters, numbers, hyphens or underscores.');
  const type = input.type || 'percentage', target = type === 'free_shipping' ? 'shipping' : input.target || 'items';
  if (!['percentage', 'fixed', 'free_shipping'].includes(type) || !['items', 'shipping'].includes(target)) invalid('Choose a valid discount type and target.');
  const maxUses = input.maxUses == null || input.maxUses === '' ? null : Number(input.maxUses);
  if (maxUses !== null && (!Number.isSafeInteger(maxUses) || maxUses < 1)) invalid('Maximum uses must be a positive whole number.');
  let expiry: string | null = null;
  if (input.expiry) {
    const raw = String(input.expiry);
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw + 'T23:59:59.999Z' : raw);
    if (!Number.isFinite(date.getTime()) || (/^\d{4}-\d{2}-\d{2}$/.test(raw) && date.toISOString().slice(0, 10) !== raw)) invalid('Expiry date is invalid.');
    expiry = date.toISOString();
  }
  let currency: Currency | null = null, amountMinor: number | null = null, percentageBps: number | null = null, discount = 0;
  try {
    if (type === 'fixed') {
      currency = requireCurrency(input.currency);
      amountMinor = input.amountMinor == null ? toMinor(String(input.discount), currency) : minor(input.amountMinor);
      if (!amountMinor) invalid('Fixed discount must be greater than zero.');
      discount = toMajor(amountMinor, currency);
    } else if (type === 'percentage') {
      percentageBps = input.percentageBps == null ? toMinor(String(input.discount), 'USD') : minor(input.percentageBps);
      if (!percentageBps || percentageBps > 10000) invalid('Percentage must be greater than zero and no more than 100, with up to two decimal places.');
      discount = percentageBps / 100;
    }
  } catch (error) {
    if (error instanceof PublicError) throw error;
    invalid(type === 'fixed' ? 'Choose a currency and a valid fixed amount (JPY has no decimal places).' : 'Enter a valid percentage with up to two decimal places.');
  }
  if (input.active !== undefined && typeof input.active !== 'boolean') invalid('Active must be true or false.');
  return { code, type, target, maxUses, expiry, currency, amountMinor, percentageBps, discount, active: input.active !== false };
}

export function validateCoupon(promo: any, currency: Currency, now = new Date()) {
  if (!promo) invalid('Discount code was not found.');
  if (!promo.active) invalid('This discount code is disabled.');
  if (promo.expiry) {
    const raw = /^\d{4}-\d{2}-\d{2}$/.test(promo.expiry) ? promo.expiry + 'T23:59:59.999Z' : promo.expiry;
    const expiry = new Date(raw);
    if (!Number.isFinite(expiry.getTime()) || expiry <= now) invalid('This discount code has expired.');
  }
  if (promo.maxUses != null && promo.uses >= promo.maxUses) invalid('This discount code has reached its usage limit.');
  if (promo.type === 'fixed') {
    if (promo.currency !== currency) invalid('This discount code requires checkout currency ' + (promo.currency || 'to be configured by the store') + '.');
    if (!Number.isSafeInteger(promo.amountMinor) || promo.amountMinor <= 0) invalid('This discount code needs its amount configured by the store.');
  } else if (promo.type === 'percentage') {
    const bps = promo.percentageBps ?? Math.round(promo.discount * 100);
    if (!Number.isSafeInteger(bps) || bps <= 0 || bps > 10000) invalid('This discount code needs its percentage configured by the store.');
  } else if (promo.type !== 'free_shipping') invalid('This discount code has an unsupported type.');
  if (promo.target && !['items', 'shipping'].includes(promo.target)) invalid('This discount code has an unsupported target.');
  return promo;
}

export function couponAmount(promo: any, eligible: number) {
  minor(eligible);
  if (promo.type === 'free_shipping') return eligible;
  if (promo.type === 'fixed') return Math.min(eligible, minor(promo.amountMinor));
  return Math.min(eligible, roundedRatio(eligible, BigInt(promo.percentageBps ?? Math.round(promo.discount * 100)), 10000n));
}

export async function reserveCoupon(db: any, quote: any) {
  if (!quote.promo?.id) return;
  await db.$transaction(async (tx: any) => {
    const existing = await tx.couponReservation.findUnique({ where: { checkoutId: quote.checkoutId } });
    if (existing?.state === 'RESERVED' && existing.promoId === quote.promo.id) return;
    if (existing) invalid('This coupon reservation is no longer available. Start a new checkout.');
    const current = validateCoupon(await tx.promoCode.findUnique({ where: { id: quote.promo.id } }), quote.currency);
    const reserved = await tx.couponReservation.count({ where: { promoId: current.id, state: 'RESERVED' } });
    if (current.maxUses != null && current.uses + reserved >= current.maxUses) invalid('The remaining uses of this code are reserved by pending payments. Remove it or try again later.');
    await tx.couponReservation.create({ data: { checkoutId: quote.checkoutId, promoId: current.id } });
  });
}

export async function redeemCoupon(tx: any, quote: any) {
  if (!quote.promo?.id) return;
  const reservation = await tx.couponReservation.findUnique({ where: { checkoutId: quote.checkoutId } });
  if (reservation) {
    const redeemed = await tx.couponReservation.updateMany({ where: { checkoutId: quote.checkoutId, state: 'RESERVED' }, data: { state: 'REDEEMED' } });
    if (redeemed.count !== 1) invalid('This coupon checkout was already completed or canceled.');
    // Honor a payment already agreed, including a later admin edit or deletion of the code.
    await tx.promoCode.updateMany({ where: { id: reservation.promoId }, data: { uses: { increment: 1 } } });
    return;
  }
  // Support payments started before this reservation migration without repricing an agreed charge.
  await tx.promoCode.updateMany({ where: { id: quote.promo.id }, data: { uses: { increment: 1 } } });
}

export async function releaseAbandonedCoupons(db: any, stripe: any, allowMock: boolean) {
  const holds = await db.couponReservation.findMany({ where: { state: 'RESERVED', createdAt: { lt: new Date(Date.now() - 30 * 60000) } }, orderBy: { createdAt: 'asc' }, take: 20 });
  for (const hold of holds) {
    const checkout = await db.checkoutSnapshot.findUnique({ where: { id: hold.checkoutId } });
    if (!checkout || checkout.state === 'ORDERED') continue;
    // With no stored provider ID, this endpoint has never delivered a client secret.
    // The final payment-start update checks CANCELED before it can deliver one.
    let canceled = !checkout.providerPaymentId;
    if (checkout.providerPaymentId?.startsWith('pi_mock_')) canceled = allowMock;
    else if (checkout.providerPaymentId && stripe) {
      try {
        const intent = await stripe.paymentIntents.retrieve(checkout.providerPaymentId);
        if (intent.status === 'canceled') canceled = true;
        else if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(intent.status)) {
          canceled = (await stripe.paymentIntents.cancel(intent.id, { cancellation_reason: 'abandoned' })).status === 'canceled';
        }
      } catch { /* Uncertain, processing, or paid payments keep their slot. Never infer cancellation. */ }
    }
    if (canceled) await db.$transaction(async (tx: any) => {
      const stopped = await tx.checkoutSnapshot.updateMany({ where: { id: checkout.id, providerPaymentId: checkout.providerPaymentId, state: { not: 'ORDERED' } }, data: { state: 'CANCELED' } });
      if (stopped.count) await tx.couponReservation.updateMany({ where: { checkoutId: checkout.id, state: 'RESERVED' }, data: { state: 'RELEASED' } });
    });
  }
}

export function installCouponRoutes(app: Express, db: PrismaClient, auth: RequestHandler) {
  const limit = createRateLimiter({ windowMs: 60000, max: 30, keyPrefix: 'coupon-validation' });
  app.post('/api/promos/validate', limit, async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      const code = String(req.body?.code || '').trim().toUpperCase();
      if (code.length > 40) invalid('Discount code is too long.');
      const currency = requireCurrency(req.body?.currency);
      const promo = validateCoupon(await db.promoCode.findUnique({ where: { code } }), currency);
      res.json({ code: promo.code, target: promo.target, type: promo.type });
    } catch (error) { next(error); }
  });
  app.get('/api/promos', auth, async (_req, res, next) => {
    try {
      const [codes, holds] = await Promise.all([
        db.promoCode.findMany({ orderBy: { id: 'asc' } }),
        db.couponReservation.groupBy({ by: ['promoId'], where: { state: 'RESERVED' }, _count: { _all: true } }),
      ]);
      res.set('Cache-Control', 'no-store').json(codes.map(code => ({ ...code, reservedUses: holds.find(hold => hold.promoId === code.id)?._count._all || 0 })));
    } catch (error) { next(error); }
  });
  app.post('/api/promos', auth, async (req, res, next) => {
    try { res.status(201).json(await db.promoCode.create({ data: normalizeCoupon(req.body) })); } catch (error) { next(error); }
  });
  app.put('/api/promos/:id', auth, async (req, res, next) => {
    try {
      const current = await db.promoCode.findUnique({ where: { id: Number(req.params.id) } });
      if (!current) throw new PublicError(404, 'NOT_FOUND', 'Discount code was not found.');
      if (Object.keys(req.body).length === 1 && typeof req.body.active === 'boolean') {
        res.json(await db.promoCode.update({ where: { id: current.id }, data: { active: req.body.active } })); return;
      }
      const merged = { ...current, ...req.body };
      if (req.body.discount !== undefined && req.body.amountMinor === undefined) merged.amountMinor = undefined;
      if (req.body.discount !== undefined && req.body.percentageBps === undefined) merged.percentageBps = undefined;
      res.json(await db.promoCode.update({ where: { id: current.id }, data: normalizeCoupon(merged) }));
    } catch (error) { next(error); }
  });
  app.delete('/api/promos/:id', auth, async (req, res, next) => {
    try { await db.promoCode.delete({ where: { id: Number(req.params.id) } }); res.sendStatus(204); } catch (error) { next(error); }
  });
}
