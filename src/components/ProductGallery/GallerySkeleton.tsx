import React from "react";
import { m as motion } from "framer-motion";

interface GallerySkeletonProps {
  aspectRatio?: string;
  className?: string;
}

export const GallerySkeleton: React.FC<GallerySkeletonProps> = ({
  aspectRatio,
  className = "",
}) => {
  return (
    <motion.div
      className={`vst-gallery-skeleton ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      aria-hidden="true"
    >
      <div className="vst-skeleton-shimmer" />
    </motion.div>
  );
};
