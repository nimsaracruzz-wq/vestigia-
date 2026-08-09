import React from "react";
import { motion } from "framer-motion";

interface GalleryZoomProps {
  children: React.ReactNode;
  scale: number;
  position: { x: number; y: number };
  onDoubleTap: (e: React.MouseEvent | React.TouchEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export const GalleryZoom: React.FC<GalleryZoomProps> = ({
  children,
  scale,
  position,
  onDoubleTap,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) => {
  return (
    <div
      className="vst-zoom-viewport"
      onClick={onDoubleTap}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <motion.div
        className="vst-zoom-content"
        animate={{
          scale,
          x: position.x,
          y: position.y,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};
