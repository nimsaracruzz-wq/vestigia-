import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryControlsProps {
  onPrev: () => void;
  onNext: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  total: number;
}

export const GalleryControls: React.FC<GalleryControlsProps> = React.memo(
  ({ onPrev, onNext, isFirst = false, isLast = false, total }) => {
    if (total <= 1) return null;

    return (
      <>
        {/* Desktop Arrow Controls (Visible on hover) */}
        <div className="vst-desktop-controls">
          <button
            type="button"
            className="vst-nav-arrow prev"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            disabled={isFirst}
            aria-label="Previous image"
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>

          <button
            type="button"
            className="vst-nav-arrow next"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            disabled={isLast}
            aria-label="Next image"
          >
            <ChevronRight size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Mobile Invisible 25% Touch Zones */}
        <div className="vst-mobile-touch-zones">
          <div
            className="vst-touch-zone left"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            aria-label="Previous image touch zone"
          />
          <div
            className="vst-touch-zone right"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            aria-label="Next image touch zone"
          />
        </div>
      </>
    );
  }
);

GalleryControls.displayName = "GalleryControls";
