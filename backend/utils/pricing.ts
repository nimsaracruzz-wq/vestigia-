import crypto from 'node:crypto';
import { calculateCountryTax } from './countryTax.js';
import { SUPPORTED_CURRENCIES, MARKETS, requireCurrency, resolveMarket, minor, roundedRatio, allocate, formatMoney, decimalRatio, exponent, type Currency } from '../../shared/money.js';
export { SUPPORTED_CURRENCIES, formatMoney };
export type SupportedCurrency = Currency;
export function getCurrencyForCountry(country: string): Currency {
  const code = String(country).toUpperCase();
  if (['JP','JAPAN'].includes(code)) return 'JPY';
  if (['GB','UK','UNITED KINGDOM'].includes(code)) return 'GBP';
  if (['AT','BE','BG','CY','EE','FI','FR','DE','GR','IE','IT','HR','LV','LT','LU','MT','NL','PT','SK','SI','ES','FRANCE','GERMANY','ITALY','SPAIN'].includes(code)) return 'EUR';
  return 'USD';
}
export function checkoutHash(p: any) {
  return crypto.createHash('sha256').update(JSON.stringify({ market: p.market, currency: p.currency, priceListId: p.priceListId,
    country: p.shippingCountryCode || p.shippingCountry || p.shippingForm?.country, method: Number(p.shippingMethodId),
    promo: String(p.promoCode || '').trim().toUpperCase(), email: String(p.email || '').trim().toLowerCase(),
    items: (p.items || []).map((i: any) => [Number(i.productId), Number(i.quantity), i.size || 'OS', i.color || '']),
  })).digest('hex');
}
export class PricingService {
  constructor(private db: any) {}
  async calculateCart(payload: any) {
    const context = resolveMarket(payload.market, payload.currency, payload.priceListId);
    const list = await this.db.priceList.findUnique({ where: { id: context.priceListId } });
    if (!list || list.status !== 'ACTIVE' || list.currency !== context.currency || list.market !== context.market) throw new Error('Price list is unavailable');
    const requested = payload.items;
    if (!Array.isArray(requested) || !requested.length || requested.length > 50) throw new Error('Cart must contain 1–50 lines');
    const country = String(payload.shippingCountryCode || payload.shippingCountry || payload.shippingForm?.country || '');
    const shippingCountry = await this.db.shippingCountry.findFirst({ where: { OR: [{ countryCode: country.toUpperCase() }, { countryName: country }] }, include: { region: true } });
    if (!shippingCountry?.isEnabled || !shippingCountry.region?.isActive) throw new Error('Shipping is unavailable');
    if (list.taxJurisdiction !== '*' && !list.taxJurisdiction.split(',').includes(shippingCountry.countryCode)) throw new Error('This market is not configured for the delivery tax jurisdiction. Select the appropriate market and restart checkout.');
    const products = await this.db.product.findMany({ where: { id: { in: requested.map((i: any) => Number(i.productId)) } }, include: { prices: true, inventory: true } });
    const seen = new Set<string>();
    const pricedItems: any[] = requested.map((item: any) => {
      const product = products.find((p: any) => p.id === Number(item.productId));
      if (!product) throw new Error('Product is unavailable');
      const quantity = minor(item.quantity);
      if (quantity < 1 || quantity > 99) throw new Error('Invalid quantity');
      const size = String(item.size || 'OS'), color = String(item.color || '');
      const key = JSON.stringify([product.id, size, color]);
      if (seen.has(key)) throw new Error('Duplicate variant lines are not allowed');
      seen.add(key);
      if (!JSON.parse(product.sizes).includes(size) || !JSON.parse(product.colors).includes(color)) throw new Error('Variant is unavailable');
      const stock = product.inventory.find((i: any) => i.size === size && i.color === color);
      if (!stock || stock.stock < quantity) throw new Error(`${product.name} does not have enough stock`);
      const price = product.prices.find((p: any) => p.currency === context.currency && p.priceListId === list.id && p.isActive);
      if (!price) throw new Error(`${product.name} has no active ${context.currency} price`);
      const unitPriceMinor = minor(price.priceMinor);
      return { product, quantity, size, color, variantId: String(stock.id), skuSnapshot: product.sku, unitPriceMinor, subtotalMinor: minor(unitPriceMinor * quantity), priceVersion: price.priceVersion, currency: context.currency, priceListId: list.id, inventoryControlled: true };
    });
    const subtotalMinor = minor(pricedItems.reduce((s: number, i: any) => s + i.subtotalMinor, 0));
    let discountMinor = 0, promo: any = null;
    const code = String(payload.promoCode || '').trim().toUpperCase();
    if (code) {
      promo = await this.db.promoCode.findUnique({ where: { code } });
      if (!promo?.active || (promo.expiry && new Date(promo.expiry) < new Date()) || (promo.maxUses !== null && promo.uses >= promo.maxUses)) throw new Error('Promo code is unavailable');
      if (promo.type === 'fixed') {
        if (promo.currency !== context.currency || promo.amountMinor === null) throw new Error('Promo code does not support this currency');
        discountMinor = Math.min(subtotalMinor, minor(promo.amountMinor));
      } else {
        const bps = minor(promo.percentageBps);
        if (bps > 10000) throw new Error('Invalid discount');
        discountMinor = roundedRatio(subtotalMinor, BigInt(bps), 10000n);
      }
    }
    const method = await this.db.shippingMethod.findUnique({ where: { id: Number(payload.shippingMethodId) } });
    if (!method?.isActive || method.regionId !== shippingCountry.regionId) throw new Error('Selected shipping method is unavailable');
    const shippingPrice = await this.db.shippingPrice.findUnique({ where: { shippingMethodId_currency: { shippingMethodId: method.id, currency: context.currency } } });
    if (!shippingPrice) throw new Error('Shipping price is not configured for this currency');
    const net = subtotalMinor - discountMinor;
    const shippingMinor = shippingPrice.freeThresholdMinor !== null && net >= shippingPrice.freeThresholdMinor ? 0 : minor(shippingPrice.amountMinor);
    const { taxMinor, taxRateBps } = calculateCountryTax(shippingCountry.taxRateBps, net, context.currency, list.taxRateBps);
    const discounts = allocate(discountMinor, pricedItems.map((i: any) => i.subtotalMinor));
    const taxes = allocate(taxMinor, pricedItems.map((i: any, n: number) => i.subtotalMinor - discounts[n]));
    pricedItems.forEach((i: any, n: number) => Object.assign(i, { discountMinor: discounts[n], taxMinor: taxes[n], totalMinor: i.subtotalMinor - discounts[n] + taxes[n] }));
    const priceChanged = requested.some((i: any, n: number) => i.unitPriceMinor !== pricedItems[n].unitPriceMinor || i.currency !== context.currency || i.priceVersion !== pricedItems[n].priceVersion || i.priceListId !== list.id);
    return { ...context, priceListVersion: list.version, pricedItems, subtotalMinor, discountMinor, shippingMinor, taxMinor, taxRateBps, totalMinor: minor(net + shippingMinor + taxMinor), promo, shippingCountry, shippingMethod: method, priceChanged };
  }
  async createQuote(payload: any) {
    const quote = await this.calculateCart(payload);
    const row = await this.db.checkoutSnapshot.create({ data: { id: crypto.randomUUID(), ...resolveMarket(payload.market, payload.currency, payload.priceListId), priceListVersion: quote.priceListVersion, totalMinor: quote.totalMinor, payloadHash: checkoutHash(payload), snapshot: JSON.stringify(quote), expiresAt: new Date(Date.now() + 15 * 60000) } });
    return { ...quote, checkoutId: row.id, expiresAt: row.expiresAt };
  }
  async validateCheckout(payload: any, forPayment = false) {
    const saved = await this.db.checkoutSnapshot.findUnique({ where: { id: String(payload.checkoutId || '') } });
    if (!saved || saved.payloadHash !== checkoutHash(payload)) throw new Error('Checkout context changed. Review a new quote.');
    if (forPayment && new Date(saved.expiresAt) < new Date()) throw new Error('Checkout quote expired. Review a new quote.');
    if (forPayment) {
      const current = await this.calculateCart(payload), previous = JSON.parse(saved.snapshot);
      if (current.priceListVersion !== saved.priceListVersion || current.totalMinor !== saved.totalMinor || current.taxMinor !== previous.taxMinor || current.taxRateBps !== previous.taxRateBps || current.shippingMinor !== previous.shippingMinor || current.discountMinor !== previous.discountMinor || current.pricedItems.some((i: any, n: number) => i.priceVersion !== previous.pricedItems[n]?.priceVersion || i.unitPriceMinor !== previous.pricedItems[n]?.unitPriceMinor)) throw new Error('One or more prices changed. Review a new quote.');
    }
    return { ...JSON.parse(saved.snapshot), checkoutId: saved.id, providerPaymentId: saved.providerPaymentId, checkoutState: saved.state };
  }
}
export async function syncPrices(db: any, productId: number, raw: any, actor: string, reason: string) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Explicit market prices are required');
  for (const [code, entry] of Object.entries(raw) as [string, any][]) {
    const currency = requireCurrency(code), market = Object.entries(MARKETS).find(([, m]) => m.currency === currency)![0];
    const list = await db.priceList.findUnique({ where: { market } });
    if (!list) throw new Error('Price list is not configured');
    const old = await db.productPrice.findUnique({ where: { productId_currency: { productId, currency } } });
    const priceMinor = minor(entry.priceMinor), compareAtMinor = entry.compareAtMinor == null ? null : minor(entry.compareAtMinor), isActive = entry.isActive !== false;
    if (compareAtMinor !== null && compareAtMinor <= priceMinor) throw new Error('Compare-at price must exceed selling price');
    if (old && old.priceMinor === priceMinor && old.compareAtMinor === compareAtMinor && old.isActive === isActive && old.priceListId === list.id && old.mode === (entry.mode || 'FIXED')) continue;
    if (!reason.trim()) throw new Error('A reason is required for price changes');
    let conversion: string | null = null;
    if (entry.mode === 'CONVERTED') {
      const rate = await db.exchangeRate.findUnique({ where: { id: Number(entry.exchangeRateId) } }), product = await db.product.findUnique({ where: { id: productId } });
      if (!rate || rate.sourceCurrency !== product.baseCurrency || rate.targetCurrency !== currency) throw new Error('A matching audited exchange rate is required');
      const [n,d] = decimalRatio(rate.rate);
      if (roundedRatio(minor(product.basePriceMinor), n * 10n ** BigInt(exponent(currency)), d * 10n ** BigInt(exponent(requireCurrency(product.baseCurrency)))) !== priceMinor) throw new Error('Converted amount does not match the server rate');
      conversion = JSON.stringify({ rateId: rate.id, baseAmountMinor: product.basePriceMinor, baseCurrency: product.baseCurrency, rate: rate.rate, provider: rate.provider, fetchedAt: rate.fetchedAt, rounding: 'HALF_UP' });
    } else if (entry.mode && entry.mode !== 'FIXED') throw new Error('Unsupported pricing mode');
    const version = (old?.priceVersion || 0) + 1;
    const data = { currency, priceListId: list.id, priceMinor, compareAtMinor, isActive, priceVersion: version, mode: entry.mode || 'FIXED', conversion };
    await db.productPrice.upsert({ where: { productId_currency: { productId, currency } }, create: { productId, ...data }, update: data });
    await db.priceList.update({ where: { id: list.id }, data: { version: { increment: 1 } } });
    await db.productPriceHistory.create({ data: { productId, market, currency, oldAmountMinor: old?.priceMinor ?? null, newAmountMinor: priceMinor, priceVersion: version, changedBy: actor, reason } });
  }
}
export function paymentMatches(order: any, intent: any) { return order.totalMinor === intent.amount && order.currency === String(intent.currency).toUpperCase() && order.stripePaymentIntentId === intent.id && intent.status === 'succeeded'; }
export async function pricingAudit(db: any) {
  const alerts: any[] = [], orders = await db.order.findMany({ include: { items: true, payments: true } });
  const add = (key: string, type: string, data: any) => alerts.push({ key, type, details: JSON.stringify(data) });
  for (const o of orders) {
    if (!o.pricingVersion) add(`legacy:${o.id}`, 'LEGACY_ORDER_REVIEW', { orderId: o.id, currency: o.currency, totalMinor: o.totalMinor, legacyTotal: o.total, reason: 'Historical provenance requires review; no amounts changed.' });
    for (const p of o.payments) if (p.currency !== o.currency || p.amountMinor !== o.totalMinor) add(`payment:${p.id}`, p.currency !== o.currency ? 'PAYMENT_CURRENCY_MISMATCH' : 'PAYMENT_AMOUNT_MISMATCH', { orderId: o.id, stored: { amountMinor: o.totalMinor, currency: o.currency }, payment: { amountMinor: p.amountMinor, currency: p.currency } });
    for (const i of o.items) if (i.currency !== o.currency) add(`item:${i.id}`, 'ORDER_ITEM_CURRENCY_MISMATCH', { orderId: o.id, itemId: i.id });
  }
  for (const r of await db.refund.findMany()) if (orders.find((o: any) => o.id === r.orderId)?.currency !== r.currency) add(`refund:${r.id}`, 'REFUND_CURRENCY_MISMATCH', r);
  const lists = await db.priceList.findMany();
  for (const p of await db.productPrice.findMany()) if (!lists.some((l: any) => l.id === p.priceListId && l.currency === p.currency)) add(`price:${p.id}`, 'PRICE_LIST_CURRENCY_MISMATCH', p);
  for (const a of alerts) await db.pricingAlert.upsert({ where: { key: a.key }, create: a, update: { details: a.details } });
  return db.pricingAlert.findMany({ orderBy: { createdAt: 'desc' } });
}

