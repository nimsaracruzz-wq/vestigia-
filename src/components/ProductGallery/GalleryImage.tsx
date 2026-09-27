import React, { useState, useRef, useEffect, useCallback } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { GallerySkeleton } from "./GallerySkeleton";
import { slideVariants } from "./GalleryAnimations";
import { useReveal } from "../../animation/Reveal";

interface GalleryImageProps {
  src: string;
  alt: string;
  direction?: number;
  priority?: boolean;
  onClick?: () => void;
  aspectRatio?: string;
}

/**
 * Determine whether a given image src has a corresponding WebP version available.
 * Only attempt WebP for image paths that are from the static public folder
 * (i.e. /images/...) — NOT for /uploads/ paths which are dynamically generated
 * by the backend and only exist as the original format.
 *
 * Also excludes external URLs (http/https) since we have no control over their formats.
 */
function deriveWebPSrc(src: string): string | null {
  if (!src) return null;

  // External URLs → no WebP attempt
  if (src.startsWith("http://") || src.startsWith("https://")) return null;

  // Backend upload paths (e.g. /uploads/1234-image.png) → NO WebP, files don't exist
  if (src.startsWith("/uploads/")) return null;

  // Static public folder images (e.g. /images/products/foo.png) → safe to attempt WebP
  if ((src.endsWith(".jpg") || src.endsWith(".png")) && src.startsWith("/images/")) {
    return src.replace(/\.(jpg|png)$/, ".webp");
  }

  return null;
}

export const GalleryImage: React.FC<GalleryImageProps> = React.memo(
  ({ src, alt, direction = 0, priority = true, onClick, aspectRatio = "3/4" }) => {
    const entrance = useReveal({ variant: "fade", disabled: true });
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // Only attempt WebP for static public images — NOT for /uploads/ paths
    const webpSrc = deriveWebPSrc(src);

    // Reset state when src changes (e.g. thumbnail click)
    useEffect(() => {
      setIsLoaded(false);
      setHasError(false);
    }, [src]);

    // Detect if image is already in the browser cache (instant display)
    useEffect(() => {
      if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
        setIsLoaded(true);
      }
    }, [src]);

    const handleLoad = useCallback(() => {
      setIsLoaded(true);
      setHasError(false);
    }, []);

    const handleError = useCallback(() => {
      setHasError(true);
      setIsLoaded(true); // stop spinner, show fallback
    }, []);

    return (
      <motion.div
        {...entrance}
        className="vst-gallery-main-image-container"
        style={{ aspectRatio }}
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={`Enlarge ${alt}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        {/* Skeleton: shown while image is loading */}
        {!isLoaded && <GallerySkeleton />}

        {/* Error fallback: shown when image fails to load */}
        {hasError && (
          <div className="vst-gallery-error-fallback" aria-label="Image unavailable">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#c8bfb5"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}

        <AnimatePresence custom={direction} initial={false}>
          <motion.picture
            key={src}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="vst-gallery-picture"
          >
            {/* Only add WebP source for known-safe paths — avoids broken source for /uploads/ */}
            {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
            <img
              ref={imgRef}
              src={src}
              alt={alt}
              width={800}
              height={1067}
              decoding="async"
              loading={priority ? "eager" : "lazy"}
              // @ts-ignore — fetchpriority is a valid HTML attribute
              fetchpriority={priority ? "high" : "auto"}
              onLoad={handleLoad}
              onError={handleError}
              className={`vst-gallery-img ${isLoaded && !hasError ? "loaded" : "loading"}`}
            />
          </motion.picture>
        </AnimatePresence>
      </motion.div>
    );
  }
);

GalleryImage.displayName = "GalleryImage";
