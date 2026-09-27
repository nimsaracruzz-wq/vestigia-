/** Multipart fields arrive as strings; JSON API requests already contain objects. */
export function parseProductPrices(value: unknown) {
  if (value === undefined) return undefined;
  let prices = value;
  if (typeof prices === 'string') {
    try { prices = JSON.parse(prices); }
    catch { throw new Error('Market prices must contain valid JSON'); }
  }
  if (!prices || typeof prices !== 'object' || Array.isArray(prices)) {
    throw new Error('Market prices must be an object');
  }
  return prices;
}
