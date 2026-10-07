/** Preserve the campaign's mobile line break without changing its desktop heading. */
export function HeroHeading({ text }: { text: string }) {
  if (text.trim().replace(/\s+/g, ' ') !== 'EVERY THREAD LEAVES A LEGACY') return <>{text}</>;
  return <span className="hp-hero-slogan">EVERY THREAD<span className="hp-hero-heading-break"> </span>LEAVES A LEGACY</span>;
}
