import { variantQuantityLimit } from './stock.js';

type ReorderProduct = { id: number; name: string; published?: boolean; sizes: string[]; colors: string[]; inventory?: Record<string, number>; prices?: Partial<Record<string, { priceMinor: number; priceListId?: string; isActive?: boolean }>> };
type PreviousItem = { productId?: number; productName?: string; size?: string; color?: string; quantity: number };
type BagItem = { product: { id: number }; selectedSize: string; selectedColor: string; quantity: number };

export function buildReorderPlan<T extends ReorderProduct>(items: PreviousItem[], products: T[], bag: BagItem[], currency: string) {
  const lines: { product: T; size: string; color: string; quantity: number }[] = [];
  const issues: string[] = [];
  const reserved = new Map<string, number>();
  const key = (id: number, color: string, size: string) => JSON.stringify([id, color, size]);
  for (const item of bag) {
    const variant = key(item.product.id, item.selectedColor, item.selectedSize);
    reserved.set(variant, (reserved.get(variant) || 0) + item.quantity);
  }
  for (const item of items) {
    const product = item.productId != null ? products.find(p => p.id === Number(item.productId)) : products.find(p => p.name.toLowerCase() === item.productName?.toLowerCase());
    const name = item.productName || product?.name || 'An item';
    if (!product || product.published === false) { issues.push(`${name} is no longer available.`); continue; }
    const { size, color } = item;
    if (!size || !color || !product.sizes.includes(size) || !product.colors.includes(color)) { issues.push(`${name}: the original size or color is no longer available.`); continue; }
    const price = product.prices?.[currency];
    if (!price || !Number.isSafeInteger(price.priceMinor) || price.priceMinor < 0 || !price.priceListId || price.isActive === false) { issues.push(`${name} is unavailable in ${currency}.`); continue; }
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) { issues.push(`${name}: the saved quantity requires review.`); continue; }
    const variant = key(product.id, color, size);
    const limit = variantQuantityLimit(product.inventory, color, size);
    const available = Math.max(0, limit - (reserved.get(variant) || 0));
    const quantity = Math.min(available, item.quantity);
    if (!quantity) { issues.push(limit === 0 ? `${name} is out of stock.` : `${name}: your bag already contains the available quantity.`); continue; }
    lines.push({ product, size, color, quantity });
    reserved.set(variant, (reserved.get(variant) || 0) + quantity);
    if (quantity < item.quantity) issues.push(`${name}: added ${quantity} of ${item.quantity} units because of available stock.`);
  }
  return { lines, issues };
}
