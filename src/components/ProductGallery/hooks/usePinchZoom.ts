import { useState, useRef, useCallback } from "react";

export function usePinchZoom(maxScale = 3.5, minScale = 1) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const initialDistance = useRef<number | null>(null);
  const initialScale = useRef(1);
  const lastTap = useRef<number>(0);
  const isDragging = useRef(false);
  const startDragPos = useRef({ x: 0, y: 0 });

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Double tap to toggle 1x <-> 2.5x zoom
  const handleDoubleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      if (scale > 1) {
        resetZoom();
      } else {
        setScale(2.5);
        setPosition({ x: 0, y: 0 });
      }
    }
    lastTap.current = now;
  }, [scale, resetZoom]);

  // Touch handlers for pinch zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialDistance.current = dist;
      initialScale.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      isDragging.current = true;
      startDragPos.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistance.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = Math.min(
        maxScale,
        Math.max(minScale, (dist / initialDistance.current) * initialScale.current)
      );
      setScale(newScale);
    } else if (e.touches.length === 1 && isDragging.current && scale > 1) {
      const newX = e.touches[0].clientX - startDragPos.current.x;
      const newY = e.touches[0].clientY - startDragPos.current.y;
      
      // Boundary clamp
      const maxDragX = (scale - 1) * 180;
      const maxDragY = (scale - 1) * 220;

      setPosition({
        x: Math.max(-maxDragX, Math.min(maxDragX, newX)),
        y: Math.max(-maxDragY, Math.min(maxDragY, newY)),
      });
    }
  }, [scale, maxScale, minScale]);

  const handleTouchEnd = useCallback(() => {
    initialDistance.current = null;
    isDragging.current = false;
    if (scale <= 1) {
      resetZoom();
    }
  }, [scale, resetZoom]);

  return {
    scale,
    position,
    resetZoom,
    handleDoubleTap,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isZoomed: scale > 1,
  };
}
