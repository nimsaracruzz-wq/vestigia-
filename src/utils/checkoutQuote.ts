export type CheckoutQuotePayload = {
  currency: string;
  market: string;
  priceListId: string;
  email: string;
  shippingCountry: string;
  shippingCountryCode?: string;
  shippingMethodId: number | null;
  promoCode?: string;
  items: {
    productId: number;
    quantity: number;
    size: string;
    color: string;
    unitPriceMinor?: number;
    currency?: string;
    priceVersion?: number;
    priceListId?: string;
  }[];
};

/** Price snapshots change when accepting a quote; they are not a new purchase. */
export function checkoutQuoteSignature(payload: CheckoutQuotePayload) {
  return JSON.stringify({
    currency: payload.currency, market: payload.market, priceListId: payload.priceListId,
    email: payload.email.trim().toLowerCase(),
    country: payload.shippingCountryCode || payload.shippingCountry,
    method: payload.shippingMethodId,
    promo: (payload.promoCode || "").trim().toUpperCase(),
    items: payload.items.map(item => [item.productId, item.quantity, item.size, item.color]),
  });
}
