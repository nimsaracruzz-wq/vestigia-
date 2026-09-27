/** Preserve the campaign's mobile line break without changing its desktop heading. */
export function HeroHeading({ text }: { text: string }) {
  if (text.trim().replace(/\s+/g, ' ') !== 'LEAVE YOUR MARK.') return <>{text}</>;
  return <>LEAVE YOUR<span className="hp-hero-heading-break"> </span>MARK.</>;
}
