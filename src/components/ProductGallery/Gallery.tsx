import React from "react";
import { useGallery } from "./hooks/useGallery";
import { useImagePreload } from "./hooks/useImagePreload";
import { useGalleryTrack } from "./hooks/useGalleryTrack";
import { Maximize2 } from "lucide-react";
import "./Gallery.css";
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

    const track = useGalleryTrack(activeIndex, total, selectImage);

    if (!images || images.length === 0) return null;



    return (
      <section
        className={`vst-luxury-gallery-container ${className}`}
        aria-label="Product Image Gallery"
      >
        {/* Main Stage */}
        <div className="vst-gallery-stage vst-gallery-stage--editorial">
          <div className="vst-gallery-track" ref={track.trackRef} onScroll={track.onScroll}
            onTouchStart={track.onTouchStart} onTouchEnd={track.onTouchEnd} onTouchCancel={track.onTouchEnd}
            onPointerDown={track.onPointerDown} onPointerMove={track.onPointerMove} onPointerCancel={track.onPointerCancel} onClickCapture={track.onClickCapture}
            onKeyDown={event => {
              if (event.key === 'ArrowRight') { event.preventDefault(); selectImage(Math.min(total - 1, activeIndex + 1)); }
              if (event.key === 'ArrowLeft') { event.preventDefault(); selectImage(Math.max(0, activeIndex - 1)); }
            }}>
            {images.map((src, index) => <div key={src + index} className="vst-gallery-slide" aria-hidden={index !== activeIndex}>
              <GalleryImage src={src} alt={`${alt} view ${index + 1}`} priority={index === 0} active={index === activeIndex} onClick={openFullscreen} aspectRatio={aspectRatio} />
            </div>)}
          </div>
          <button type="button" className="vst-gallery-expand" onClick={openFullscreen} aria-label="Enlarge product photograph"><Maximize2 size={18} strokeWidth={1.4} /></button>
        </div>
        <div className="vst-gallery-toolbar">
          <div className="vst-gallery-position" aria-live="polite" aria-atomic="true"><GalleryCounter current={activeIndex} total={total} /><span className="vst-gallery-hint">Explore the details</span></div>
          <GalleryControls onPrev={goToPrev} onNext={goToNext} isFirst={isFirst} isLast={isLast} total={total} />
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
