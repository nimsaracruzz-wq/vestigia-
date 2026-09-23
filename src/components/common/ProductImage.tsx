import type { ImgHTMLAttributes } from "react";
import type { Product } from "../../data";
import { getDetailImages, getModelImage, getProductImage, PRODUCT_IMAGE_PLACEHOLDER, resolveProductImageUrl } from "../../utils/productMedia";

type ProductImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  product: Partial<Product>;
  variant?: "shop" | "product" | "detail";
};

export default function ProductImage({ product, variant = "product", alt, onError, ...props }: ProductImageProps) {
  const image = variant === "shop" ? getModelImage(product) : variant === "detail" ? getDetailImages(product)[0] : getProductImage(product);

  return (
    <img
      loading="lazy"
      decoding="async"
      {...props}
      src={resolveProductImageUrl(image)}
      alt={alt || product.alt || product.name || "VESTIGIA product"}
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = PRODUCT_IMAGE_PLACEHOLDER;
        onError?.(event);
      }}
    />
  );
}