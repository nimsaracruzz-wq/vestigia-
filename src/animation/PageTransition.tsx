import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { PageReveal } from './PageReveal';

/** Navigation commits immediately. Never retain an old route or wait for its exit. */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <PageReveal key={pathname} minimal={pathname === '/checkout'}>
    {children}
  </PageReveal>;
}
