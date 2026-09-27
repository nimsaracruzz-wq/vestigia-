import React from "react";
import { m as motion } from "framer-motion";

interface GalleryCounterProps {
  current: number;
  total: number;
  className?: string;
}

export const GalleryCounter: React.FC<GalleryCounterProps> = React.memo(
  ({ current, total, className = "" }) => {
    if (total <= 1) return null;

    const formattedCurrent = String(current + 1).padStart(2, "0");
    const formattedTotal = String(total).padStart(2, "0");

    return (
      <div className={`vst-gallery-counter ${className}`} aria-live="polite">
        <motion.span
          key={current}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          className="vst-counter-current"
        >
          {formattedCurrent}
        </motion.span>
        <span className="vst-counter-sep">/</span>
        <span className="vst-counter-total">{formattedTotal}</span>
      </div>
    );
  }
);

GalleryCounter.displayName = "GalleryCounter";
