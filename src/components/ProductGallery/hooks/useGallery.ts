import { useState, useCallback } from "react";

export function useGallery(images: string[], initialIndex = 0) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [direction, setDirection] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const total = images ? images.length : 0;

  const goToNext = useCallback(() => {
    if (total <= 1) return;
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goToPrev = useCallback(() => {
    if (total <= 1) return;
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const selectImage = useCallback(
    (index: number) => {
      if (index === activeIndex) return;
      setDirection(index > activeIndex ? 1 : -1);
      setActiveIndex(index);
    },
    [activeIndex]
  );

  const openFullscreen = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  return {
    activeIndex,
    total,
    direction,
    isFullscreen,
    goToNext,
    goToPrev,
    selectImage,
    openFullscreen,
    closeFullscreen,
    isFirst: activeIndex === 0,
    isLast: activeIndex === total - 1,
  };
}
