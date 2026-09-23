import type { HeroFocalPoints, Media } from './homepage.js';
export function heroMediaStyle(focal: HeroFocalPoints) {
  return {
    '--hero-desktop-x': `${focal.desktopFocalX}%`, '--hero-desktop-y': `${focal.desktopFocalY}%`,
    '--hero-tablet-x': `${focal.tabletFocalX}%`, '--hero-tablet-y': `${focal.tabletFocalY}%`,
    '--hero-mobile-x': `${focal.mobileFocalX}%`, '--hero-mobile-y': `${focal.mobileFocalY}%`,
  };
}
export function heroImageSources(media: Pick<Media,'image'|'mobileImage'>) {
  const mobile=media.mobileImage || media.image;
  return { desktop: media.image, mobile };
}
