import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollLock } from './useScrollLock';

/** Internal links navigate after the overlay exits; modified clicks remain native. */
export function useOverlayNavigation(open: boolean, onClose: () => void) {
  const navigate = useNavigate();
  const pending = useRef<string | null>(null);
  const [present, setPresent] = useState(open);
  useScrollLock(open || present);
  useEffect(() => {
    if (open) { setPresent(true); pending.current = null; }
  }, [open]);
  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    event.preventDefault();
    pending.current = url.pathname + url.search + url.hash;
    onClose();
  };
  const onExitComplete = () => {
    setPresent(false);
    const destination = pending.current;
    pending.current = null;
    if (destination) navigate(destination);
  };
  return { onClickCapture, onExitComplete };
}
