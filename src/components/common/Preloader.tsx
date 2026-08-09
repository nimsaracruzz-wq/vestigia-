import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface PreloaderProps {
  onComplete?: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // Non-blocking initial load check
    const handleLoad = () => {
      setTimeout(() => {
        setIsVisible(false);
        if (onComplete) onComplete();
      }, 1200); // Gentle fade out timing
    };

    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
      // Fallback timeout so the preloader never blocks the user
      const fallback = setTimeout(handleLoad, 2500);
      return () => {
        window.removeEventListener("load", handleLoad);
        clearTimeout(fallback);
      };
    }
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="vestigia-minimal-preloader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.65, ease: [0.4, 0, 0.2, 1] } }}
          transition={{ duration: 0.75, ease: "easeInOut" }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
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
              src="/images/vestigia_head.png"
              alt="VESTIGIA Emblem"
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
              src="/images/vestigia_whole_ring.png"
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
