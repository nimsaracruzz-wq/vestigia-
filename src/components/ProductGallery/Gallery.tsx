import React from "react";
import { useGallery } from "./hooks/useGallery";
import { useImagePreload } from "./hooks/useImagePreload";
import { useSwipe } from "./hooks/useSwipe";
import { GalleryImage } from "./GalleryImage";
import { GalleryThumbnail } from "./GalleryThumbnail";
import { GalleryControls } from "./GalleryControls";
import { GalleryCounter } from "./GalleryCounter";
import { GalleryFullscreen } from "./GalleryFullscreen";

interface GalleryProps {
  images: string[];
  alt: string;
  aspectRatio?: string;
  className?: string;
}

export const Gallery: React.FC<GalleryProps> = React.memo(
  ({ images, alt, aspectRatio = "3/4", className = "" }) => {
    const {
      activeIndex,
      total,
      direction,
      isFullscreen,
      goToNext,
      goToPrev,
      selectImage,
      openFullscreen,
      closeFullscreen,
      isFirst,
      isLast,
    } = useGallery(images, 0);

    // Preload current, next, and previous images silently in background
    useImagePreload(images, activeIndex);

    // Swipe left/right on main product image
    const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe({
      onSwipeLeft: goToNext,
      onSwipeRight: goToPrev,
    });

    if (!images || images.length === 0) return null;

    const currentSrc = images[activeIndex] || images[0];

    return (
      <section
        className={`vst-luxury-gallery-container ${className}`}
        aria-label="Product Image Gallery"
      >
        {/* Main Stage */}
        <div
          className="vst-gallery-stage"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Main Hero Image */}
          <GalleryImage
            src={currentSrc}
            alt={`${alt} view ${activeIndex + 1}`}
            direction={direction}
            priority={activeIndex === 0}
            onClick={openFullscreen}
            aspectRatio={aspectRatio}
          />

          {/* Minimalist Image Counter Badge */}
          <GalleryCounter current={activeIndex} total={total} />

          {/* Desktop & Mobile Arrow / Touch Controls */}
          <GalleryControls
            onPrev={goToPrev}
            onNext={goToNext}
            isFirst={isFirst}
            isLast={isLast}
            total={total}
          />
        </div>

        {/* Thumbnail Navigation Strip */}
        <GalleryThumbnail
          images={images}
          activeIndex={activeIndex}
          onSelect={selectImage}
          altPrefix={alt}
        />

        {/* Fullscreen Zoom & Swipe Modal */}
        <GalleryFullscreen
          isOpen={isFullscreen}
          images={images}
          activeIndex={activeIndex}
          altPrefix={alt}
          onClose={closeFullscreen}
          onPrev={goToPrev}
          onNext={goToNext}
          onSelect={selectImage}
        />
      </section>
    );
  }
);

Gallery.displayName = "Gallery";
export default Gallery;
