export const animationConfig = {
  duration: { instant: 0.12, fast: 0.18, normal: 0.28, reveal: 0.36, slow: 0.42, mobile: 0.22, hero: 0.42, admin: 0.18, drawer: 0.28 },
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  distance: { desktop: 16, mobile: 8, admin: 8 },
  stagger: 0.04,
  maxDelay: 0.12,
  // "some" also works for long policy sections and tables taller than the screen.
  viewport: { once: true, amount: "some" as const, margin: "0px 0px -24px 0px" as const },
};

export type RevealVariant = "fade" | "fadeUp" | "fadeDown" | "fadeLeft" | "fadeRight" | "scale" | "blur" | "imageReveal" | "textReveal";
export type RevealTone = "storefront" | "admin";
export type RevealOptions = {
  variant?: RevealVariant;
  tone?: RevealTone;
  mobile?: boolean;
  reduced?: boolean;
  delay?: number;
  duration?: number;
};

/** Pure presets, shared by viewport reveals and short interactive entrances. */
export function revealPreset({ variant = "fadeUp", tone = "storefront", mobile = false, reduced = false, delay = 0, duration }: RevealOptions = {}) {
  const distance = tone === "admin" ? animationConfig.distance.admin : mobile ? animationConfig.distance.mobile : animationConfig.distance.desktop;
  const hidden: Record<string, number | string> = { opacity: 0 };
  const visible: Record<string, number | string> = { opacity: 1 };
  if (variant === "fadeUp" || variant === "textReveal") { hidden.y = distance; visible.y = 0; }
  if (variant === "fadeDown") { hidden.y = -distance; visible.y = 0; }
  if (variant === "fadeLeft") { hidden.x = -distance; visible.x = 0; }
  if (variant === "fadeRight") { hidden.x = distance; visible.x = 0; }
  if (variant === "scale") { hidden.scale = 0.98; visible.scale = 1; }
  // Legacy blur callers now receive a paint-friendly fade.
  if (variant === "imageReveal") {
    // Keep the hero image painted for LCP; reveal by a restrained mask/zoom.
    hidden.opacity = 1;
    hidden.scale = mobile ? 1 : 1.03;
    visible.scale = 1;
  }
  if (reduced) Object.assign(hidden, visible);
  return {
    hidden,
    visible,
    transition: {
      duration: reduced ? 0 : duration ?? (tone === "admin" ? animationConfig.duration.admin : mobile ? animationConfig.duration.mobile : animationConfig.duration.normal),
      delay: reduced ? 0 : Math.min(animationConfig.maxDelay, Math.max(0, delay)),
      ease: animationConfig.ease,
    },
  };
}

export function staggerDelay(index: number, stagger = animationConfig.stagger) {
  // Start each visible batch promptly, even in a very long catalog.
  return Math.min(animationConfig.maxDelay, Math.max(0, index % 4) * Math.max(0, stagger));
}
