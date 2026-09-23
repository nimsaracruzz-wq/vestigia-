import { animationConfig } from "../../animation/config";
import { Variants } from "framer-motion";

/**
 * High-performance GPU-accelerated animation variants.
 * Strictly uses transform (scale, x, y) and opacity to prevent layout shifts and repaints.
 */

export const galleryFadeVariants: Variants = {
  initial: { opacity: 0, scale: 0.99 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.25, 1, 0.5, 1], // Luxury cubic-bezier curve
    },
  },
  exit: {
    opacity: 0,
    scale: 0.99,
    transition: {
      duration: 0.2,
      ease: [0.5, 0, 0.75, 0],
    },
  },
};

// A short crossfade for image changes; the gallery frame only reveals once.
export const slideVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: animationConfig.duration.fast, ease: animationConfig.ease } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

export const fullscreenBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export const fullscreenContentVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

export const heartWishlistVariants: Variants = {
  idle: { scale: 1 },
  toggled: {
    scale: [0.88, 1.22, 0.96, 1],
    transition: {
      duration: 0.4,
      times: [0, 0.4, 0.75, 1],
      ease: "easeInOut",
    },
  },
};

export const cartButtonVariants: Variants = {
  idle: { scale: 1 },
  tap: { scale: 0.98 },
  success: {
    scale: [1, 1.03, 1],
    transition: { duration: 0.3 },
  },
};
