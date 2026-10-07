import { PublicError } from './requestSafety.js';

export async function saveInventory(db: any, productId: number, inventory: unknown, expected: unknown) {
  if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory) || !expected || typeof expected !== 'object' || Array.isArray(expected)) throw new PublicError(400, 'INVALID_STOCK', 'Stock values and their previous values are required.');
  return db.$transaction(async (tx: any) => {
    const product = await tx.product.findUnique({ where: { id: productId }, include: { inventory: true } });
    if (!product) throw new PublicError(404, 'NOT_FOUND', 'Product not found.');
    const variants = new Map<string, { color: string; size: string }>();
    for (const color of JSON.parse(product.colors)) for (const size of JSON.parse(product.sizes)) variants.set(`${color}_${size}`, { color, size });
    for (const [key, stock] of Object.entries(inventory)) {
      const variant = variants.get(key);
      if (!variant || !Number.isSafeInteger(stock) || Number(stock) < 0 || Number(stock) > 100000) throw new PublicError(400, 'INVALID_STOCK', 'Use whole stock quantities between 0 and 100,000 for valid variants.');
      const previous = (expected as Record<string, unknown>)[key];
      if (!Number.isSafeInteger(previous) || Number(previous) < 0) throw new PublicError(400, 'INVALID_STOCK', 'Previous stock values are required. Reload inventory.');
      const row = product.inventory.find((i: any) => i.color === variant.color && i.size === variant.size);
      if ((row?.stock ?? 0) !== previous) throw new PublicError(409, 'STOCK_CHANGED', 'Stock changed while you were editing. Reload the product before saving.');
      if (stock === previous && row) continue;
      if (row) {
        const result = await tx.inventory.updateMany({ where: { id: row.id, stock: previous }, data: { stock } });
        if (result.count !== 1) throw new PublicError(409, 'STOCK_CHANGED', 'Stock changed. Reload the product before saving.');
      } else await tx.inventory.create({ data: { productId, ...variant, stock } });
    }
    return tx.product.findUnique({ where: { id: productId }, include: { inventory: true, prices: true, reviews: true } });
  });
}
