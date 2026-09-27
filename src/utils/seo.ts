import { productSchema, productTitle, productDescription, canonicalProduct, slug, type SeoProduct } from '../../shared/seo/product';
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

export const slugifySeo = slug;

export const collectionPath = (category: string) =>
  `/collections/${slugifySeo(category)}`;

export const productCanonicalUrl = (product: Product) =>
  canonicalProduct(product,SITE_URL);

export const cleanText = (value = "", max = 180) =>
  value
    .replace(/\s+/g, " ")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, max);

export const imageUrl = (value?: string) => absoluteUrl(value || "/images/products/vestigia_logo.png");

export const productSeoTitle = (product: Product) =>
  productTitle(product);

export const productSeoDescription = (product: Product) =>
  productDescription(product);

export const organizationJsonLd = (): JsonLd => ({
  "@context": "https://schema.org",
  "@type": ["Organization", "OnlineStore"],
  "@id": `${SITE_URL}/#organization`,
  name: BRAND_DISPLAY_NAME,
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE,
  sameAs: [
    "https://instagram.com/thevestigia",
    "https://tiktok.com/@thevestigia",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "support@thevestigia.com",
    availableLanguage: ["English", "Italian"],
  },
});

export const websiteJsonLd = (): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: `${BRAND_DISPLAY_NAME}`,
  alternateName: `${BRAND_DISPLAY_NAME} Official Online Store`,
  inLanguage: "en",
  publisher: { "@id": `${SITE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/shop?q={search_term_string}`,
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

export const productJsonLd = (product: Product, currency: 'USD'|'EUR'|'JPY'|'GBP' = 'EUR'): JsonLd => productSchema(product as SeoProduct,currency,SITE_URL);

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
