import { useState, useEffect } from "react";
import { m as motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface PreloaderProps {
  onComplete?: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [isVisible, setIsVisible] = useState(()=>!document.getElementById('vestigia-public-data'));
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const started = performance.now();
    let completed = false;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (completed) return;
      completed = true;
      setIsVisible(false);
      onComplete?.();
    };
    const handleLoad = () => {
      clearTimeout(finishTimer);
      finishTimer = setTimeout(finish, Math.max(0, (shouldReduceMotion ? 0 : 650) - (performance.now() - started)));
    };
    const fallback = setTimeout(finish, 2500);
    if (document.readyState === "complete") handleLoad();
    else window.addEventListener("load", handleLoad, { once: true });
    return () => {
      completed = true;
      window.removeEventListener("load", handleLoad);
      clearTimeout(finishTimer);
      clearTimeout(fallback);
    };
  }, [onComplete, shouldReduceMotion]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="vestigia-minimal-preloader"
          role="status"
          aria-label="Loading Vestigia"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: shouldReduceMotion ? 0 : 0.3, ease: [0.4, 0, 0.2, 1] } }}
          transition={{ duration: 0.75, ease: "easeInOut" }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
            backgroundColor: "#0A0A0A",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            userSelect: "none",
            WebkitFontSmoothing: "antialiased",
          }}
        >
          {/* Centered Emblem Container */}
          <div
            style={{
              position: "relative",
              width: "160px",
              height: "160px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* 1. STATIONARY CENTER LAYER: Roman Profile Head */}
            <img
              src="/images/vestigia_head-320.png"
              alt=""
              width={160}
              height={160}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                zIndex: 2,
                pointerEvents: "none",
              }}
            />

            {/* 2. ROTATING WHOLE RING LAYER: Complete Outer Circular Gold Ornamental Border */}
            <motion.img
              src="/images/vestigia_whole_ring-320.png"
              width={160}
              height={160}
              alt=""
              aria-hidden="true"
              animate={shouldReduceMotion ? { rotate: 0 } : { rotate: 360 }}
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                zIndex: 1,
                willChange: "transform",
                pointerEvents: "none",
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
