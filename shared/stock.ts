export const MAX_ORDER_QUANTITY = 99;
export function variantQuantityLimit(inventory: Record<string, number> | undefined, color: string, size: string) {
  const stock = inventory?.[`${color}_${size}`];
  return Number.isSafeInteger(stock) && Number(stock) >= 0 ? Math.min(MAX_ORDER_QUANTITY, Number(stock)) : 0;
}
