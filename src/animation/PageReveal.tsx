import type { ReactNode } from 'react';

/** A presentation-only shell: children exist immediately and navigation never waits. */
export function PageReveal({ children, minimal = false }: { children: ReactNode; minimal?: boolean }) {
  return <div className="page-transition page-reveal" data-page-reveal={minimal ? 'minimal' : 'standard'}>
    {children}
  </div>;
}
