import type { Product } from "../data";
import type { CurrencyCode } from "../context/CurrencyContext";

export const PRODUCT_IMAGE_PLACEHOLDER = "/images/products/signature_model.png";

function firstValidImage(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0) || PRODUCT_IMAGE_PLACEHOLDER;
}

export function getModelImage(product: Partial<Product> | null | undefined) {
  return firstValidImage(product?.modelImage, product?.image, product?.images?.[0]);
}

export function getProductImage(product: Partial<Product> | null | undefined) {
  return firstValidImage(product?.productImage, product?.image, product?.images?.[0]);
}

export function getDetailImages(product: Partial<Product> | null | undefined) {
  // Product-only media is assigned to cart/checkout, not automatically to the gallery.
  const images = [getModelImage(product), ...(product?.images || [])];
  return Array.from(new Set(images.filter(Boolean)));
}

export function resolveProductImageUrl(image: string) {
  if (!image.startsWith("/uploads/")) return image;

  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (apiUrl?.startsWith("http")) {
    return `${new URL(apiUrl).origin}${image}`;
  }

  return image;
}

export function getProductPrice(product: Partial<Product> | null | undefined, currency: CurrencyCode) {
  if (product?.prices?.[currency]?.isActive === false) return Number.NaN;
  const fixed = product?.prices?.[currency]?.priceMinor;
  if (typeof fixed === "number") return fixed / (currency === "JPY" ? 1 : 100);
  return Number.NaN;
}

export function getProductCompareAt(product: Partial<Product> | null | undefined, currency: CurrencyCode) {
  const fixed = product?.prices?.[currency]?.compareAtMinor;
  if (typeof fixed === "number") return fixed / (currency === "JPY" ? 1 : 100);
  return null;
}
