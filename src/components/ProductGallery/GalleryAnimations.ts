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
      ease: animationConfig.ease,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.99,
    transition: {
      ease: animationConfig.ease,
    },
  },
};

// A short crossfade for image changes; the gallery frame only reveals once.
export const slideVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fullscreenBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { ease: animationConfig.ease },
  },
  exit: {
    opacity: 0,
    transition: { ease: animationConfig.ease },
  },
};

export const fullscreenContentVariants: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      ease: animationConfig.ease,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      ease: animationConfig.ease,
    },
  },
};

export const heartWishlistVariants: Variants = {
  idle: { scale: 1 },
  toggled: {
    scale: [1, 1.03, 1],
    transition: {
      ease: animationConfig.ease,
    },
  },
};

export const cartButtonVariants: Variants = {
  idle: { scale: 1 },
  tap: { scale: 0.98 },
  success: {
    scale: [1, 1.03, 1],
    transition: { ease: animationConfig.ease },
  },
};
