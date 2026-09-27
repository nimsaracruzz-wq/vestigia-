import { LazyMotion, MotionConfig, domAnimation, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { animationConfig } from './config';
import './motion.css';

/** Only animation/gesture features: no drag or shared-layout projection runtime. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user" transition={{ duration: reduced ? 0 : animationConfig.duration.normal, ease: animationConfig.ease }}>
      {children}
    </MotionConfig>
  </LazyMotion>;
}
