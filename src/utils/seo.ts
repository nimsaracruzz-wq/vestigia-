import { type Product } from "../data";

export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) || "https://thevestigia.com").replace(/\/+$/, "");
export const BRAND_NAME = "VESTIGIA";
export const BRAND_DISPLAY_NAME = "VESTIGIA";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/products/vestigia_logo.png`;

export type JsonLd = Record<string, unknown>;

export const absoluteUrl = (value = "/") => {
  if (/^https?:\/\//i.test(value)) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${SITE_URL}${path}`;
};

export const productPath = (product: Pick<Product, "id" | "slug">) =>
  `/product/${product.slug || product.id}`;

export const slugifySeo = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const collectionPath = (category: string) =>
  `/collections/${slugifySeo(category)}`;

export const productCanonicalUrl = (product: Product) =>
  product.canonicalUrl || absoluteUrl(productPath(product));

export const cleanText = (value = "", max = 180) =>
  value
    .replace(/\s+/g, " ")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, max);

export const imageUrl = (value?: string) => absoluteUrl(value || "/images/products/vestigia_logo.png");

export const productSeoTitle = (product: Product) =>
  product.seoTitle || `${product.name} | ${BRAND_DISPLAY_NAME}`;

export const productSeoDescription = (product: Product) =>
  product.seoDescription || cleanText(product.description, 155);

export const organizationJsonLd = (): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: BRAND_DISPLAY_NAME,
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE,
  sameAs: [
    "https://www.instagram.com/vestigia_official",
    "https://twitter.com/vestigia_official",
  ],
});

export const websiteJsonLd = (): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: `${BRAND_DISPLAY_NAME} Official Online Store`,
  publisher: { "@id": `${SITE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/shop?search={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
});

export const breadcrumbJsonLd = (items: Array<{ name: string; path: string }>): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

export const productJsonLd = (product: Product, currency = "USD"): JsonLd => {
  const offerPrice = product.prices?.[currency as "USD" | "EUR" | "JPY" | "GBP"]?.priceMinor;
  const price = offerPrice == null
    ? NaN
    : offerPrice / (currency === "JPY" ? 1 : 100);
  const inventory = product.inventory ? Object.values(product.inventory).reduce((sum, value) => sum + Number(value || 0), 0) : 1;
  const images = (product.images?.length ? product.images : [product.modelImage || product.image]).filter(Boolean).map(imageUrl);
  const condition = product.condition === "used"
    ? "UsedCondition"
    : product.condition === "refurbished"
      ? "RefurbishedCondition"
      : "NewCondition";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productCanonicalUrl(product)}#product`,
    name: product.name,
    image: images,
    description: productSeoDescription(product),
    sku: product.sku || `VST-${String(product.id).padStart(4, "0")}`,
    mpn: product.mpn || product.sku || `VST-${String(product.id).padStart(4, "0")}`,
    gtin: product.gtin || undefined,
    brand: { "@type": "Brand", name: product.brand || BRAND_DISPLAY_NAME },
    material: product.material || undefined,
    category: product.productType || product.category,
    offers: Number.isFinite(price) ? {
      "@type": "Offer",
      url: productCanonicalUrl(product),
      priceCurrency: currency,
      price: price.toFixed(currency === "JPY" ? 0 : 2),
      itemCondition: `https://schema.org/${condition}`,
      availability: inventory > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@id": `${SITE_URL}/#organization` },
    } : undefined,
  };
};

export const collectionJsonLd = (name: string, description: string, path: string, products: Product[] = []): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name,
  description,
  url: absoluteUrl(path),
  isPartOf: { "@id": `${SITE_URL}/#website` },
  mainEntity: {
    "@type": "ItemList",
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: productCanonicalUrl(product),
      name: product.name,
    })),
  },
});
