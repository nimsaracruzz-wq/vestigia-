import React, { useRef, useEffect } from "react";
import { m as motion } from "framer-motion";
import { useReveal } from "../../animation/Reveal";
import { animationConfig, staggerDelay } from "../../animation/config";

interface GalleryThumbnailProps {
  images: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  altPrefix: string;
}

export const GalleryThumbnail: React.FC<GalleryThumbnailProps> = React.memo(
  ({ images, activeIndex, onSelect, altPrefix }) => {
    const entrance = useReveal({ variant: "fade" });
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

    // Auto-center active thumbnail in scroll container
    useEffect(() => {
      const activeThumb = thumbRefs.current[activeIndex];
      if (activeThumb && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          left: activeThumb.offsetLeft - scrollContainerRef.current.offsetLeft - (scrollContainerRef.current.clientWidth - activeThumb.offsetWidth) / 2,
          behavior: entrance.transition.duration === 0 ? "instant" : "smooth",
        });
      }
    }, [activeIndex]);

    if (!images || images.length <= 1) return null;

    return (
      <div className="vst-thumbnail-strip-wrapper">
        <div className="vst-thumbnail-strip" ref={scrollContainerRef} role="tablist">
          {images.map((img, idx) => {
            const isActive = activeIndex === idx;
            return (
              <motion.button
                {...entrance}
                transition={{ ...entrance.transition, delay: entrance.transition.duration === 0 ? 0 : staggerDelay(idx) }}
                key={idx}
                ref={(el) => {
                  thumbRefs.current[idx] = el;
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`${altPrefix} thumbnail ${idx + 1}`}
                className={`vst-thumbnail-btn ${isActive ? "active" : ""}`}
                onClick={() => onSelect(idx)}
              >
                <img
                  src={img}
                  alt={`${altPrefix} view ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="vst-thumbnail-img"
                />

                {isActive && (
                  <motion.div
                    className="vst-thumbnail-active-border"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }
);

GalleryThumbnail.displayName = "GalleryThumbnail";
