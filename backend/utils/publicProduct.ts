import type {Currency as SupportedCurrency} from '../../shared/money.js';
const parseJson=<T>(raw:string,fallback:T):T=>{try{return JSON.parse(raw) as T;}catch{return fallback;}};
export const serializeProduct = (product: {
  id: number;
  published?: boolean;
  name: string;
  category: string;
  productType?: string | null;
  price: number;
  compareAt: number | null;
  badge: string | null;
  slug?: string | null;
  colors: string;
  image: string;
  modelImage?: string | null;
  productImage?: string | null;
  images: string;
  alt: string;
  sizes: string;
  description: string;
  details: string;
  care: string;
  sizeChart?: string | null;
  rating: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  canonicalUrl?: string | null;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  brand?: string | null;
  sku?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  condition?: string | null;
  googleProductCategory?: string | null;
  material?: string | null;
  gender?: string | null;
  ageGroup?: string | null;
  imageTitle?: string | null;
  redirectFrom?: string | null;
  reviews?: Array<{ id: number; author: string; rating: number; date: string; comment: string; status: string }>;
  inventory?: Array<{ color: string; size: string; stock: number }>;
  basePriceMinor?: number | null;
  baseCurrency?: string | null;
  prices?: Array<{ currency: string; priceMinor: number; compareAtMinor: number | null; isActive: boolean; priceListId?: string | null; priceVersion?: number; mode?: string }>;
}) => ({
  ...product,
  colors: parseJson<string[]>(product.colors, []),
  images: parseJson<string[]>(product.images, []),
  sizes: parseJson<string[]>(product.sizes, []),
  details: parseJson<string[]>(product.details, []),
  care: parseJson<string[]>(product.care, []),
  sizeChart: product.sizeChart ? parseJson<object | null>(product.sizeChart, null) : null,
  redirectFrom: product.redirectFrom ? parseJson<string[]>(product.redirectFrom, []) : [],
  inventory: (product.inventory ?? []).reduce((acc, curr) => {
    acc[`${curr.color}_${curr.size}`] = curr.stock;
    return acc;
  }, {} as Record<string, number>),
  baseMoney: product.basePriceMinor != null && product.baseCurrency ? { amountMinor: product.basePriceMinor, currency: product.baseCurrency } : null,
  prices: (product.prices ?? []).reduce((acc, price) => {
    if (!price.isActive) return acc;
    acc[price.currency as SupportedCurrency] = {
      ...price,
      priceMinor: price.priceMinor,
      compareAtMinor: price.compareAtMinor,
    };
    return acc;
  }, {} as Record<string, { priceMinor: number; compareAtMinor: number | null }>),
});
