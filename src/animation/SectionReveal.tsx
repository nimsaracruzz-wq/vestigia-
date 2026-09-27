import { Reveal, type RevealProps } from './Reveal';

/** Shares Reveal's pooled viewport observer, nesting, focus and reduced-motion policy. */
export function SectionReveal(props: RevealProps) {
  return <Reveal once {...props} data-section-reveal="true" />;
}
