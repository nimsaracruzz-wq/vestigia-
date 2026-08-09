import React from "react";
import { motion } from "framer-motion";

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
      animate={{ opacity: [0.5, 0.85, 0.5] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    >
      <div className="vst-skeleton-shimmer" />
    </motion.div>
  );
};
