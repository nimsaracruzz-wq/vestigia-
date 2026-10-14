import { useCallback, useEffect, useRef, type PointerEvent, type MouseEvent } from 'react';

/** Native scrolling follows touch input without updating React every frame. */
export function useGalleryTrack(activeIndex: number, total: number, onSelect: (index: number) => void) {
  const trackRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const start = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const touching = useRef(false);
  const currentIndex = useRef(activeIndex);
  currentIndex.current = activeIndex;
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const align = (smooth: boolean) => {
      const left = activeIndex * track.clientWidth;
      if (Math.abs(track.scrollLeft - left) > 1) track.scrollTo({ left, behavior: smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
    };
    align(true);
  }, [activeIndex, total]);
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const resize = () => track.scrollTo({ left: currentIndex.current * track.clientWidth, behavior: 'auto' });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observer?.observe(track);
    window.addEventListener('resize', resize);
    return () => { observer?.disconnect(); window.removeEventListener('resize', resize); };
  }, [total]);
  useEffect(() => () => clearTimeout(settleTimer.current), []);
  const onScroll = useCallback(() => {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (touching.current) return;
      const track = trackRef.current;
      if (track && track.clientWidth && total) onSelect(Math.max(0, Math.min(total - 1, Math.round(track.scrollLeft / track.clientWidth))));
    }, 140);
  }, [total, onSelect]);
  const onPointerDown = (event: PointerEvent) => { start.current = { x: event.clientX, y: event.clientY }; moved.current = false; };
  const onPointerMove = (event: PointerEvent) => { if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 10) moved.current = true; };
  const onPointerCancel = () => { moved.current = true; };
  const onTouchStart = () => { touching.current = true; };
  const onTouchEnd = () => { touching.current = false; onScroll(); };
  const onClickCapture = (event: MouseEvent) => {
    if (moved.current) { event.preventDefault(); event.stopPropagation(); moved.current = false; }
  };
  return { trackRef, onScroll, onPointerDown, onPointerMove, onPointerCancel, onClickCapture, onTouchStart, onTouchEnd };
}
