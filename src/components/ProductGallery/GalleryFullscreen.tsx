import React, { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { usePinchZoom } from "./hooks/usePinchZoom";
import { useSwipe } from "./hooks/useSwipe";
import { GalleryCounter } from "./GalleryCounter";
import { GalleryZoom } from "./GalleryZoom";
import {
  fullscreenBackdropVariants,
  fullscreenContentVariants,
} from "./GalleryAnimations";

interface GalleryFullscreenProps {
  isOpen: boolean;
  images: string[];
  activeIndex: number;
  altPrefix: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
}

export const GalleryFullscreen: React.FC<GalleryFullscreenProps> = ({
  isOpen,
  images,
  activeIndex,
  altPrefix,
  onClose,
  onPrev,
  onNext,
  onSelect,
}) => {
  const {
    scale,
    position,
    resetZoom,
    handleDoubleTap,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isZoomed,
  } = usePinchZoom(3.5, 1);

  // Swipe navigation and pull-down to close
  const { onTouchStart: onSwipeStart, onTouchMove: onSwipeMove, onTouchEnd: onSwipeEnd } = useSwipe({
    onSwipeLeft: () => {
      if (!isZoomed) {
        resetZoom();
        onNext();
      }
    },
    onSwipeRight: () => {
      if (!isZoomed) {
        resetZoom();
        onPrev();
      }
    },
    onSwipeDown: () => {
      if (!isZoomed) {
        resetZoom();
        onClose();
      }
    },
  });

  // Reset zoom whenever active index changes
  useEffect(() => {
    resetZoom();
  }, [activeIndex, resetZoom]);

  // Keyboard navigation: ESC closes, Arrow keys navigate
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        resetZoom();
        onPrev();
      } else if (e.key === "ArrowRight") {
        resetZoom();
        onNext();
      }
    },
    [isOpen, onClose, onPrev, onNext, resetZoom]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden"; // Lock background scrolling
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const currentSrc = images[activeIndex];

  return (
    <AnimatePresence>
      <div className="vst-fullscreen-portal" role="dialog" aria-modal="true" aria-label="Expanded Image Gallery">
        {/* Dark Backdrop */}
        <motion.div
          className="vst-fullscreen-backdrop"
          variants={fullscreenBackdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={onClose}
        />

        {/* Top Header Bar (Safe Area Supported) */}
        <div className="vst-fullscreen-header">
          <GalleryCounter current={activeIndex} total={images.length} className="fullscreen" />

          <button
            type="button"
            className="vst-fullscreen-close-btn"
            onClick={onClose}
            aria-label="Close fullscreen gallery (ESC)"
          >
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>

        {/* Desktop Left/Right Navigation Arrows */}
        {images.length > 1 && !isZoomed && (
          <>
            <button
              type="button"
              className="vst-fullscreen-arrow prev"
              onClick={() => {
                resetZoom();
                onPrev();
              }}
              aria-label="Previous image"
            >
              <ChevronLeft size={28} strokeWidth={1.2} />
            </button>

            <button
              type="button"
              className="vst-fullscreen-arrow next"
              onClick={() => {
                resetZoom();
                onNext();
              }}
              aria-label="Next image"
            >
              <ChevronRight size={28} strokeWidth={1.2} />
            </button>
          </>
        )}

        {/* Main Fullscreen Image Area with Pinch/Double-tap Zoom & Touch Swipe */}
        <motion.div
          className="vst-fullscreen-stage"
          variants={fullscreenContentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onTouchStart={(e) => {
            handleTouchStart(e);
            onSwipeStart(e);
          }}
          onTouchMove={(e) => {
            handleTouchMove(e);
            onSwipeMove(e);
          }}
          onTouchEnd={() => {
            handleTouchEnd();
            onSwipeEnd();
          }}
        >
          <GalleryZoom
            scale={scale}
            position={position}
            onDoubleTap={handleDoubleTap}
            onTouchStart={() => {}}
            onTouchMove={() => {}}
            onTouchEnd={() => {}}
          >
            <img
              src={currentSrc}
              alt={`${altPrefix} expanded view ${activeIndex + 1}`}
              className="vst-fullscreen-img"
              draggable={false}
            />
          </GalleryZoom>
        </motion.div>

        {/* Bottom Thumbnail Strip */}
        {images.length > 1 && !isZoomed && (
          <div className="vst-fullscreen-footer">
            <div className="vst-fullscreen-thumbs">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`vst-fs-thumb-btn ${activeIndex === idx ? "active" : ""}`}
                  onClick={() => {
                    resetZoom();
                    onSelect(idx);
                  }}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
