import { useEffect } from "react";

/**
 * Preloads current, next, and previous gallery images in browser cache
 * using requestIdleCallback to avoid blocking main thread rendering.
 */
export function useImagePreload(images: string[], activeIndex: number) {
  useEffect(() => {
    if (!images || images.length <= 1) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? '')) return;

    const nextIndex = (activeIndex + 1) % images.length;
    const prevIndex = (activeIndex - 1 + images.length) % images.length;

    const imagesToPreload = Array.from(
      new Set(window.matchMedia('(max-width:767px)').matches ? [images[nextIndex]] : [images[nextIndex], images[prevIndex]])
    ).filter(Boolean);

    const preload = () => {
      imagesToPreload.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    };

    if ("requestIdleCallback" in window) {
      const handle = (window as any).requestIdleCallback(preload, { timeout: 1500 });
      return () => (window as any).cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(preload, 100);
      return () => clearTimeout(timer);
    }
  }, [images, activeIndex]);
}
